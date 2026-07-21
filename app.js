/**
 * Lógica de conexión en TIEMPO REAL del Explorador de APIs.
 * Incluye gestión de promesas, diccionarios de geolocalización y renderizado dinámico.
 */

// LLAVES DE API REALES INTEGRADAS
const KEYS = { 
  PA: 'AECECD5B-8518-11F1-9E30-4201AC1DC129', 
  IQ: '65948212-5b5d-4aa1-b507-5c547bced938', 
  OAQ: '15440168e9f1863ef9b080ce4b171c56e5364beb8ccf3ae2971763658a909f25', 
  AG: 'YOUR_AIRGRADIENT_TOKEN' // Dejar lista. Reemplazar cuando se tenga el token real.
};

// ==========================================
// DICCIONARIOS DE EXPANSIÓN (Para configuración manual)
// ==========================================

/* 
 * DICCIONARIO IQAIR: Mapeo de ciudad a coordenadas espaciales.
 * Instrucción: "deja listo y documentado para agregar mas ciudades de forma manual"
 * Para agregar más ciudades:
 * 1. Agrega el <option value="NUEVACIUAD"> en el HTML
 * 2. Agrega la clave aquí abajo con sus respectivas latitud y longitud.
 */
const IQAIR_CITIES_DB = {
  "tegucigalpa": { lat: "14.0818", lon: "-87.2068" },
  "sps": { lat: "15.5042", lon: "-88.0250" },
  // Ejemplo de expansión futura:
  // "comayagua": { lat: "14.4515", lon: "-87.6375" }
};

/* 
 * DICCIONARIO OPENAQ: Mapeo referencial de IDs.
 * Para agregar más: Busca el "Location ID" oficial en OpenAQ, agrégalo al HTML y a este registro.
 */
const OPENAQ_LOCATIONS_DB = {
  "8118": "Tegucigalpa (US Diplomatic Post)",
  "8119": "San Pedro Sula (ID Referencial)"
};


// ==========================================
// CONTROLADORES DE DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => setApi(e.target.dataset.api));
  });

  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', (e) => copyText(e.target.dataset.target));
  });
  
  // Asignamos el evento a la nueva función de petición real
  document.querySelectorAll('.btn-simulate').forEach(btn => {
    btn.addEventListener('click', (e) => executeRealRequest(e.target.dataset.api));
  });

  document.querySelectorAll('select, input').forEach(el => {
    el.addEventListener('input', updateUI);
    el.addEventListener('change', updateUI);
  });

  updateUI();
});

// ==========================================
// UTILIDADES VISUALES
// ==========================================
function toggleTheme() {
  const body = document.body;
  body.setAttribute('data-theme', body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

function setApi(api) {
  document.querySelectorAll('.panel-api').forEach(panel => panel.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(`panel-${api}`).classList.remove('hidden');
  document.querySelector(`.tab[data-api="${api}"]`).classList.add('active');
  updateUI();
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${isError ? 'error' : ''}`;
  setTimeout(() => t.className = 'toast', 3500);
}

function copyText(id) {
  navigator.clipboard.writeText(document.getElementById(id).textContent);
  showToast('¡URL copiada exitosamente!');
}

function renderTable(title, data) {
  if (!data || !data.length) return '';
  return `
    <div class="card" style="padding: 1rem;">
      <h4 style="margin-top:0; color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">${title}</h4>
      <table>
        ${data.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}
      </table>
    </div>
  `;
}

// ==========================================
// CONSTRUCTORES DE URL Y CABECERAS
// ==========================================

function buildPA() {
  const mode = document.getElementById('pa-mode').value;
  const sensor = document.getElementById('pa-sensor').value;
  let url = '', params = [];
  let headers = [['X-API-Key', KEYS.PA], ['Content-Type', 'application/json']];

  if (mode === 'current') {
    url = `https://api.purpleair.com/v1/sensors/${sensor}?fields=name,pm2.5_atm,temperature,humidity`;
    params = [['fields', 'name,pm2.5_atm,temperature,humidity']];
  } else if (mode === 'history') {
    const s = document.getElementById('pa-start').value;
    const e = document.getElementById('pa-end').value;
    const a = document.getElementById('pa-avg').value;
    url = `https://api.purpleair.com/v1/sensors/${sensor}/history?fields=pm2.5_atm&start_timestamp=${s}&end_timestamp=${e}&average=${a}`;
    params = [['fields', 'pm2.5_atm'], ['start_timestamp', s], ['end_timestamp', e], ['average', a]];
  } else {
    const r = document.getElementById('pa-region').value;
    const [nwlat, nwlng, selat, selng] = r === 'tgu' ? ['14.20','-87.35','13.95','-87.10'] : ['15.60','-88.10','15.40','-87.90'];
    url = `https://api.purpleair.com/v1/sensors?fields=sensor_index,pm2.5_atm&nwlat=${nwlat}&nwlng=${nwlng}&selat=${selat}&selng=${selng}`;
    params = [['fields', 'sensor_index,pm2.5_atm'], ['nwlat', nwlat], ['nwlng', nwlng], ['selat', selat], ['selng', selng]];
  }
  
  document.getElementById('pa-url').textContent = url;
  document.getElementById('pa-params').innerHTML = renderTable('Headers', headers) + renderTable('Parámetros URL reales', params);
}

function buildIQ() {
  // Aquí se extrae la lat/lon automáticamente desde el diccionario basándose en el dropdown.
  const cityKey = document.getElementById('iq-city-dropdown').value;
  const coords = IQAIR_CITIES_DB[cityKey];
  
  // Utilizamos HTTPS para evitar bloqueos por Mixed Content
  const url = `https://api.airvisual.com/v2/nearest_city?lat=${coords.lat}&lon=${coords.lon}&key=${KEYS.IQ}`;
  const params = [['lat', coords.lat], ['lon', coords.lon], ['key', KEYS.IQ]];
  
  document.getElementById('iq-url').textContent = url;
  document.getElementById('iq-params').innerHTML = renderTable('Parámetros URL reales', params);
}

function buildOAQ() {
  const id = document.getElementById('oaq-loc-dropdown').value;
  let url = `https://api.openaq.org/v3/locations/${id}`;
  const params = [['Location ID (Path)', id]];
  const headers = [['X-API-Key', KEYS.OAQ]];

  document.getElementById('oaq-url').textContent = url;
  document.getElementById('oaq-params').innerHTML = renderTable('Headers', headers) + renderTable('Parámetros URL reales', params);
}

function buildAG() {
  const mode = document.getElementById('ag-mode').value;
  const id = document.getElementById('ag-locid').value;
  let url = '', params = [];
  let headers = [['Authorization', `Bearer ${KEYS.AG}`]];

  if (mode === 'places') {
    url = `https://api.airgradient.com/public/api/v1/places`;
  } else if (mode === 'current') {
    url = `https://api.airgradient.com/public/api/v1/locations/${id}/measures/current`;
  } else {
    const b = document.getElementById('ag-bucket').value;
    const f = document.getElementById('ag-from').value;
    const t = document.getElementById('ag-to').value;
    url = `https://api.airgradient.com/public/api/v1/locations/${id}/measures?type=${b}&from=${f}&to=${t}`;
    params = [['type', b], ['from', f], ['to', t]];
  }
  document.getElementById('ag-url').textContent = url;
  document.getElementById('ag-params').innerHTML = renderTable('Headers', headers) + renderTable('Parámetros URL reales', params);
}

function updateUI() {
  const paMode = document.getElementById('pa-mode').value;
  document.getElementById('pa-sensor-row').classList.toggle('hidden', paMode === 'list');
  document.getElementById('pa-region-row').classList.toggle('hidden', paMode !== 'list');
  document.getElementById('pa-history-row').classList.toggle('hidden', paMode !== 'history');
  buildPA();

  buildIQ(); // Ya no necesita toggle de interfaces, porque solo hay un dropdown de ciudad

  buildOAQ();

  const agMode = document.getElementById('ag-mode').value;
  document.getElementById('ag-loc-row').classList.toggle('hidden', agMode === 'places');
  document.getElementById('ag-hist-row').classList.toggle('hidden', agMode !== 'history');
  buildAG();
}

// ==========================================
// FETCH Y MANEJO DE ERRORES (PETICIONES REALES)
// ==========================================

/**
 * Función asíncrona que realiza el llamado real HTTP en lugar de simularlo.
 * Si ocurre un error de Red (CORS), un 404, o un límite de la API, se atrapa en el catch y se muestra explícitamente en el DOM.
 */
async function executeRealRequest(api) {
  const prefix = api === 'purpleair' ? 'pa' : api === 'iqair' ? 'iq' : api === 'openaq' ? 'oaq' : 'ag';
  const targetId = `${prefix}-json`;
  const el = document.getElementById(targetId);
  const url = document.getElementById(`${prefix}-url`).textContent;
  
  el.classList.remove('error-text');
  el.textContent = "Conectando al servidor y descargando datos...";

  // Construcción de la petición HTTP
  let options = { method: 'GET' };
  
  if (api === 'purpleair') {
    options.headers = { 'X-API-Key': KEYS.PA };
  } else if (api === 'openaq') {
    options.headers = { 'X-API-Key': KEYS.OAQ };
  } else if (api === 'airgradient') {
    // Control preventivo de la llave de AirGradient.
    if(KEYS.AG === 'YOUR_AIRGRADIENT_TOKEN') {
      el.classList.add('error-text');
      el.textContent = "Error: Configura tu token de AirGradient en el código fuente (variable KEYS.AG) antes de realizar la petición.";
      showToast("Se requiere configuración de token", true);
      return;
    }
    options.headers = { 'Authorization': `Bearer ${KEYS.AG}` };
  }

  // Ejecución del Data Fetching (Real-time data ingestion pipeline start)
  try {
    const response = await fetch(url, options);
    
    // Extracción de datos (pueden ser exitosos o contener mensajes de error de la API)
    const data = await response.json();

    if (!response.ok) {
      // Forzamos un fallo si el HTTP status no es 200-299
      throw new Error(`Error de API HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    
    // Mostramos la data real extraída
    el.textContent = JSON.stringify(data, null, 2);
    showToast("Datos reales obtenidos exitosamente");

  } catch (error) {
    // Pipeline de Error Handling: Previene la falla de la app y visibiliza la causa.
    el.classList.add('error-text');
    let errorMessage = `Ocurrió un error ejecutando la petición:\n\n${error.message}\n\n`;
    errorMessage += `-------------------------------------------\n`;
    errorMessage += `Nota de Troubleshooting (Data Pipeline):\n`;
    errorMessage += `- Verifica si hay bloqueos de CORS en la consola (F12).\n`;
    errorMessage += `- Confirma que los límites de la API no se han excedido.\n`;
    errorMessage += `- Comprueba que los parámetros enviados sean válidos para la región seleccionada.`;
    
    el.textContent = errorMessage;
    showToast("Error en la conexión a la API", true);
  }
}