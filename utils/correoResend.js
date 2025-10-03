const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarCorreo(destinatario, asunto, cuerpo, rutaArchivo = null, copias = [], usuarioData = null) {
  try {
    console.log("📤 Preparando envío con Resend...");
    console.log("   📧 Para:", destinatario);

    const emailData = {
      from: `${usuarioData?.nombre || 'StockIt'} <onboarding@resend.dev>`,
      replyTo: usuarioData?.correo || undefined,
      to: destinatario,
      subject: asunto,
      html: `
        <div style="font-family: Verdana, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 24px;">📊 StockIt - Reporte</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 25px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Estimado usuario,</p>
            <p style="color: #333; margin-bottom: 20px;">Adjunto encontrarás la siguiente solicitud.</p>
            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <div style="margin: 0; white-space: pre-wrap; font-family: Verdana; font-size: 13px; color: #444;">${cuerpo.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
            </div>
          </div>
        </div>
      `,
    };

    console.log("👤 Usuario data completo:", JSON.stringify(usuarioData, null, 2));
    console.log("📧 Reply-To configurado:", emailData.replyTo);
    console.log("📤 Email data completo:", JSON.stringify(emailData, null, 2));

    // Manejar archivo adjunto
    if (rutaArchivo && fs.existsSync(rutaArchivo)) {
      const content = fs.readFileSync(rutaArchivo);
      const nombreArchivo = path.basename(rutaArchivo);
      
      emailData.attachments = [{
        filename: nombreArchivo,
        content: content,
      }];
      
      console.log(`   📎 Adjunto: ${nombreArchivo}`);
    }

    const data = await resend.emails.send(emailData);
    
    console.log("✅ Correo enviado con Resend:", data.id);

    // Limpiar archivo temporal
    if (rutaArchivo && fs.existsSync(rutaArchivo)) {
      fs.unlinkSync(rutaArchivo);
      console.log("🗑️ Archivo temporal eliminado");
    }

    return data;
    
  } catch (error) {
    console.error("❌ Error enviando con Resend:", error);
    
    // Limpiar en caso de error
    if (rutaArchivo && fs.existsSync(rutaArchivo)) {
      fs.unlinkSync(rutaArchivo);
    }
    
    throw error;
  }
}

module.exports = {
  enviarCorreo
};