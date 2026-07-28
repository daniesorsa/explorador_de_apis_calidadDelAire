// Archivo: api/openaq.js
export default async function handler(req, res) {
    // 1. Recibimos las coordenadas desde tu app.js
    const { coordinates } = req.query;

    if (!coordinates) {
        return res.status(400).json({ error: "Coordenadas requeridas" });
    }

    // 2. Vercel lee la variable de entorno de forma segura (invisible para el navegador)
    const apiKey = process.env.OPENAQ_KEY;

    const url = `https://api.openaq.org/v3/locations?coordinates=${coordinates}&radius=25000`;

    try {
        // 3. Hacemos la petición pura de servidor a servidor (adiós bloqueos CORS)
        const response = await fetch(url, {
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        // Si es exitoso, enviamos la data de vuelta a tu frontend
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Error interno del servidor Vercel" });
    }
}