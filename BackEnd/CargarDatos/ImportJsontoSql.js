const fs = require("fs");
const path = require("path");
const db = require("../db");
const MeteorMatches = require("../models/MetoritosConsolidado");


const BATCH_SIZE = 100;

function safeNum(value) {
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

async function importJSON() {
  await db.sync();

  // Eliminar todos los datos existentes antes de insertar nuevos
  console.log("🧹 Eliminando registros previos...");
  await MeteorMatches.destroy({ where: {}, truncate: true });
  console.log("✅ Tabla vaciada correctamente.");

  const filePath = path.join(__dirname, "meteoritos.json");

  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo: ${filePath}`);
  }

  const rawData = fs.readFileSync(filePath, "utf-8");
  const meteoritos = JSON.parse(rawData);

  let totalInserted = 0;
  let batch = [];

  for (const row of meteoritos) {
    try {
      const year = safeNum(row.year || row.basic_yearFound);

      const record = {
        // Campos principales
        name: row.name || row.Name || null,
        status: row.status || row.Status || null,
        fall: row.fall || row.Fall || null,
        year: year,
        place: row.place || row.Place || null,
        type: row.type || row.Type || null,
        mass: safeNum(row.mass || row.Mass),
        country: row.country || row.Country || null,

        // Datos básicos
        basic_name: row.basic_name || null,
        basic_abbrev: row.basic_abbrev || null,
        basic_fall: row.basic_fall || null,
        basic_yearFound: year,
        basic_country: row.basic_country || null,

        classification: row.classification || null,

        // Coordenadas
        coordinadesExact: row.coordinadesExact || null,
        coordinadesRecomend: row.coordinadesRecomend || null,
        coordinadesLat: safeNum(
          row.coordinadesLat ||
          row.dataMB109_Lat ||
          row.impact_lat ||
          row.coordinadesLatRecomend
        ),
        coordinadesLon: safeNum(
          row.coordinadesLon ||
          row.dataMB109_Lon ||
          row.impact_lon ||
          row.coordinadesLonRecomend
        ),
        coordinadesLatRecomend: safeNum(row.coordinadesLatRecomend),
        coordinadesLonRecomend: safeNum(row.coordinadesLonRecomend),

        // Datos MetBull
        dataMB109_Lat: safeNum(row.dataMB109_Lat),
        dataMB109_Lon: safeNum(row.dataMB109_Lon),
        dataMB109_Mass: safeNum(row.dataMB109_Mass),
        dataMB109_Piece: safeNum(row.dataMB109_Piece),
        dataMB109_Class: row.dataMB109_Class || null,
        dataMB109_Weathering: row.dataMB109_Weathering || null,
        dataMB109_Fayalite: safeNum(row.dataMB109_Fayalite),
        dataMB109_Ferrosilite: safeNum(row.dataMB109_Ferrosilite),
        dataMB109_Classifier: row.dataMB109_Classifier || null,
        dataMB109_Main_mass: row.dataMB109_Main_mass || null,
        dataMB109_Coments: row.dataMB109_Coments || null,

        // Datos básicos
        impact_date: row.impact_date || null,
        impact_lat: row.impact_lat || null,
        impact_lon: row.impact_lon || null,
        impact_alt: row.impact_alt || null,
        impact_vel: row.impact_vel || null,
        impact_energy: row.impact_energy || null,
        impact_e: row.impact_e || null,

        metBull_fotos: Array.isArray(row.metBull_fotos)
        ? JSON.stringify(row.metBull_fotos)
        : row.metBull_fotos || null,

        // IA 
        ia_nombre: row.ia_nombre || null,
        ia_historia: row.ia_historia || null,
        ia_importancia: row.ia_importancia || null,
        ia_descubrimiento: row.ia_descubrimiento || null,
        ia_impacto: row.ia_impacto || null,
        ia_velocidad: row.ia_velocidad || null,
        ia_energia: row.ia_energia || null,
        ia_links: row.ia_links || null,
        ia_fotos: row.ia_fotos || null,
        ia_videos: row.ia_videos || null,
      };

      batch.push(record);

      if (batch.length >= BATCH_SIZE) {
        await MeteorMatches.bulkCreate(batch);
        totalInserted += batch.length;
        console.log(`✅ Insertados ${totalInserted} registros...`);
        batch = [];
      }
    } catch (err) {
      console.error("⚠️ Error procesando meteorito:", err.message);
    }
  }

  if (batch.length > 0) {
    await MeteorMatches.bulkCreate(batch);
    totalInserted += batch.length;
  }

  console.log(`🎉 Importación completada. Total insertados: ${totalInserted}`);
}

module.exports = { importJSON };
