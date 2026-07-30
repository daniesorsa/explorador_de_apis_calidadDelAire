import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

app = Flask(__name__)

# Habilitar CORS: Esto permite que tu frontend en GitHub Pages lea estos datos
CORS(app)

# Configuración: Usará la variable de entorno de tu servidor o la que pongas por defecto
API_KEY = os.environ.get("OPENAQ_KEY", "AQUI_TU_NUEVA_CLAVE_V3")
HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
BASE_URL = "https://api.openaq.org/v3"

@app.route('/api/openaq')
def get_openaq_data():
    coords = request.args.get('coordinates')
    
    if not coords:
        return jsonify({"error": "Coordenadas requeridas"}), 400
        
    try:
        # Búsqueda espacial de la estación
        loc_url = f"{BASE_URL}/locations?coordinates={coords}&radius=25000&limit=1"
        loc_res = requests.get(loc_url, headers=HEADERS).json()
        
        if not loc_res.get('results'):
            return jsonify({"error": "Sin estaciones en esta área"}), 404
            
        location = loc_res['results'][0]
        sensors = location.get('sensors', [])
        
        if not sensors:
            return jsonify({"error": "Estación sin sensores activos"}), 404
            
        # Extraer IDs del sensor
        sensor_id = sensors[0]['id']
        param_name = sensors[0]['parameter']['name']
        param_units = sensors[0]['parameter']['units']
        
        # Obtener mediciones
        meas_url = f"{BASE_URL}/sensors/{sensor_id}/measurements?limit=5"
        meas_data = requests.get(meas_url, headers=HEADERS).json()
        
        # Obtener promedios
        hist_url = f"{BASE_URL}/sensors/{sensor_id}/days?limit=5"
        hist_data = requests.get(hist_url, headers=HEADERS).json()
        
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
    # Render asigna automáticamente un puerto a través de las variables de entorno
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)