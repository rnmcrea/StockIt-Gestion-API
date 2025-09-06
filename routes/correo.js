const express = require('express');
const router = express.Router();
const enviarCorreo = require('../utils/correo');
const generarPDF = require('../utils/generarPdf');
const Uso = require('../models/Uso');
const autenticar = require('../middleware/auth');

router.post('/', async (req, res) => {
  try {
    console.log('🚀 Iniciando generación de reporte...');
    
    // SIEMPRE usar las variables de entorno, NO el body de la petición
    const emailPrincipal = process.env.REPORT_EMAIL_PRINCIPAL || 'rnm.crea@gmail.com';
    const emailsCopia = process.env.REPORT_EMAIL_COPIA 
      ? process.env.REPORT_EMAIL_COPIA.split(',').map(email => email.trim())
      : [];

    console.log('📧 Destinatario principal:', emailPrincipal);
    console.log('📧 Destinatarios en copia:', emailsCopia);

    // Validar que los emails sean reales
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailPrincipal)) {
      return res.status(400).json({ 
        error: 'Email principal inválido',
        email: emailPrincipal
      });
    }

    // Validar emails de copia
    for (const email of emailsCopia) {
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: 'Email de copia inválido',
          email: email
        });
      }
    }

    // Calcular rango de fechas (última semana)
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); // lunes
    inicioSemana.setHours(0, 0, 0, 0);

    const finHoy = new Date(hoy);
    finHoy.setHours(23, 59, 59, 999);

    console.log('📅 Rango de fechas:', {
      desde: inicioSemana.toLocaleDateString(),
      hasta: finHoy.toLocaleDateString()
    });

    // Obtener datos de usos
    const usos = await Uso.find({
      fecha: { $gte: inicioSemana, $lte: hoy }
    }).lean();

    console.log(`📊 Registros encontrados: ${usos.length}`);

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

    // Generar PDF
    console.log('📄 Generando PDF...');
    const rutaPDF = generarPDF(usos);

    // Enviar correo al destinatario principal con copias
    const asunto = `📊 Reporte Semanal - StockApp (${inicioSemana.toLocaleDateString()} - ${hoy.toLocaleDateString()})`;
    const cuerpoMensaje = `
Estimado equipo,

Adjunto encontrarás el reporte semanal de uso de repuestos correspondiente al período:
📅 Desde: ${inicioSemana.toLocaleDateString()}
📅 Hasta: ${hoy.toLocaleDateString()}

📊 Total de registros: ${usos.length}

Este reporte se genera automáticamente desde StockApp.

Saludos cordiales,
Sistema StockApp
    `.trim();

    console.log('📤 Enviando a destinatarios configurados...');
    await enviarCorreo(emailPrincipal, asunto, cuerpoMensaje, rutaPDF, emailsCopia);

    console.log('✅ Reporte enviado exitosamente');

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
    console.error('❌ Error generando reporte:', error);
    res.status(500).json({ 
      error: 'Error al enviar el correo',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint para probar configuración de correos
router.get('/test-config', (req, res) => {
  const emailPrincipal = process.env.REPORT_EMAIL_PRINCIPAL || 'rnm.crea@gmail.com';
  const emailsCopia = process.env.REPORT_EMAIL_COPIA 
    ? process.env.REPORT_EMAIL_COPIA.split(',').map(email => email.trim())
    : [];

  // Validar formato de emails
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

// Endpoint de prueba mejorado
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Iniciando prueba de envío...');
    
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());

    const usos = await Uso.find({ fecha: { $gte: inicioSemana, $lte: hoy } }).lean();

    const emailPrincipal = process.env.REPORT_EMAIL_PRINCIPAL || 'rnm.crea@gmail.com';
    const emailsCopia = process.env.REPORT_EMAIL_COPIA 
      ? process.env.REPORT_EMAIL_COPIA.split(',').map(email => email.trim())
      : [];

    console.log('📧 Destinatarios de prueba:', { principal: emailPrincipal, copias: emailsCopia });

    if (usos.length === 0) {
      await enviarCorreo(emailPrincipal, 'Prueba StockApp - Sin datos', 'Correo de prueba. No hay datos para el período actual.', null, emailsCopia);
    } else {
      await enviarCorreo(emailPrincipal, 'Prueba de envío - StockApp', `Correo de prueba con ${usos.length} registros`, null, emailsCopia);
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
    console.error('❌ Error en prueba:', err);
    res.status(500).json({ error: 'Error en prueba', detalles: err.message });
  }
});

// Agregar esta ruta al final de tu archivo correo.js, antes del module.exports
// POST /personal - Enviar reporte personal del usuario
router.post('/personal', autenticar, async (req, res) => {
  try {
    const { destinatario, usuario } = req.body;
    
    console.log(`Solicitud de reporte personal para ${usuario}`);
    
    // Verificar que el usuario solo pueda solicitar su propio reporte
    if (req.usuario.nombre !== usuario) {
      return res.status(403).json({ error: 'No puedes solicitar reportes de otros usuarios' });
    }

    // CAMBIO: Usar destinatario fijo en lugar del que envía el frontend
    const destinatarioFijo = 'rnm.crea@gmail.com';
    
    console.log(`Enviando reporte de ${usuario} a ${destinatarioFijo}`);

    // Obtener usos del usuario específico
    const usos = await Uso.find({ usuario: usuario })
      .sort({ fecha: -1 })
      .limit(100)
      .lean();

    console.log(`Registros encontrados para ${usuario}: ${usos.length}`);

    if (usos.length === 0) {
      return res.json({ 
        mensaje: 'No tienes registros de usos para reportar',
        registros: 0
      });
    }

    // Modificar el asunto para incluir el nombre del usuario
    const asunto = `Reporte Personal de ${usuario} - StockApp`;
    const cuerpoMensaje = `
Reporte personal del usuario: ${usuario}

Total de registros: ${usos.length}
Último uso: ${usos[0] ? new Date(usos[0].fecha).toLocaleDateString() : 'N/A'}

Los primeros 10 registros más recientes:
${usos.slice(0, 10).map((uso, index) => 
  `${index + 1}. ${uso.codigo} - ${uso.nombre} (${uso.cantidad} unidades) - ${new Date(uso.fecha).toLocaleDateString()}`
).join('\n')}

${usos.length > 10 ? `\n... y ${usos.length - 10} registros más.` : ''}

Generado automáticamente desde StockApp.
Usuario solicitante: ${usuario}
    `.trim();

    console.log(`Enviando reporte personal a ${destinatarioFijo}...`);
    
    // Enviar al destinatario fijo
    await enviarCorreo(destinatarioFijo, asunto, cuerpoMensaje, null, []);

    console.log('Reporte personal enviado exitosamente');

    res.json({ 
      mensaje: 'Reporte personal enviado correctamente',
      destinatario: destinatarioFijo, // Mostrar el destinatario real
      usuario: usuario,
      registros: usos.length
    });

  } catch (error) {
    console.error('Error enviando reporte personal:', error);
    res.status(500).json({ 
      error: 'Error al enviar el reporte personal',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;