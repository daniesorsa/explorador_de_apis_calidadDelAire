/**
 * Lógica de conexión en TIEMPO REAL del Explorador de APIs.
 * Incluye Parsing tabular de JSON (con metadata espacial) y evasión de CORS.
 */

const KEYS = { 
  PA: 'AECECD5B-8518-11F1-9E30-4201AC1DC129', 
  IQ: '65948212-5b5d-4aa1-b507-5c547bced938', 
  OAQ: '15440168e9f1863ef9b080ce4b171c56e5364beb8ccf3ae2971763658a909f25', 
  AG: 'YOUR_AIRGRADIENT_TOKEN' 
};

const IQAIR_CITIES_DB = {
  "tegucigalpa": { lat: "14.0818", lon: "-87.2068" },
  "sps": { lat: "15.5042", lon: "-88.0250" }
};

const OPENAQ_LOCATIONS_DB = {
  "8118": "Tegucigalpa (US Diplomatic Post)",
  "8119": "San Pedro Sula (ID Referencial)"
};

window.apiDataCache = {
    purpleair: null, iqair: null, openaq: null, airgradient: null
};

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

  // Inicializadores de reloj
  setInterval(updateClocks, 1000);
  updateUI();
});

// ==========================================
// UTILIDADES Y RELOJES
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
  showToast('¡URL de Consulta copiada exitosamente!');
}

function updateClocks() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-HN');
  const timeStr = now.toLocaleTimeString('es-HN');
  
  const paDate = document.getElementById('pa-date-display');
  const paTime = document.getElementById('pa-time-display');
  
  if(paDate) paDate.textContent = dateStr;
  if(paTime) paTime.textContent = timeStr;
}

function getTodayStr() { return new Date().toISOString().split('T')[0]; }

function renderTable(title, data) {
  if (!data || !data.length) return '';
  return `<div class="card" style="padding: 1rem;"><h4 style="margin-top:0; color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">${title}</h4><table>${data.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table></div>`;
}

// ==========================================
// CONSTRUCTORES DE URL
// ==========================================

function buildPA() {
  const mode = document.getElementById('pa-mode').value;
  const sensor = document.getElementById('pa-sensor').value;
  let url = '';
  
  // EXPANSIÓN: Además de los parámetros climáticos, extraemos latitud y longitud explícitamente.
  const ALL_FIELDS = 'name,latitude,longitude,pm1.0,pm2.5_atm,pm2.5_cf_1,pm10.0_atm,temperature,humidity,pressure,voc,ozone1';

  if (mode === 'current') {
    url = `https://api.purpleair.com/v1/sensors/${sensor}?fields=${ALL_FIELDS}`;
  } else if (mode === 'history') {
    const s = document.getElementById('pa-start').value, e = document.getElementById('pa-end').value, a = document.getElementById('pa-avg').value;
    url = `https://api.purpleair.com/v1/sensors/${sensor}/history?fields=${ALL_FIELDS}&start_timestamp=${s}&end_timestamp=${e}&average=${a}`;
  } else {
    const r = document.getElementById('pa-region').value;
    const [nwlat, nwlng, selat, selng] = r === 'tgu' ? ['14.20','-87.35','13.95','-87.10'] : ['15.60','-88.10','15.40','-87.90'];
    url = `https://api.purpleair.com/v1/sensors?fields=sensor_index,${ALL_FIELDS}&nwlat=${nwlat}&nwlng=${nwlng}&selat=${selat}&selng=${selng}`;
  }
  
  // INYECCIÓN DE API KEY EN URL: Para que el botón "Copiar" funcione directamente en un navegador.
  url += `&api_key=${KEYS.PA}`;
  document.getElementById('pa-url').textContent = url;
  
  // El bloque de parámetros fue removido intencionalmente según las instrucciones.
}

function buildIQ() {
  const cityKey = document.getElementById('iq-city-dropdown').value;
  const coords = IQAIR_CITIES_DB[cityKey];
  const url = `https://api.airvisual.com/v2/nearest_city?lat=${coords.lat}&lon=${coords.lon}&key=${KEYS.IQ}`;
  const params = [['lat', coords.lat], ['lon', coords.lon], ['key', KEYS.IQ], ['Fecha', getTodayStr()]];
  
  document.getElementById('iq-url').textContent = url;
  document.getElementById('iq-params').innerHTML = renderTable('Parámetros URL reales', params);
}

function buildOAQ() {
  const id = document.getElementById('oaq-loc-dropdown').value;
  let url = `https://api.openaq.org/v3/locations/${id}`;
  const params = [['Location ID', id], ['Fecha', getTodayStr()]];

  document.getElementById('oaq-url').textContent = url;
  document.getElementById('oaq-params').innerHTML = renderTable('Parámetros URL reales', params);
}

function buildAG() {
  const mode = document.getElementById('ag-mode').value;
  const id = document.getElementById('ag-locid').value;
  let url = '', params = [];

  if (mode === 'places') url = `https://api.airgradient.com/public/api/v1/places`;
  else if (mode === 'current') url = `https://api.airgradient.com/public/api/v1/locations/${id}/measures/current`;
  else {
    const b = document.getElementById('ag-bucket').value, f = document.getElementById('ag-from').value, t = document.getElementById('ag-to').value;
    url = `https://api.airgradient.com/public/api/v1/locations/${id}/measures?type=${b}&from=${f}&to=${t}`;
    params = [['type', b], ['from', f], ['to', t]];
  }
  params.push(['Fecha', getTodayStr()]);
  document.getElementById('ag-url').textContent = url;
  document.getElementById('ag-params').innerHTML = renderTable('Parámetros URL reales', params);
}

function updateUI() {
  const paMode = document.getElementById('pa-mode').value;
  document.getElementById('pa-sensor-row').classList.toggle('hidden', paMode === 'list');
  document.getElementById('pa-region-row').classList.toggle('hidden', paMode !== 'list');
  document.getElementById('pa-history-row').classList.toggle('hidden', paMode !== 'history');
  buildPA();

  buildIQ(); 
  buildOAQ();

  const agMode = document.getElementById('ag-mode').value;
  document.getElementById('ag-loc-row').classList.toggle('hidden', agMode === 'places');
  document.getElementById('ag-hist-row').classList.toggle('hidden', agMode !== 'history');
  buildAG();
}

// ==========================================
// PARSER DE DATOS: APLANAMIENTO A TABLA (Feature Extraction)
// ==========================================
function buildDataTable(api, data) {
    let rows = [];
    try {
        if (api === 'purpleair') {
            const s = data.sensor || data.data; 
            if(!s) throw new Error("Estructura 'sensor' no encontrada.");
            
            // METADATA INYECTADA DIRECTAMENTE EN LA MATRIZ (ID, LAT, LON)
            const dict = {
                "sensor_index": "ID de Estación (Feature Geográfica)",
                "latitude": "Latitud Espacial",
                "longitude": "Longitud Espacial",
                "name": "Identificador de Estación",
                "pm1.0": "Masa PM 1.0 (µg/m³)",
                "pm2.5_atm": "Masa PM 2.5 Ambiental (µg/m³)",
                "pm10.0_atm": "Masa PM 10.0 Ambiental (µg/m³)",
                "temperature": "Temperatura Local (°F)",
                "humidity": "Humedad Relativa (%)",
                "pressure": "Presión Atmosférica (mb)",
                "voc": "Compuestos Orgánicos Volátiles (VOC)",
                "ozone1": "Ozono Estimado (O3)"
            };
            
            for (let key in dict) {
                if (s[key] !== undefined) rows.push(`<tr><td>${dict[key]}</td><td>${s[key]}</td></tr>`);
            }
        } 
        else if (api === 'iqair') {
            const w = data.data.current.weather;
            const p = data.data.current.pollution;
            
            // Inyectando latitud y longitud provistas por la ciudad seleccionada
            const selectedCity = IQAIR_CITIES_DB[document.getElementById('iq-city-dropdown').value];
            rows.push(`<tr><td>Latitud Espacial</td><td>${selectedCity.lat}</td></tr>`);
            rows.push(`<tr><td>Longitud Espacial</td><td>${selectedCity.lon}</td></tr>`);
            rows.push(`<tr><td>Temperatura Ambiente (°C)</td><td>${w.tp}</td></tr>`);
            rows.push(`<tr><td>Humedad Relativa (%)</td><td>${w.hu}</td></tr>`);
            rows.push(`<tr><td>Presión Atmosférica (hPa)</td><td>${w.pr}</td></tr>`);
            rows.push(`<tr><td>Velocidad del Viento (m/s)</td><td>${w.ws}</td></tr>`);
            rows.push(`<tr><td>Dirección del Viento (°)</td><td>${w.wd}</td></tr>`);
            rows.push(`<tr><td>Índice de Calidad (AQI US)</td><td>${p.aqius}</td></tr>`);
            rows.push(`<tr><td>Contaminante Principal</td><td>${p.mainus}</td></tr>`);
        } 
        else if (api === 'openaq') {
            const locData = data.results[0];
            rows.push(`<tr><td>ID de Estación</td><td>${locData.id}</td></tr>`);
            if(locData.coordinates) {
                rows.push(`<tr><td>Latitud Espacial</td><td>${locData.coordinates.latitude}</td></tr>`);
                rows.push(`<tr><td>Longitud Espacial</td><td>${locData.coordinates.longitude}</td></tr>`);
            }
            
            const paramsList = locData.parameters;
            paramsList.forEach(p => {
                rows.push(`<tr><td>${p.displayName || p.parameter.toUpperCase()}</td><td>${p.lastValue} ${p.unit}</td></tr>`);
            });
        } 
        else if (api === 'airgradient') {
            const d = Array.isArray(data) ? data[data.length - 1] : data; 
            const dict = {
                "locationId": "ID de Estación (Feature Geográfica)",
                "pm01": "Masa PM 1.0 (µg/m³)",
                "pm02": "Masa PM 2.5 (µg/m³)",
                "pm10": "Masa PM 10.0 (µg/m³)",
                "atmp": "Temperatura Interna (°C)",
                "rhum": "Humedad Relativa (%)",
                "rco2": "Dióxido de Carbono (ppm)",
                "tvoc": "Compuestos Orgánicos Volátiles Totales",
                "nox": "Óxidos de Nitrógeno Index"
            };
            
            for (let key in dict) {
                if (d[key] !== undefined) rows.push(`<tr><td>${dict[key]}</td><td>${d[key]}</td></tr>`);
            }
        }
    } catch(e) {
        return `<p class="error-text">Error transformando JSON a Matriz: ${e.message}</p>`;
    }

    if (rows.length === 0) return `<p>Petición exitosa, pero no se encontraron datos.</p>`;

    return `<table class="data-table">
              <thead><tr><th>Variable / Feature</th><th>Valor (Última Observación)</th></tr></thead>
              <tbody>${rows.join('')}</tbody>
            </table>`;
}

function downloadJSON(api) {
    const data = window.apiDataCache[api];
    if (!data) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; 
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); 
    const filename = `${api}_${dateStr}_${timeStr}.json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================
// EJECUCIÓN HTTP - SOLUCIÓN A BLOQUEO CORS
// ==========================================
async function executeRealRequest(api) {
  const prefix = api === 'purpleair' ? 'pa' : api === 'iqair' ? 'iq' : api === 'openaq' ? 'oaq' : 'ag';
  const targetId = `${prefix}-table`;
  const btnDownloadId = `btn-dl-${api}`;
  
  const el = document.getElementById(targetId);
  const btnDownload = document.getElementById(btnDownloadId);
  const url = document.getElementById(`${prefix}-url`).textContent;
  
  el.classList.remove('error-text');
  el.innerHTML = "<p>Iniciando Ingestión de Datos...</p>";
  btnDownload.classList.add('hidden'); 

  let options = { method: 'GET', headers: {} };
  
  if (api === 'purpleair') {
      // PurpleAir requiere la llave en los headers para endpoints comerciales, 
      // pero v1 soporta api_key en query string (que ya añadimos arriba).
      // Aún así, pasarlo por header es más estable si el plan lo requiere.
      options.headers['X-API-Key'] = KEYS.PA; 
  } 
  else if (api === 'openaq') {
      /* 
       * SOLUCIÓN CORS (Cross-Origin Resource Sharing): 
       * Al eliminar 'X-API-Key' de los headers, el navegador convierte esto en una "Simple Request".
       * Evitamos el HTTP OPTIONS (Preflight) que estaba bloqueando la conexión. 
       * OpenAQ v3 permite acceso público a datos para consultas sin llave.
       */
  } 
  else if (api === 'airgradient') {
      if(KEYS.AG === 'YOUR_AIRGRADIENT_TOKEN') {
          el.innerHTML = "<p class='error-text'>Error: Token de AirGradient requerido.</p>";
          return;
      }
      options.headers['Authorization'] = `Bearer ${KEYS.AG}`;
  }

  // Elimina headers vacíos para evitar problemas con fetch
  if (Object.keys(options.headers).length === 0) delete options.headers;

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    
    window.apiDataCache[api] = data;
    el.innerHTML = buildDataTable(api, data);
    btnDownload.classList.remove('hidden');
    showToast("Datos estructurados en tabla exitosamente");

  } catch (error) {
    el.classList.add('error-text');
    el.innerHTML = `
        <p><strong>Fallo en la petición HTTP:</strong> ${error.message}</p>
        <hr style="border-color:#334155; margin: 10px 0;">
        <p><strong>Troubleshooting:</strong></p>
        <ul style="margin: 0; padding-left: 20px;">
            <li>El bloqueo de CORS fue mitigado. Si continúa fallando, verifica el ID.</li>
            <li>Revisa límites de Rate Limit de la red pública.</li>
        </ul>
    `;
    showToast("Error en la extracción de datos", true);
  }
}