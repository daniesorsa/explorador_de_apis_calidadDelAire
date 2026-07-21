/**
 * Lógica principal del Explorador de APIs.
 * Separa el control del DOM, la generación de endpoints y la simulación de respuestas.
 */

// Llaves de API mantenidas en código, pero no mostradas en UI para seguridad web.
const KEYS = { 
  PA: 'AECECD5B-8518-11F1-9E30-4201AC1DC129', 
  IQ: '65948212-5b5d-4aa1-b507-5c547bced938', 
  OAQ: '15440168e9f1863ef9b080ce4b171c56e5364beb8ccf3ae2971763658a909f25', 
  AG: 'YOUR_AIRGRADIENT_TOKEN' 
};

// Máscara de seguridad utilizada para evitar imprimir las llaves en el DOM
const MASKED_KEY = '***_OCULTO_POR_SEGURIDAD_***';

// --- CONTROLADORES DE EVENTOS DEL DOM ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
  
  // Asignar eventos de pestañas
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => setApi(e.target.dataset.api));
  });

  // Asignar eventos a botones de simulación y copiado
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', (e) => copyText(e.target.dataset.target));
  });
  
  document.querySelectorAll('.btn-simulate').forEach(btn => {
    btn.addEventListener('click', (e) => simulateRequest(e.target.dataset.api));
  });

  // Asignar eventos 'change' o 'input' a los formularios dinámicos
  document.querySelectorAll('select, input').forEach(el => {
    el.addEventListener('input', updateUI);
    el.addEventListener('change', updateUI);
  });

  // Inicializar UI
  updateUI();
});

// --- FUNCIONES UTILITARIAS ---
function toggleTheme() {
  const body = document.body;
  const current = body.getAttribute('data-theme');
  body.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}

function setApi(api) {
  document.querySelectorAll('.panel-api').forEach(panel => panel.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  
  document.getElementById(`panel-${api}`).classList.remove('hidden');
  document.querySelector(`.tab[data-api="${api}"]`).classList.add('active');
  updateUI();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
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

// --- CONSTRUCTORES DE URL Y PARÁMETROS (USAN CLAVES ENMASCARADAS) ---

function buildPA() {
  const mode = document.getElementById('pa-mode').value;
  const sensor = document.getElementById('pa-sensor').value;
  let url = '';
  // Reemplazado KEYS.PA por MASKED_KEY en la visualización
  let params = [];
  let headers = [['X-API-Key', MASKED_KEY], ['Content-Type', 'application/json']];

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
  document.getElementById('pa-params').innerHTML = renderTable('Headers Requeridos', headers) + renderTable('Parámetros URL', params);
}

function buildIQ() {
  const mode = document.getElementById('iq-mode').value;
  let url = '', params = [];
  
  if (mode === 'nearest') {
    const lat = document.getElementById('iq-lat').value, lon = document.getElementById('iq-lon').value;
    // Reemplazado KEYS.IQ por MASKED_KEY en la visualización
    url = `http://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${MASKED_KEY}`;
    params = [['lat', lat], ['lon', lon], ['key', MASKED_KEY]];
  } else {
    const c = encodeURIComponent(document.getElementById('iq-city').value);
    const s = encodeURIComponent(document.getElementById('iq-state').value);
    const co = encodeURIComponent(document.getElementById('iq-country').value);
    url = `http://api.airvisual.com/v2/city?city=${c}&state=${s}&country=${co}&key=${MASKED_KEY}`;
    params = [['city', decodeURIComponent(c)], ['state', decodeURIComponent(s)], ['country', decodeURIComponent(co)], ['key', MASKED_KEY]];
  }
  document.getElementById('iq-url').textContent = url;
  document.getElementById('iq-params').innerHTML = renderTable('Parámetros URL', params);
}

function buildOAQ() {
  const mode = document.getElementById('oaq-mode').value;
  const id = document.getElementById('oaq-locid').value;
  let url = '', params = [];
  // Reemplazado KEYS.OAQ por MASKED_KEY en la visualización
  let headers = [['X-API-Key', MASKED_KEY]];

  if (mode === 'locations') {
    const bbox = document.getElementById('oaq-bbox').value;
    url = `https://api.openaq.org/v3/locations?bbox=${bbox}&limit=100`;
    params = [['bbox', bbox], ['limit', '100']];
  } else {
    url = `https://api.openaq.org/v3/locations/${id}` + (mode === 'latest' ? '/latest' : '');
    params = [['Location ID (Path)', id]];
  }
  document.getElementById('oaq-url').textContent = url;
  document.getElementById('oaq-params').innerHTML = renderTable('Headers Requeridos', headers) + renderTable('Parámetros URL', params);
}

function buildAG() {
  const mode = document.getElementById('ag-mode').value;
  const id = document.getElementById('ag-locid').value;
  let url = '', params = [];
  // Reemplazado KEYS.AG por MASKED_KEY en la visualización
  let headers = [['Authorization', `Bearer ${MASKED_KEY}`]];

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
  document.getElementById('ag-params').innerHTML = renderTable('Headers Requeridos', headers) + renderTable('Parámetros URL', params);
}

// --- ACTUALIZADOR DE INTERFAZ GENERAL ---
function updateUI() {
  const paMode = document.getElementById('pa-mode').value;
  document.getElementById('pa-sensor-row').classList.toggle('hidden', paMode === 'list');
  document.getElementById('pa-region-row').classList.toggle('hidden', paMode !== 'list');
  document.getElementById('pa-history-row').classList.toggle('hidden', paMode !== 'history');
  buildPA();

  const iqMode = document.getElementById('iq-mode').value;
  document.getElementById('iq-gps-row').classList.toggle('hidden', iqMode !== 'nearest');
  document.getElementById('iq-city-row').classList.toggle('hidden', iqMode === 'nearest');
  buildIQ();

  const oaqMode = document.getElementById('oaq-mode').value;
  document.getElementById('oaq-bbox-row').classList.toggle('hidden', oaqMode !== 'locations');
  document.getElementById('oaq-id-row').classList.toggle('hidden', oaqMode === 'locations');
  buildOAQ();

  const agMode = document.getElementById('ag-mode').value;
  document.getElementById('ag-loc-row').classList.toggle('hidden', agMode === 'places');
  document.getElementById('ag-hist-row').classList.toggle('hidden', agMode !== 'history');
  buildAG();
}

// --- MOCKING: SIMULADOR DE RESPUESTAS ---
// Al no hacer peticiones reales, devolvemos JSON estático con la estructura oficial.
function simulateRequest(api) {
  const responses = {
    purpleair: {
      "api_version": "V1.0.11-0.0.51",
      "time_stamp": Math.floor(Date.now() / 1000),
      "sensor": { 
        "sensor_index": parseInt(document.getElementById('pa-sensor').value) || 36361, 
        "name": "TGU Miraflores HSF 2", 
        "pm2.5_atm": 22.4, 
        "temperature": 78, 
        "humidity": 45 
      }
    },
    iqair: {
      "status": "success",
      "data": { 
        "city": "Tegucigalpa", 
        "state": "Francisco Morazan", 
        "country": "Honduras", 
        "current": { 
          "pollution": { "ts": new Date().toISOString(), "aqius": 65, "mainus": "p2", "aqicn": 32, "maincn": "p2" }, 
          "weather": { "ts": new Date().toISOString(), "tp": 26, "pr": 1012, "hu": 60, "ws": 3.1 } 
        } 
      }
    },
    openaq: {
      "meta": { "name": "openaq-api", "license": "CC BY 4.0", "website": "api.openaq.org", "page": 1, "limit": 100, "found": 1 },
      "results": [{ 
        "id": 8118, "city": "Tegucigalpa", "name": "US Diplomatic Post: Tegucigalpa", "entity": "Governmental Organization", "country": "HN", 
        "sources": [{"name": "AirNow", "url": "http://www.airnowapi.org"}], 
        "parameters": [{"id": 2, "unit": "µg/m³", "count": 28453, "average": 14.2, "lastValue": 25.0, "parameter": "pm25", "displayName": "PM2.5 Mass"}] 
      }]
    },
    airgradient: [
      { 
        "locationId": document.getElementById('ag-locid').value || "654321", 
        "timestamp": new Date().toISOString(), 
        "pm01": 8, "pm02": 15, "pm10": 18, 
        "pm003Count": 1120, "atmp": 25.5, "rhum": 50, "rco2": 450, "tvoc": 120 
      }
    ]
  };
  
  const targetId = `${api === 'purpleair' ? 'pa' : api === 'iqair' ? 'iq' : api === 'openaq' ? 'oaq' : 'ag'}-json`;
  const el = document.getElementById(targetId);
  el.textContent = "Obteniendo datos...";
  
  // Emulamos latencia de red para dar realismo a la herramienta de simulación
  setTimeout(() => {
    el.textContent = JSON.stringify(responses[api], null, 2);
    showToast("Respuesta simulada generada");
  }, 400);
}
