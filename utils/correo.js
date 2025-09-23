const path = require("path");
const fs = require("fs");
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

async function enviarCorreo(destinatario, asunto, cuerpo, rutaArchivo = null, copias = [], usuarioData = null) {
  try {
    console.log("📤 Preparando envío de correo...");
    console.log("   📧 Para:", destinatario);
    if (copias.length > 0) {
      console.log("   📋 Copias:", copias.join(', '));
    }
    console.log("   📋 Asunto:", asunto);

    // Configuración base del correo
    const mailOptions = {
      from: {
        name: `${usuarioData?.nombre}`,
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: destinatario,
      cc: copias.length > 0 ? copias.join(', ') : undefined,
      subject: asunto,
      text: cuerpo,
      html: `
        <div style="font-family: Verdana, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 24px;">StockIt - Reporte</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 25px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Estimado usuario,</p>
            <p style="color: #333; margin-bottom: 20px;">Adjunto encontrarás la siguiente solicitud.</p>
            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <div style="margin: 0; white-space: pre-wrap; font-family: Verdana; font-size: 13px; color: #444; overflow-x: auto;">${cuerpo.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
            </div>
            ${rutaArchivo ? `
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; border: 1px solid #bbdefb; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2; font-family: Verdana, sans-serif; font-weight: bold;">📎 Archivo adjunto incluido</p>
              <p style="margin: 5px 0 0 0; color: #555; font-family: Verdana, sans-serif; font-size: 14px;">El reporte se encuentra en el archivo adjunto. Puedes abrirlo con Excel o cualquier programa de hojas de cálculo.</p>
            </div>
            ` : ''}
          </div>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Este es un mensaje automático de StockIt. No responder a este correo.<br>
              Generado el ${new Date().toLocaleString('es-CL')}
            </p>
          </div>
        </div>
      `,
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'StockIt System v2.0',
        'Return-Path': process.env.EMAIL_FROM || process.env.EMAIL_USER
      }
    };

    // Manejar archivo adjunto si existe
    if (rutaArchivo) {
      console.log("📎 Procesando archivo adjunto...");
      
      // Verificar que el archivo existe
      if (!fs.existsSync(rutaArchivo)) {
        throw new Error(`❌ El archivo no existe: ${rutaArchivo}`);
      }

      const stats = fs.statSync(rutaArchivo);
      const extension = path.extname(rutaArchivo).toLowerCase();
      const nombreArchivo = path.basename(rutaArchivo);
      
      console.log(`   📄 Archivo: ${nombreArchivo}`);
      console.log(`   📏 Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   🔧 Extensión: ${extension}`);

      // Determinar el tipo MIME correcto
      let contentType;
      let encoding = 'base64'; // Por defecto usar base64 para archivos binarios
      
      switch (extension) {
        case '.csv':
          contentType = 'text/csv';
          encoding = 'utf8'; // CSV puede enviarse como texto
          break;
        case '.xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case '.xls':
          contentType = 'application/vnd.ms-excel';
          break;
        case '.pdf':
          contentType = 'application/pdf';
          break;
        default:
          contentType = 'application/octet-stream';
          console.log(`⚠️ Extensión no reconocida: ${extension}, usando tipo genérico`);
      }

      console.log(`   🏷️ Content-Type: ${contentType}`);
      console.log(`   🔐 Encoding: ${encoding}`);

      // Configurar el adjunto
      mailOptions.attachments = [{
        filename: nombreArchivo,
        path: rutaArchivo,
        contentType: contentType,
        encoding: encoding,
        cid: 'reporte_adjunto' // Content-ID para referenciar en HTML si es necesario
      }];

      console.log("✅ Adjunto configurado correctamente");
    }

    console.log("📤 Enviando correo...");
    const info = await transporter.sendMail(mailOptions);

    // Log detallado del éxito
    console.log("✅ Correo enviado correctamente:");
    console.log("   📧 Message ID:", info.messageId);
    console.log("   ✅ Accepted:", info.accepted?.length || 0, "destinatarios");
    console.log("   ❌ Rejected:", info.rejected?.length || 0, "destinatarios");
    console.log("   📝 Response:", info.response);

    // Limpiar archivo temporal después del envío exitoso
    if (rutaArchivo && fs.existsSync(rutaArchivo)) {
      try {
        fs.unlinkSync(rutaArchivo);
        console.log("🗑️ Archivo temporal eliminado:", path.basename(rutaArchivo));
      } catch (cleanupError) {
        console.warn("⚠️ No se pudo eliminar archivo temporal:", cleanupError.message);
      }
    }

    return info;
    
  } catch (error) {
    console.error("❌ Error enviando correo:", error.message);
    
    // Información específica del error
    if (error.code) {
      console.error("   🔢 Código de error:", error.code);
    }
    if (error.response) {
      console.error("   📝 Respuesta del servidor:", error.response);
    }
    if (error.command) {
      console.error("   ⚡ Comando fallido:", error.command);
    }

    // Limpiar archivo temporal en caso de error
    if (rutaArchivo && fs.existsSync(rutaArchivo)) {
      try {
        fs.unlinkSync(rutaArchivo);
        console.log("🗑️ Archivo temporal eliminado tras error");
      } catch (cleanupError) {
        console.warn("⚠️ No se pudo limpiar archivo temporal:", cleanupError.message);
      }
    }
    
    throw error; // Re-lanzar el error para que el router lo maneje
  }
}

// Función auxiliar para validar configuración de correo
function validarConfiguracion() {
  const configuracion = {
    email_user: !!process.env.EMAIL_USER,
    email_pass: !!process.env.EMAIL_PASS,
    email_from: !!process.env.EMAIL_FROM
  };

  console.log("🔍 Validando configuración de correo:");
  Object.entries(configuracion).forEach(([key, value]) => {
    console.log(`   ${value ? '✅' : '❌'} ${key.toUpperCase()}`);
  });

  return configuracion;
}

// Función de prueba
async function enviarCorreoPrueba(destinatario = 'rnm.crea@gmail.com') {
  try {
    console.log("🧪 Iniciando prueba de correo...");
    
    const mensaje = `
📧 CORREO DE PRUEBA - StockIt
==============================

🕐 Fecha: ${new Date().toLocaleString('es-CL')}
🔧 Sistema: Funcionando correctamente
📊 Estado: Listo para enviar reportes

Esta es una prueba del sistema de correos de StockIt.
Si recibes este mensaje, la configuración está correcta.

¡El sistema está listo para enviar reportes! 🚀
    `.trim();

    await enviarCorreo(
      destinatario,
      '🧪 Prueba StockIt - Sistema de Correos',
      mensaje
    );

    console.log("✅ Prueba de correo completada exitosamente");
    return true;

  } catch (error) {
    console.error("❌ Error en prueba de correo:", error.message);
    return false;
  }
}

module.exports = {
  enviarCorreo,
  validarConfiguracion,
  enviarCorreoPrueba
};