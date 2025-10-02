const cron = require('node-cron');
//const enviarCorreo = require('../utils/correo');
const enviarCorreo = require('../utils/correoResend');
const Uso = require('../models/Uso');

// Función para convertir los usos a texto plano
function formatearUsos(usos) {
  return usos.map((u, i) =>
    `${i + 1}. Fecha: ${new Date(u.fecha).toLocaleDateString()}, Repuesto: ${u.repuesto}, Cantidad: ${u.cantidad}`
  ).join('\n');
}

// Programar para todos los lunes a las 08:00 AM
cron.schedule('0 8 * * 1', async () => {
  console.log('🕗 Ejecutando envío semanal de reporte...');

  try {
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // domingo

    const usos = await Uso.find({ fecha: { $gte: inicioSemana, $lte: hoy } }).lean();

    if (usos.length === 0) {
      console.log('ℹ️ No hay datos para enviar esta semana.');
      return;
    }

    const destinatario = 'rnm.crea@gmail.com';
    const cuerpo = formatearUsos(usos);

    await enviarCorreo(destinatario, 'Reporte semanal de repuestos', cuerpo);
    console.log('✅ Reporte enviado automáticamente.');
  } catch (error) {
    console.error('❌ Error en envío automático:', error);
  }
});
