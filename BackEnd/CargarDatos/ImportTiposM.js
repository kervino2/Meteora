const fs = require("fs");
const path = require("path");
const db = require("../db");
const TiposMeteoritos = require("../models/tiposMeteorito");

const BATCH_SIZE = 50;

async function importTiposMeteoritos() {
  await db.sync();

  console.log("🧹 Eliminando registros previos...");
  await TiposMeteoritos.destroy({ where: {}, truncate: true });
  console.log("✅ Tabla TiposMeteoritos vaciada correctamente.");

  const filePath = path.join(__dirname, "tiposMeteoritos.json");

  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo: ${filePath}`);
  }

  const rawData = fs.readFileSync(filePath, "utf-8");
  const tipos = JSON.parse(rawData);

  let totalInserted = 0;
  let batch = [];

  for (const tipo of tipos) {
    try {
      const record = {
        tipo: tipo.tipo || null,
        agrupado: JSON.stringify(tipo.agrupado || []),
        urlImage: tipo.urlImage || null,
        explicacion: tipo.explicacion || null,
      };

      batch.push(record);

      if (batch.length >= BATCH_SIZE) {
        await TiposMeteoritos.bulkCreate(batch);
        totalInserted += batch.length;
        console.log(`✅ Insertados ${totalInserted} tipos...`);
        batch = [];
      }
    } catch (err) {
      console.error("⚠️ Error procesando tipo:", err.message);
    }
  }

  if (batch.length > 0) {
    await TiposMeteoritos.bulkCreate(batch);
    totalInserted += batch.length;
  }

  console.log(`🎉 Importación completada. Total insertados: ${totalInserted}`);
}

module.exports = { importTiposMeteoritos };
