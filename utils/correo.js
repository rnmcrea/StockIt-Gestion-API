const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verificar conexión al inicializar
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Error en configuración de correo:", error);
  } else {
    console.log("✅ Servidor de correo listo para enviar");
  }
});

async function enviarCorreo(destinatario, asunto, cuerpo, archivoPdf, copias = []) {
  try {
    // Configuración mejorada del correo
    const mailOptions = {
      from: {
        name: 'StockApp Sistema',
        address: process.env.EMAIL_FROM
      },
      to: destinatario,
      cc: copias.length > 0 ? copias.join(', ') : undefined, // Agregar copias
      subject: asunto,
      text: cuerpo,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3; text-align: center;">📊 StockApp - Reporte</h2>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
            <p style="color: #333;">Estimado usuario,</p>
            <p style="color: #333;">Adjunto encontrarás el reporte solicitado.</p>
            <pre style="background-color: white; padding: 15px; border-left: 4px solid #2196F3; overflow-x: auto;">${cuerpo}</pre>
          </div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            Este es un mensaje automático de StockApp. No responder a este correo.
          </p>
        </div>
      `,
      attachments: archivoPdf ? [
        {
          filename: "reporte-stockapp.pdf",
          path: archivoPdf,
          contentType: 'application/pdf'
        }
      ] : [],
      // Headers adicionales para evitar spam
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'StockApp System',
        'Return-Path': process.env.EMAIL_FROM
      }
    };

    console.log("📤 Enviando correo a:", destinatario);
    if (copias.length > 0) {
      console.log("📤 Copias a:", copias.join(', '));
    }
    console.log("📋 Asunto:", asunto);
    
    const info = await transporter.sendMail(mailOptions);

    // Log detallado de la respuesta
    console.log("✅ Correo enviado correctamente:");
    console.log("   📧 Message ID:", info.messageId);
    console.log("   ✅ Accepted:", info.accepted);
    console.log("   ❌ Rejected:", info.rejected);
    console.log("   📝 Response:", info.response);

    return info;
    
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    
    // Información específica del error
    if (error.code) {
      console.error("   🔍 Código de error:", error.code);
    }
    if (error.response) {
      console.error("   📝 Respuesta del servidor:", error.response);
    }
    
    throw error; // Re-lanzar el error para que el router lo maneje
  }
}

module.exports = enviarCorreo;