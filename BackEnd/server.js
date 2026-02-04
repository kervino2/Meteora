const express = require("express");
const cors = require("cors");
const db = require("./db");
const { importJSON } = require("./CargarDatos/ImportJsontoSql");
const path = require("path");
const { exec } = require("child_process");
const MeteorMatches = require("./models/MetoritosConsolidado");
const { Op } = require("sequelize");
const { importTiposMeteoritos } = require("./CargarDatos/ImportTiposM");
const TiposMeteoritos = require("./models/tiposMeteorito");

const app = express();

// ------------------------------------------------------
// ------------------------------------------------------
app.use(cors({
  origin: "http://localhost:4200",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// ------------------------------------------------------

// ------------------------------------------------------
app.get("/", (req, res) => res.json({ message: "✅ Back End Iniciado correctamente" }));

// ------------------------------------------------------
// Ejecutar Python + cargar datos JSON a MySQL
// ------------------------------------------------------
app.post("/actualizarJson", async (req, res) => {
  try {
    console.log("🚀 Iniciando actualización general...");

    const scriptPathMetbull = path.join(__dirname, "CargarDatos", "DatosEnriquesidos.py");

    await new Promise((resolve, reject) => {
      exec(`python "${scriptPathMetbull}"`, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Error en Python:", stderr);
          return reject(error);
        }
        console.log("🐍 Script Python ejecutado con éxito:", stdout);
        resolve();
      });
    });

    // Cargar datos en MySQL desde JSON
    await importarCSV();

    res.json({ message: "✅ Actualización completada correctamente (Python + JSON)" });
  } catch (err) {
    console.error("❌ Error en /actualizarTodo:", err);
    res.status(500).json({ error: "Error durante la actualización completa" });
  }
});

// ------------------------------------------------------
// Cargar solo los datos JSON a MySQL
// ------------------------------------------------------
app.post("/actualizarSQL", async (req, res) => {
  try {
    await importarCSV();
    res.json({ message: "✅ Importación desde JSON completada" });
  } catch (err) {
    console.error("❌ Error en /actualizarCSVs:", err);
    res.status(500).json({ error: "Error al importar los JSON" });
  }
});

app.post("/importarTipos", async (req, res) => {
  try {
    await importTiposMeteoritos();
    res.json({ message: "✅ Importación de tipos completada" });
  } catch (err) {
    console.error("❌ Error al importar tipos:", err.message);
    res.status(500).json({ error: "Error al importar tipos" });
  }
});

// ------------------------------------------------------
// Función para importar JSONs
// ------------------------------------------------------
async function importarCSV() {
  try {
    console.log("📦 Iniciando importación desde JSON...");
    await importJSON();
    console.log("✅ Proceso de importación finalizado correctamente.");
  } catch (err) {
    console.error("❌ Error durante la importación:", err.message);
    throw err;
  }
}

// ------------------------------------------------------
// FuncionesApp servidor
// ------------------------------------------------------
app.get("/meteoritos", async (req, res) => {
  try {
    const meteoritos = await MeteorMatches.findAll({
      attributes: [
        "name",
        "year",
        "impact_energy",
        "dataMB109_Lat",
        "dataMB109_Lon",
        "impact_lat",
        "impact_lon",
        "coordinadesLatRecomend",
        "coordinadesLonRecomend",
        "coordinadesLat",
        "coordinadesLon",
      ],
    });

    const resultados = meteoritos.map((m) => {
      // --- Determinar latitud (según prioridad) ---
      const lat =
        m.dataMB109_Lat?.trim() ||
        m.impact_lat?.trim() ||
        m.coordinadesLatRecomend?.trim() ||
        m.coordinadesLat?.trim() ||
        null;

      // --- Determinar longitud (según prioridad) ---
      const lon =
        m.dataMB109_Lon?.trim() ||
        m.impact_lon?.trim() ||
        m.coordinadesLonRecomend?.trim() ||
        m.coordinadesLon?.trim() ||
        null;

      return {
        name: m.name,
        year: m.year,
        impact_energy: m.impact_energy,
        lat,
        lon,
      };
    });

    // Filtrar solo los meteoritos que tienen coordenadas válidas
    const filtrados = resultados.filter((m) => m.lat && m.lon);

    res.json(filtrados);
  } catch (err) {
    console.error("❌ Error al obtener meteoritos:", err);
    res.status(500).json({ error: "Error al obtener los meteoritos" });
  }
});

app.get("/tiposm", async (req, res) => {
  try {
    const tipos = await TiposMeteoritos.findAll({
      attributes: ["tipo", "agrupado", "urlImage", "explicacion"],
    });

    const resultados = tipos.map((t) => ({
      tipo: t.tipo,
      urlImage: t.urlImage,
      explicacion: t.explicacion,
      agrupado: typeof t.agrupado === "string" ? JSON.parse(t.agrupado) : t.agrupado,
    }));

    res.json(resultados);
  } catch (err) {
    console.error("❌ Error al obtener tipos de meteoritos:", err);
    res.status(500).json({ error: "Error al obtener los tipos de meteoritos" });
  }
});



app.get("/meteoritos/buscar", async (req, res) => {
  try {
    const { name, year } = req.query;

    if (!name || !year) {
      return res.status(400).json({ error: "Faltan parámetros: name o year" });
    }

    // Buscar en la base de datos por nombre y año
    const meteorito = await MeteorMatches.findOne({
      where: {
        Name: name,
        Year: year,
      },
    });

    if (!meteorito) {
      return res.status(404).json({ message: "No se encontró el meteorito" });
    }

    res.json(meteorito);
  } catch (err) {
    console.error("❌ Error al buscar meteorito:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/meteoritos/meteoritosF", async (req, res) => {
  try {
    const { filter } = req.query;
    let whereClause = {};

    switch (filter) {
      case "impacto":
        whereClause = {
          [Op.or]: [
            { impact_energy: { [Op.not]: null } },
            { impact_lat: { [Op.not]: null } },
            { impact_lon: { [Op.not]: null } },
          ],
        };
        break;

      case "interesante":
        whereClause = {
          [Op.or]: [
            { ia_historia: { [Op.not]: null } },
            { ia_importancia: { [Op.not]: null } },
          ],
        };
        break;

      case "fotos":
        // No filtramos aquí en SQL porque el campo es texto JSON.
        // Lo haremos en memoria más abajo.
        whereClause = {};
        break;

      default:
        whereClause = {};
        break;
    }

    // Traer los mismos campos que /meteoritos + fotos para filtrar en memoria
    const meteoritos = await MeteorMatches.findAll({
      attributes: [
        "name",
        "year",
        "impact_energy",
        "dataMB109_Lat",
        "dataMB109_Lon",
        "impact_lat",
        "impact_lon",
        "coordinadesLatRecomend",
        "coordinadesLonRecomend",
        "coordinadesLat",
        "coordinadesLon",
        "ia_fotos",
        "metBull_fotos",
      ],
      where: whereClause,
    });

    // Procesar igual que /meteoritos
    let resultados = meteoritos.map((m) => {
      const lat =
        m.dataMB109_Lat?.toString().trim() ||
        m.impact_lat?.toString().trim() ||
        m.coordinadesLatRecomend?.toString().trim() ||
        m.coordinadesLat?.toString().trim() ||
        null;

      const lon =
        m.dataMB109_Lon?.toString().trim() ||
        m.impact_lon?.toString().trim() ||
        m.coordinadesLonRecomend?.toString().trim() ||
        m.coordinadesLon?.toString().trim() ||
        null;

      return {
        name: m.name,
        year: m.year,
        impact_energy: m.impact_energy,
        lat,
        lon,
        ia_fotos: m.ia_fotos,
        metBull_fotos: m.metBull_fotos,
      };
    });

    // Filtrar solo los meteoritos con coordenadas válidas
    resultados = resultados.filter((m) => m.lat && m.lon);

    // Filtro adicional: fotos
    if (filter === "fotos") {
      resultados = resultados.filter((m) => {
        // Convertir texto JSON a objeto si es necesario
        let fotosMB = [];
        try {
          fotosMB = JSON.parse(m.metBull_fotos || "[]");
        } catch {
          fotosMB = [];
        }

        // Determinar si hay fotos válidas
        const tieneFotos =
          (Array.isArray(fotosMB) && fotosMB.length > 0) ||
          (m.ia_fotos && m.ia_fotos.trim() !== "" && m.ia_fotos !== "[]");

        return tieneFotos;
      });
    }

    // Eliminar campos de fotos del resultado final (como /meteoritos)
    const filtrados = resultados.map(({ name, year, impact_energy, lat, lon }) => ({
      name,
      year,
      impact_energy,
      lat,
      lon,
    }));

    res.json(filtrados);
  } catch (err) {
    console.error("❌ Error al obtener meteoritos filtrados:", err);
    res.status(500).json({ error: "Error al obtener los meteoritos filtrados" });
  }
});



// ------------------------------------------------------
// Iniciar servidor
// ------------------------------------------------------
const PORT = 3000;
db.sync().then(() => {
  app.listen(PORT, () => console.log(`🌍 Servidor corriendo en http://localhost:${PORT}`));
});
