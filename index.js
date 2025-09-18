require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

app.use(cors());
app.use(express.json());

// Rutas de la API - CONFIGURACIÓN CORREGIDA
const correoRoutes = require('./routes/correo');
app.use('/api/correo', correoRoutes); // ← CAMBIÉ de '/api/enviar-correo' a '/api/correo'

const usosRouter = require('./routes/usos');
app.use('/api/usos', usosRouter);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const protegidaRoutes = require('./routes/protegida');
app.use('/api/protegida', protegidaRoutes);

const stockRoutes = require('./routes/stock');
app.use('/api/stock', stockRoutes);

app.use('/api/codigos', require('./routes/codigosRepuesto'));

app.use('/api/usuarios', require('./routes/usuarios'));

// Ruta básica
app.get('/', (req, res) => {
  res.json({ 
    mensaje: 'API funcionando correctamente',
    endpoints: {
      correo: '/api/correo',
      usos: '/api/usos',
      auth: '/api/auth',
      stock: '/api/stock'
    }
  });
});

// Endpoint para debugging - ver todas las rutas disponibles
app.get('/debug/routes', (req, res) => {
  const routes = [];
  
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      const basePath = middleware.regexp.source
        .replace('\\', '')
        .replace('^', '')
        .replace('$', '')
        .replace('\\/', '/')
        .replace('(?=', '')
        .replace(')', '')
        .replace('?', '');
      
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: basePath + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.json({ 
    total_rutas: routes.length,
    rutas_disponibles: routes,
    correos_especificamente: [
      'GET /api/correo/test-config',
      'GET /api/correo/test', 
      'POST /api/correo'
    ]
  });
});

// ⚠️ RUTA LEGACY - mantener por compatibilidad pero marcar como deprecated
app.get('/enviar-reporte', async (req, res) => {
  console.log('⚠️  ADVERTENCIA: Esta ruta está deprecated. Usar /api/correo');
  
  const doc = new PDFDocument();
  const tmpDir = path.join(__dirname, 'tmp');

  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }

  const pdfPath = path.join(tmpDir, 'reporte.pdf');
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Contenido del PDF
  doc.fontSize(18).text("Reporte de Stock", { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text("Este es un ejemplo de reporte generado automáticamente.");
  doc.end();

  writeStream.on('finish', async () => {
    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"Stock App" <${process.env.EMAIL_FROM}>`,
        to: "roberto.poblete@vorwerk.cl",
        subject: "Reporte de Stock",
        text: "Adjunto encontrarás el reporte en formato PDF.",
        attachments: [
          {
            filename: "reporte.pdf",
            path: pdfPath,
          },
        ],
      });

      console.log("✅ Correo enviado:", info.messageId);
      res.json({
        mensaje: "📤 Reporte generado y enviado por correo (ruta legacy)",
        messageId: info.messageId,
        recomendacion: "Usar /api/correo para nuevos desarrollos"
      });
    } catch (error) {
      console.error("❌ Error al enviar correo:", error);
      res.status(500).json({ 
        error: "Error al enviar el correo",
        detalles: error.message
      });
    }
  });
});

// Tareas programadas
require('./cronJobs/enviarReporte');

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB');
    console.log(`🚀 Servidor iniciando en puerto ${PORT}`);
    
    app.listen(PORT, () => {
      console.log(`📍 Servidor corriendo en: http://localhost:${PORT}`);
      console.log(`📧 Rutas de correo disponibles:`);
      console.log(`   GET  http://localhost:${PORT}/api/correo/test-config`);
      console.log(`   GET  http://localhost:${PORT}/api/correo/test`);
      console.log(`   POST http://localhost:${PORT}/api/correo`);
      console.log(`🔧 Debug: http://localhost:${PORT}/debug/routes`);
    });
  })
  .catch((err) => console.error('❌ Error conectando a MongoDB:', err));