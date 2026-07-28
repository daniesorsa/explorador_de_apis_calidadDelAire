from flask import Flask, jsonify, request, send_from_directory
import requests

# Inicializamos el servidor indicándole que sirva los archivos de la carpeta actual
app = Flask(__name__, static_folder='.')

# Configuración de credenciales de OpenAQ
API_KEY = "AQUI_TU_NUEVA_CLAVE_V3"
HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
BASE_URL = "https://api.openaq.org/v3"

# Rutas para que tu navegador cargue tu interfaz web actual
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_file(filename):
    return send_from_directory('.', filename)

# Ruta Proxy que extrae los datos de OpenAQ
@app.route('/api/openaq')
def get_openaq_data():
    coords = request.args.get('coordinates')
    
    try:
        # A. Encontrar la ubicación de monitoreo mediante búsqueda espacial
        loc_url = f"{BASE_URL}/locations?coordinates={coords}&radius=25000&limit=1"
        loc_res = requests.get(loc_url, headers=HEADERS).json()
        
        if not loc_res.get('results'):
            return jsonify({"error": "Sin estaciones en esta área"}), 404
            
        location = loc_res['results'][0]
        sensors = location.get('sensors', [])
        
        if not sensors:
            return jsonify({"error": "Estación sin sensores activos"}), 404
            
        # Seleccionamos el primer sensor disponible en la ubicación
        sensor_id = sensors[0]['id']
        param_name = sensors[0]['parameter']['name']
        param_units = sensors[0]['parameter']['units']
        
        # B. Extraer las mediciones originales (en ese momento)
        meas_url = f"{BASE_URL}/sensors/{sensor_id}/measurements?limit=5"
        meas_data = requests.get(meas_url, headers=HEADERS).json()
        
        # C. Extraer promedios y datos históricos (promedios diarios)
        hist_url = f"{BASE_URL}/sensors/{sensor_id}/days?limit=5"
        hist_data = requests.get(hist_url, headers=HEADERS).json()
        
        # D. Empaquetar todo para enviarlo limpio al JavaScript
        return jsonify({
            "station_name": location['name'],
            "parameter": param_name,
            "units": param_units,
            "sensor_id": sensor_id,
            "original_measurements": meas_data.get('results', []),
            "historical_averages": hist_data.get('results', [])
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Servidor iniciado. Abre http://localhost:5000 en tu navegador.")
    app.run(port=5000, debug=True)