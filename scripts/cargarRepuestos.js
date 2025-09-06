require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch((err) => {
    console.error('❌ Error de conexión:', err);
    process.exit(1);
  });

const resultados = [];

fs.createReadStream('./scripts/repuestos.csv')
  .pipe(csv())
  .on('data', (data) => {
    resultados.push({
      codigo: data.codigo,
      nombre: data.nombre,
      cantidad: 0
    });
  })
  .on('end', async () => {
    console.log(`📦 Total de registros leídos del CSV: ${resultados.length}`);

    try {
      const res = await Stock.insertMany(resultados, { ordered: false });
      console.log(`✅ Repuestos insertados correctamente: ${res.length}`);
    } catch (err) {
      if (err.name === 'MongoBulkWriteError' || err.code === 11000) {
        const insertados = err.insertedDocs?.length || 0;
        const errores = err.writeErrors?.length || 0;
        console.log(`⚠️  Repuestos insertados: ${insertados}`);
        console.log(`⛔  Repuestos ignorados (duplicados): ${errores}`);
      } else {
        console.error('❌ Error inesperado:', err);
      }
    } finally {
      mongoose.disconnect();
    }
  });
