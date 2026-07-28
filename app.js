/**
 * Lógica de conexión en TIEMPO REAL del Explorador de APIs.
 */

const KEYS = { 
  PA: '865A0734-3A82-11F1-B596-4201AC1DC123', 
  IQ: 'd2f965eb-24ec-4296-bd26-6ab153f47b63', 
  OAQ: '15440168e9f1863ef9b080ce4b171c56e5364beb8ccf3ae2971763658a909f25'
};

// IQAIR_CITIES_DB eliminado (se buscará directamente por nombre y estado en la API)

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

  const btnAvg = document.getElementById('btn-dl-pa-avg');
  if(btnAvg) btnAvg.addEventListener('click', downloadPAAverages);

  // NUEVO: Vincular el botón de promedios históricos
  const btnHistAvg = document.getElementById('btn-dl-pa-hist-avg');
  if(btnHistAvg) btnHistAvg.addEventListener('click', downloadPAHistoryAverages);

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
  // Se excluye "time_stamp", "name", "latitude", "longitude" de la data histórica, ya que la API de PurpleAir lo rechaza o lo incluye por defecto.
  const FIELDS_CURRENT = 'name,latitude,longitude,pm1.0,pm2.5_atm,pm2.5_cf_1,pm10.0_atm,temperature,humidity,pressure,voc,ozone1';
  const FIELDS_HISTORY = 'pm1.0_atm,pm2.5_atm,pm2.5_cf_1,pm10.0_atm,temperature,humidity,pressure,voc';
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
  const value = document.getElementById('iq-city-dropdown').value;
  const [city, state] = value.split('|');
  const url = `https://api.airvisual.com/v2/city?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=Honduras&key=${KEYS.IQ}`;
  document.getElementById('iq-url').textContent = url;
}

function buildOAQ() {
  const coords = document.getElementById('oaq-loc-dropdown').value;
  // Llamamos a la API interna de Vercel que acabamos de crear
  const url = `/api/openaq?coordinates=${coords}`;
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
  
  // Ocultar botones de promedios al cambiar de modo (se mostrarán al ejecutar fetch)
  const btnAvg = document.getElementById('btn-dl-pa-avg');
  const btnHistAvg = document.getElementById('btn-dl-pa-hist-avg');
  if (btnAvg) btnAvg.classList.add('hidden');
  if (btnHistAvg) btnHistAvg.classList.add('hidden');
}

// Función auxiliar para formatear (puedes ponerla justo arriba de buildDataTable)
function formatTimestamp(ts) {
    const d = new Date(ts * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function buildDataTable(api, data) {
    let rows = [];
    try {
        if (api === 'purpleair') {
            if (data.fields && data.data && Array.isArray(data.data)) {
                if(data.data.length === 0) return `<p>Petición exitosa, pero no hay sensores reportando en esta área.</p>`;
                
                const isHistory = data.data[0].length > 5; 
                rows.push(`<tr><th colspan="2" style="background:#334155; color:white; text-align:center;">${isHistory ? 'DATOS HISTÓRICOS' : 'SENSORES ENCONTRADOS: ' + data.data.length}</th></tr>`);
                
                data.data.forEach(sensorArray => {
                    let s = {};
                    data.fields.forEach((f, i) => s[f] = sensorArray[i]);
                    
                    // Formatear el timestamp si existe
                    const timeDisplay = s.time_stamp ? formatTimestamp(s.time_stamp) : 'N/A';
                    const title = s.name ? `Sensor: ${s.name}` : `Lectura: ${timeDisplay}`;
                    
                    rows.push(`<tr><td colspan="2" style="background:rgba(16,185,129,0.2); font-weight:bold; color:#a7f3d0;">${title}</td></tr>`);
                    
                    const dict = {
                        "time_stamp": "Fecha y Hora",
                        "latitude": "Latitud", 
                        "longitude": "Longitud",
                        "pm1.0_atm": "PM 1.0 (µg/m³)", 
                        "pm2.5_atm": "PM 2.5 (µg/m³)", 
                        "pm10.0_atm": "PM 10.0 (µg/m³)",
                        "temperature": "Temperatura (°F)", 
                        "humidity": "Humedad (%)"
                    };
                    
                    for (let key in dict) {
                        if (s[key] !== undefined && s[key] !== null) {
                            // Si la clave es el timestamp, pasamos el valor ya formateado
                            let valorAMostrar = key === 'time_stamp' ? timeDisplay : s[key];
                            rows.push(`<tr><td>${dict[key]}</td><td>${valorAMostrar}</td></tr>`);
                        }
                    }
                });
            } else if (data.sensor) {
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
            const loc = data.data.location;
            
            if (loc && loc.coordinates) {
                rows.push(`<tr><td>Longitud Espacial</td><td>${loc.coordinates[0]}</td></tr>`);
                rows.push(`<tr><td>Latitud Espacial</td><td>${loc.coordinates[1]}</td></tr>`);
            }
            rows.push(`<tr><td>Temperatura Ambiente (°C)</td><td>${w.tp}</td></tr>`);
            rows.push(`<tr><td>Humedad Relativa (%)</td><td>${w.hu}</td></tr>`);
            rows.push(`<tr><td>Presión Atmosférica (hPa)</td><td>${w.pr}</td></tr>`);
            rows.push(`<tr><td>Velocidad del Viento (m/s)</td><td>${w.ws}</td></tr>`);
            rows.push(`<tr><td>Índice de Calidad (AQI US)</td><td>${p.aqius}</td></tr>`);
            rows.push(`<tr><td>Contaminante Principal</td><td>${p.mainus}</td></tr>`);
        } 
        else if (api === 'openaq') {
            if (data.error) throw new Error(data.error);
            
            rows.push(`<tr><th colspan="2" style="background:#334155; color:white; text-align:center;">ESTACIÓN: ${data.station_name}</th></tr>`);
            rows.push(`<tr><td>Parámetro de Medición</td><td>${data.parameter.toUpperCase()} (ID: ${data.sensor_id})</td></tr>`);
            
            // Tabla de Mediciones Originales
            rows.push(`<tr><th colspan="2" style="background:rgba(16,185,129,0.2); font-weight:bold; color:#a7f3d0;">Mediciones Originales (Más Recientes)</th></tr>`);
            data.original_measurements.forEach(m => {
                const time = m.period?.datetimeTo?.utc ? formatTimestamp(new Date(m.period.datetimeTo.utc).getTime() / 1000) : 'Desconocido';
                rows.push(`<tr><td>Tiempo Real: ${time}</td><td>${m.value} ${data.units}</td></tr>`);
            });
            
            // Tabla de Datos Históricos
            rows.push(`<tr><th colspan="2" style="background:rgba(56,189,248,0.2); font-weight:bold; color:#38bdf8;">Promedios Diarios (Históricos)</th></tr>`);
            data.historical_averages.forEach(h => {
                const day = h.period?.datetimeFrom?.utc ? h.period.datetimeFrom.utc.split('T')[0] : 'Desconocido';
                const min = h.summary?.min ?? 'N/A';
                const max = h.summary?.max ?? 'N/A';
                const avg = h.summary?.avg ?? 'N/A';
                rows.push(`<tr><td>Día: ${day}</td><td>Mín: ${min} | Máx: ${max} | Promedio: ${avg}</td></tr>`);
            });
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

function downloadPAAverages() {
    const data = window.apiDataCache['purpleair'];
    if (!data || !data.data || !Array.isArray(data.data)) {
        showToast("No hay datos de área cargados para promediar.", true);
        return;
    }

    let sums = { pm1_0: 0, pm2_5: 0, pm10_0: 0, temperature: 0, humidity: 0 };
    let counts = { pm1_0: 0, pm2_5: 0, pm10_0: 0, temperature: 0, humidity: 0 };

    data.data.forEach(sensorArray => {
        let s = {};
        data.fields.forEach((f, i) => s[f] = sensorArray[i]);
        
        if (s['pm1.0'] != null) { sums.pm1_0 += s['pm1.0']; counts.pm1_0++; }
        if (s['pm2.5_atm'] != null) { sums.pm2_5 += s['pm2.5_atm']; counts.pm2_5++; }
        if (s['pm10.0_atm'] != null) { sums.pm10_0 += s['pm10.0_atm']; counts.pm10_0++; }
        if (s['temperature'] != null) { sums.temperature += s['temperature']; counts.temperature++; }
        if (s['humidity'] != null) { sums.humidity += s['humidity']; counts.humidity++; }
    });

    const avg = {
        sensor_count: data.data.length,
        average_pm1_0: counts.pm1_0 ? parseFloat((sums.pm1_0 / counts.pm1_0).toFixed(2)) : null,
        average_pm2_5: counts.pm2_5 ? parseFloat((sums.pm2_5 / counts.pm2_5).toFixed(2)) : null,
        average_pm10_0: counts.pm10_0 ? parseFloat((sums.pm10_0 / counts.pm10_0).toFixed(2)) : null,
        average_temperature: counts.temperature ? parseFloat((sums.temperature / counts.temperature).toFixed(2)) : null,
        average_humidity: counts.humidity ? parseFloat((sums.humidity / counts.humidity).toFixed(2)) : null
    };

    const now = new Date();
    const filename = `purpleair_averages_${now.toISOString().split('T')[0]}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(avg, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function downloadPAHistoryAverages() {
    const data = window.apiDataCache['purpleair'];
    
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
        showToast("No hay datos históricos cargados para promediar.", true);
        return;
    }

    // Inicializamos objetos dinámicos para sumas y conteos basados en los 'fields'
    let sums = {};
    let counts = {};

    // Excluimos campos que no tiene sentido promediar
    const excludedFields = ['time_stamp', 'sensor_index', 'name', 'latitude', 'longitude'];

    data.fields.forEach(field => {
        if (!excludedFields.includes(field)) {
            sums[field] = 0;
            counts[field] = 0;
        }
    });

    // Recorremos la matriz de datos históricos
    data.data.forEach(sensorArray => {
        let s = {};
        data.fields.forEach((f, i) => s[f] = sensorArray[i]);
        
        // Sumamos los valores válidos
        for (let field in sums) {
            if (s[field] != null && typeof s[field] === 'number') {
                sums[field] += s[field];
                counts[field]++;
            }
        }
    });

    // Calculamos el promedio final
    let averages = {
        total_readings: data.data.length,
        period_start: data.data[data.data.length - 1][data.fields.indexOf('time_stamp')], // PurpleAir a veces devuelve invertido
        period_end: data.data[0][data.fields.indexOf('time_stamp')]
    };

    for (let field in sums) {
        averages[`average_${field}`] = counts[field] > 0 
            ? parseFloat((sums[field] / counts[field]).toFixed(2)) 
            : null;
    }

    // Proceso de descarga
    const now = new Date();
    const filename = `purpleair_historical_averages_${now.toISOString().split('T')[0]}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(averages, null, 2)], { type: 'application/json' }));
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

  let options = { method: 'GET', headers: {} };

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch(e) {
        throw new Error(`El servidor respondió con contenido inválido (no JSON). Status: ${response.status}. Fragmento: ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    
    window.apiDataCache[api] = data;
    el.innerHTML = buildDataTable(api, data);
    btnDownload.classList.remove('hidden');
    if (api === 'purpleair') {
        const paMode = document.getElementById('pa-mode').value;
        const btnAvg = document.getElementById('btn-dl-pa-avg');
        const btnHistAvg = document.getElementById('btn-dl-pa-hist-avg');
        
        if (paMode === 'list' && btnAvg) btnAvg.classList.remove('hidden');
        if (paMode === 'history' && btnHistAvg) btnHistAvg.classList.remove('hidden');
    }

    showToast("Datos estructurados en tabla exitosamente");

  } catch (error) {
    el.classList.add('error-text');
    el.innerHTML = `<p><strong>Fallo HTTP:</strong> ${error.message}</p>`;
    showToast("Error en la extracción de datos", true);
  }
}