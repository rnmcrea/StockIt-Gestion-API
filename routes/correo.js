const express = require('express');
const router = express.Router();
// const { enviarCorreo } = require('../utils/correo');
const { enviarCorreo } = require('../utils/correoResend');
const generarCSV = require('../utils/generarCSV');
const Uso = require('../models/Uso');
const autenticar = require('../middleware/auth');

console.log('Tipo de enviarCorreo:', typeof enviarCorreo);
console.log('Contenido completo:', require('../utils/correo'));

router.post('/', async (req, res) => {
  try {
    console.log('Iniciando generación de reporte...');
    
    const emailPrincipal = process.env.REPORT_EMAIL_PRINCIPAL || 'rnm.crea@gmail.com';
    const emailsCopia = process.env.REPORT_EMAIL_COPIA 
      ? process.env.REPORT_EMAIL_COPIA.split(',').map(email => email.trim())
      : [];

    console.log('Destinatario principal:', emailPrincipal);
    console.log('Destinatarios en copia:', emailsCopia);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailPrincipal)) {
      return res.status(400).json({ 
        error: 'Email principal inválido',
        email: emailPrincipal
      });
    }

    for (const email of emailsCopia) {
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: 'Email de copia inválido',
          email: email
        });
      }
    }

    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); // lunes
    inicioSemana.setHours(0, 0, 0, 0);

    const finHoy = new Date(hoy);
    finHoy.setHours(23, 59, 59, 999);

    console.log('Rango de fechas:', {
      desde: inicioSemana.toLocaleDateString(),
      hasta: finHoy.toLocaleDateString()
    });

    const usos = await Uso.find({
      fecha: { $gte: inicioSemana, $lte: hoy }
    }).lean();

    console.log(`Registros encontrados: ${usos.length}`);

    if (usos.length === 0) {
      return res.status(200).json({ 
        mensaje: 'No hay datos para reportar en el período seleccionado',
        registros: 0,
        destinatarios: {
          principal: emailPrincipal,
          copias: emailsCopia
        }
      });
    }

    console.log('Generando CSV...');
    const rutaCSV = generarCSV(usos);

    const asunto = `Reporte Semanal - StockIt (${inicioSemana.toLocaleDateString()} - ${hoy.toLocaleDateString()})`;
    const cuerpoMensaje = `
Estimado equipo,

Adjunto encontrará el reporte semanal de uso de repuestos correspondiente al período:
Desde: ${inicioSemana.toLocaleDateString()}
Hasta: ${hoy.toLocaleDateString()}

Total de registros: ${usos.length}

El archivo CSV adjunto contiene toda la información detallada organizada en columnas para fácil análisis en Excel.

Este reporte se genera automáticamente desde StockIt.

Saludos cordiales,
Sistema StockIt
    `.trim();

    console.log('Enviando a destinatarios configurados...');
    await enviarCorreo(emailPrincipal, asunto, cuerpoMensaje, rutaCSV, emailsCopia);

    console.log('Reporte enviado exitosamente');

    res.json({ 
      mensaje: 'Correo enviado correctamente',
      destinatarios: {
        principal: emailPrincipal,
        copias: emailsCopia,
        total: 1 + emailsCopia.length
      },
      registros: usos.length
    });

  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ 
      error: 'Error al enviar el correo',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/test-config', (req, res) => {
  const emailPrincipal = process.env.REPORT_EMAIL_PRINCIPAL || 'rnm.crea@gmail.com';
  const emailsCopia = process.env.REPORT_EMAIL_COPIA 
    ? process.env.REPORT_EMAIL_COPIA.split(',').map(email => email.trim())
    : [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailsValidos = {
    principal: emailRegex.test(emailPrincipal),
    copias: emailsCopia.map(email => ({ email, valido: emailRegex.test(email) }))
  };

  res.json({
    configuracion: {
      principal: emailPrincipal,
      copias: emailsCopia,
      total_destinatarios: 1 + emailsCopia.length
    },
    validacion: emailsValidos
  });
});

router.get('/test', async (req, res) => {
  try {
    console.log('Iniciando prueba de envío...');
    
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());

    const usos = await Uso.find({ fecha: { $gte: inicioSemana, $lte: hoy } }).lean();

    const emailPrincipal = process.env.REPORT_EMAIL_PRINCIPAL || 'rnm.crea@gmail.com';
    const emailsCopia = process.env.REPORT_EMAIL_COPIA 
      ? process.env.REPORT_EMAIL_COPIA.split(',').map(email => email.trim())
      : [];

    console.log('Destinatarios de prueba:', { principal: emailPrincipal, copias: emailsCopia });

    if (usos.length === 0) {
      await enviarCorreo(emailPrincipal, 'Prueba StockIt - Sin datos', 'Correo de prueba. No hay datos para el período actual.', null, emailsCopia);
    } else {
      await enviarCorreo(emailPrincipal, 'Prueba de envío - StockIt', `Correo de prueba con ${usos.length} registros`, null, emailsCopia);
    }
    
    res.json({ 
      mensaje: 'Correo de prueba enviado',
      destinatarios: {
        principal: emailPrincipal,
        copias: emailsCopia
      },
      registros: usos.length
    });
  } catch (err) {
    console.error('Error en prueba:', err);
    res.status(500).json({ error: 'Error en prueba', detalles: err.message });
  }
});

// POST /personal - Enviar reporte personal del usuario
router.post('/personal', autenticar, async (req, res) => {
  try {
    const { destinatario, usuario, tipoConsumo } = req.body;
    
    console.log(`📊 Solicitud de reporte personal para ${usuario}${tipoConsumo ? ` - Tipo: ${tipoConsumo}` : ''}`);
    
    // Verificar que el usuario solo pueda solicitar su propio reporte
    if (req.usuario.nombre !== usuario) {
      return res.status(403).json({ error: 'No puedes solicitar reportes de otros usuarios' });
    }

    const destinatarioFijo = 'rnm.crea@gmail.com';
    
    console.log(`📤 Generando reporte de ${usuario} para ${destinatarioFijo}`);

    // Construir filtro: usuario + tipo (opcional) + NO enviados manualmente
    let filtro = { 
      usuario: usuario,
      enviadoManual: { $ne: true }
    };
    
    if (tipoConsumo) {
      filtro.tipoConsumo = tipoConsumo;
    }

    // Obtener usos NO enviados del usuario específico
    const usos = await Uso.find(filtro)
      .sort({ fecha: -1 })
      .lean();

    console.log(`📋 Registros encontrados para ${usuario}${tipoConsumo ? ` (${tipoConsumo})` : ''}: ${usos.length}`);

    if (usos.length === 0) {
      const mensaje = tipoConsumo 
        ? `No tienes registros nuevos de tipo "${tipoConsumo}" para reportar`
        : 'No tienes registros nuevos para reportar (todos ya fueron enviados)';
      
      return res.json({ 
        mensaje: mensaje,
        registros: 0
      });
    }

    // Generar archivo CSV
    console.log('📄 Generando archivo CSV...');
    const rutaCSV = generarCSV(usos, tipoConsumo);

    // Verificar que el archivo se generó correctamente
    if (!rutaCSV) {
      throw new Error('La función generarCSV no retornó una ruta válida');
    }
    
    if (!require('fs').existsSync(rutaCSV)) {
      throw new Error(`El archivo CSV generado no existe en la ruta: ${rutaCSV}`);
    }

    const nombreArchivo = require('path').basename(rutaCSV);
    const stats = require('fs').statSync(rutaCSV);
    
    console.log(`✅ CSV generado exitosamente:`);
    console.log(`   📄 Archivo: ${nombreArchivo}`);
    console.log(`   📏 Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   📁 Ruta: ${rutaCSV}`);

    // Construir asunto y mensaje
    let asunto;
    if (tipoConsumo === 'Facturable') {
      asunto = `Solicitud Traspaso a FPM`;
    } else {
      const tipoTexto = tipoConsumo ? ` - ${tipoConsumo}` : '';
      asunto = `Solicitud de${tipoTexto}`;
    }
    
    const cuerpoMensaje = `
📊 **REPORTE PERSONAL DE USUARIO**

👤 **Usuario:** ${usuario}
📂 **Tipo de consumo:** ${tipoConsumo || 'Todos los tipos'}
📅 **Fecha de generación:** ${new Date().toLocaleString('es-CL')}

📈 **RESUMEN:**
• **Total de registros nuevos:** ${usos.length}
• **Último uso registrado:** ${usos[0] ? new Date(usos[0].fecha).toLocaleDateString('es-CL') : 'N/A'}
• **Archivo generado:** ${nombreArchivo}

📧 Generado automáticamente desde StockIt
🔄 **Usuario solicitante:** ${usuario}
    `.trim();

    console.log(`📤 Enviando reporte con archivo adjunto...`);
    
    // Enviar correo con archivo CSV adjunto
    await enviarCorreo(destinatarioFijo, asunto, cuerpoMensaje, rutaCSV, [], req.usuario);

    // Marcar los registros enviados como procesados
    const idsEnviados = usos.map(uso => uso._id);
    await Uso.updateMany(
      { _id: { $in: idsEnviados } },
      { 
        enviadoManual: true,
        fechaEnvioManual: new Date()
      }
    );

    console.log(`✅ Reporte enviado exitosamente y ${idsEnviados.length} registros marcados como enviados`);

    const mensajeRespuesta = tipoConsumo 
      ? `Reporte de ${tipoConsumo} enviado correctamente (${usos.length} registros nuevos)`
      : `Reporte personal enviado correctamente (${usos.length} registros nuevos)`;

    res.json({ 
      mensaje: mensajeRespuesta,
      destinatario: destinatarioFijo,
      usuario: usuario,
      tipoConsumo: tipoConsumo || 'Todos',
      registros: usos.length,
      archivo: {
        nombre: nombreArchivo,
        tamaño: `${(stats.size / 1024).toFixed(2)} KB`,
        tipo: 'CSV'
      },
      registrosNuevos: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error enviando reporte personal:', error);
    res.status(500).json({ 
      error: 'Error al enviar el reporte personal',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;