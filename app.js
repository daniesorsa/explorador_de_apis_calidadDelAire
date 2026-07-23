/**
 * Lógica de conexión en TIEMPO REAL del Explorador de APIs.
 */

const KEYS = { 
  PA: '865A0734-3A82-11F1-B596-4201AC1DC123', 
  IQ: 'd2f965eb-24ec-4296-bd26-6ab153f47b63', 
  OAQ: '15440168e9f1863ef9b080ce4b171c56e5364beb8ccf3ae2971763658a909f25'
};

const IQAIR_CITIES_DB = {
  "tegucigalpa": { lat: "14.0818", lon: "-87.2068" },
  "sps": { lat: "15.5042", lon: "-88.0250" }
};

window.apiDataCache = { purpleair: null, iqair: null, openaq: null };

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => setApi(e.target.dataset.api));
  });

  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', (e) => copyText(e.target.dataset.target));
  });
  
  document.querySelectorAll('.btn-simulate').forEach(btn => {
    btn.addEventListener('click', (e) => executeRealRequest(e.target.dataset.api));
  });

  document.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', (e) => downloadJSON(e.target.dataset.api));
  });

  document.querySelectorAll('select, input').forEach(el => {
    el.addEventListener('input', updateUI);
    el.addEventListener('change', updateUI);
  });

  setInterval(updateClocks, 1000);
  updateUI();
});

function toggleTheme() {
  const body = document.body;
  const isDark = body.getAttribute('data-theme') === 'dark';
  body.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('btn-theme-toggle').textContent = isDark ? '🌓 Cambiar Tema' : '☀️ Cambiar Tema';
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
  showToast('¡URL de Consulta copiada exitosamente!');
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function getTimeStr() {
    return new Date().toTimeString().split(' ')[0];
}

function updateClocks() {
  const dateStr = getTodayStr();
  const timeStr = getTimeStr();
  
  ['pa', 'iq', 'oaq'].forEach(prefix => {
      const dateEl = document.getElementById(`${prefix}-date-display`);
      const timeEl = document.getElementById(`${prefix}-time-display`);
      if(dateEl) dateEl.textContent = dateStr;
      if(timeEl) timeEl.textContent = timeStr;
  });
}

function buildPA() {
  const mode = document.getElementById('pa-mode').value;
  const sensor = document.getElementById('pa-sensor').value;
  let url = '';
  
  // SOLUCIÓN HISTÓRICOS Y BOUNDING BOX:
  // Se excluye "name", "latitude", "longitude" de la data histórica, ya que la API de PurpleAir lo rechaza.
  const FIELDS_CURRENT = 'name,latitude,longitude,pm1.0,pm2.5_atm,pm2.5_cf_1,pm10.0_atm,temperature,humidity,pressure,voc,ozone1';
  const FIELDS_HISTORY = 'time_stamp,pm1.0,pm2.5_atm,pm2.5_cf_1,pm10.0_atm,temperature,humidity,pressure,voc,ozone1';
  const FIELDS_LIST = 'sensor_index,name,latitude,longitude,pm1.0,pm2.5_atm,pm10.0_atm,temperature,humidity';

  if (mode === 'current') {
    url = `https://api.purpleair.com/v1/sensors/${sensor}?fields=${FIELDS_CURRENT}`;
  } else if (mode === 'history') {
    const s = document.getElementById('pa-start').value, e = document.getElementById('pa-end').value, a = document.getElementById('pa-avg').value;
    url = `https://api.purpleair.com/v1/sensors/${sensor}/history?fields=${FIELDS_HISTORY}&start_timestamp=${s}&end_timestamp=${e}&average=${a}`;
  } else {
    const r = document.getElementById('pa-region').value;
    const [nwlat, nwlng, selat, selng] = r === 'tgu' ? ['14.20','-87.35','13.95','-87.10'] : ['15.60','-88.10','15.40','-87.90'];
    url = `https://api.purpleair.com/v1/sensors?fields=${FIELDS_LIST}&nwlat=${nwlat}&nwlng=${nwlng}&selat=${selat}&selng=${selng}`;
  }
  
  url += `&api_key=${KEYS.PA}`;
  document.getElementById('pa-url').textContent = url;
}

function buildIQ() {
  const cityKey = document.getElementById('iq-city-dropdown').value;
  const coords = IQAIR_CITIES_DB[cityKey];
  const url = `https://api.airvisual.com/v2/nearest_city?lat=${coords.lat}&lon=${coords.lon}&key=${KEYS.IQ}`;
  document.getElementById('iq-url').textContent = url;
}

function buildOAQ() {
  const id = document.getElementById('oaq-loc-dropdown').value;
  // SOLUCIÓN OPENAQ: Uso explícito de la v2 para evitar el bloqueo del navegador al no usar un servidor Backend.
  const url = `https://api.openaq.org/v2/locations/${id}`;
  document.getElementById('oaq-url').textContent = url;
}

function updateUI() {
  const paMode = document.getElementById('pa-mode').value;
  document.getElementById('pa-sensor-row').classList.toggle('hidden', paMode === 'list');
  document.getElementById('pa-region-row').classList.toggle('hidden', paMode !== 'list');
  document.getElementById('pa-history-row').classList.toggle('hidden', paMode !== 'history');
  
  buildPA();
  buildIQ(); 
  buildOAQ();
}

function buildDataTable(api, data) {
    let rows = [];
    try {
        if (api === 'purpleair') {
            if (data.fields && data.data && Array.isArray(data.data)) {
                // SOLUCIÓN BOUNDING BOX / LISTA: Convierte la matriz de respuesta a objetos legibles.
                if(data.data.length === 0) return `<p>Petición exitosa, pero no hay sensores reportando en esta área.</p>`;
                rows.push(`<tr><th colspan="2" style="background:#334155; color:white; text-align:center;">SENSORES ENCONTRADOS: ${data.data.length}</th></tr>`);
                
                data.data.forEach(sensorArray => {
                    let s = {};
                    data.fields.forEach((f, i) => s[f] = sensorArray[i]);
                    rows.push(`<tr><td colspan="2" style="background:rgba(16,185,129,0.2); font-weight:bold; color:#a7f3d0;">Sensor ID: ${s.sensor_index} - ${s.name || 'Sin Nombre'}</td></tr>`);
                    const dict = {
                        "latitude": "Latitud", "longitude": "Longitud",
                        "pm1.0": "PM 1.0 (µg/m³)", "pm2.5_atm": "PM 2.5 (µg/m³)", "pm10.0_atm": "PM 10.0 (µg/m³)",
                        "temperature": "Temperatura (°F)", "humidity": "Humedad (%)"
                    };
                    for (let key in dict) if (s[key] !== undefined && s[key] !== null) rows.push(`<tr><td>${dict[key]}</td><td>${s[key]}</td></tr>`);
                });
            } else if (data.sensor) {
                // MODO TIEMPO REAL (Sensor Específico)
                const s = data.sensor;
                const dict = {
                    "sensor_index": "ID de Estación", "latitude": "Latitud Espacial", "longitude": "Longitud Espacial", "name": "Identificador de Estación",
                    "pm1.0": "Masa PM 1.0 (µg/m³)", "pm2.5_atm": "Masa PM 2.5 Ambiental (µg/m³)", "pm10.0_atm": "Masa PM 10.0 Ambiental (µg/m³)",
                    "temperature": "Temperatura Local (°F)", "humidity": "Humedad Relativa (%)", "pressure": "Presión Atmosférica (mb)",
                    "voc": "Compuestos Orgánicos Volátiles (VOC)", "ozone1": "Ozono Estimado (O3)"
                };
                for (let key in dict) if (s[key] !== undefined) rows.push(`<tr><td>${dict[key]}</td><td>${s[key]}</td></tr>`);
            } else {
                throw new Error("Estructura 'sensor' o 'data' no encontrada o el periodo histórico está vacío.");
            }
        } 
        else if (api === 'iqair') {
            const w = data.data.current.weather;
            const p = data.data.current.pollution;
            const selectedCity = IQAIR_CITIES_DB[document.getElementById('iq-city-dropdown').value];
            
            rows.push(`<tr><td>Latitud Espacial</td><td>${selectedCity.lat}</td></tr>`);
            rows.push(`<tr><td>Longitud Espacial</td><td>${selectedCity.lon}</td></tr>`);
            rows.push(`<tr><td>Temperatura Ambiente (°C)</td><td>${w.tp}</td></tr>`);
            rows.push(`<tr><td>Humedad Relativa (%)</td><td>${w.hu}</td></tr>`);
            rows.push(`<tr><td>Presión Atmosférica (hPa)</td><td>${w.pr}</td></tr>`);
            rows.push(`<tr><td>Velocidad del Viento (m/s)</td><td>${w.ws}</td></tr>`);
            rows.push(`<tr><td>Índice de Calidad (AQI US)</td><td>${p.aqius}</td></tr>`);
            rows.push(`<tr><td>Contaminante Principal</td><td>${p.mainus}</td></tr>`);
        } 
        else if (api === 'openaq') {
            // Adaptación de extracción segura para la estructura de OpenAQ v2.
            if (!data.results || data.results.length === 0) throw new Error("No se encontró la locación (ID inválido o sin datos recientes).");
            
            const locData = data.results[0];
            rows.push(`<tr><td>ID de Estación</td><td>${locData.id}</td></tr>`);
            rows.push(`<tr><td>Nombre de Estación</td><td>${locData.name}</td></tr>`);
            rows.push(`<tr><td>Ciudad / País</td><td>${locData.city || 'N/A'} / ${locData.country || 'N/A'}</td></tr>`);
            
            if(locData.coordinates) {
                rows.push(`<tr><td>Latitud Espacial</td><td>${locData.coordinates.latitude}</td></tr>`);
                rows.push(`<tr><td>Longitud Espacial</td><td>${locData.coordinates.longitude}</td></tr>`);
            }
            
            if (locData.parameters && Array.isArray(locData.parameters)) {
                locData.parameters.forEach(p => {
                    rows.push(`<tr><td>${p.displayName || p.parameter.toUpperCase()}</td><td>${p.lastValue} ${p.unit || ''}</td></tr>`);
                });
            }
        }
    } catch(e) { return `<p class="error-text">Error transformando JSON: ${e.message}</p>`; }

    if (rows.length === 0) return `<p>Petición exitosa, pero no se encontraron datos válidos.</p>`;
    return `<table class="data-table"><thead><tr><th>Variable</th><th>Valor Reportado</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function downloadJSON(api) {
    const data = window.apiDataCache[api];
    if (!data) return;
    const now = new Date();
    const filename = `${api}_${now.toISOString().split('T')[0]}_${now.toTimeString().split(' ')[0].replace(/:/g, '-')}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ==========================================
// EJECUCIÓN HTTP (FETCH REAL)
// ==========================================
async function executeRealRequest(api) {
  const prefix = api === 'purpleair' ? 'pa' : api === 'iqair' ? 'iq' : api === 'openaq' ? 'oaq' : '';
  const el = document.getElementById(`${prefix}-table`);
  const btnDownload = document.getElementById(`btn-dl-${api}`);
  let url = document.getElementById(`${prefix}-url`).textContent;
  
  el.classList.remove('error-text');
  el.innerHTML = "<p>Conectando al servidor...</p>";
  btnDownload.classList.add('hidden'); 

  // Petición plana y directa: Ninguna API aquí usa headers restrictivos ahora.
  let options = { method: 'GET' };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    
    window.apiDataCache[api] = data;
    el.innerHTML = buildDataTable(api, data);
    btnDownload.classList.remove('hidden');
    showToast("Datos estructurados en tabla exitosamente");

  } catch (error) {
    el.classList.add('error-text');
    el.innerHTML = `<p><strong>Fallo HTTP:</strong> ${error.message}</p>`;
    showToast("Error en la extracción de datos", true);
  }
}