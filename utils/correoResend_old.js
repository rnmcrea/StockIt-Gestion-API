const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarCorreo(destinatario, asunto, cuerpo, rutaArchivo = null, copias = [], usuarioData = null) {
  try {
    console.log("📤 Preparando envío con Resend...");
    console.log("   📧 Destinatario principal:", destinatario);
    if (copias && copias.length > 0) {
      console.log("   📧 Copias:", copias.join(', '));
    }

    // Preparar datos base del email
    const emailBase = {
      from: `${usuarioData?.nombre || 'StockIt'} <onboarding@resend.dev>`,
      replyTo: usuarioData?.correo || undefined,
      subject: asunto,
      html: `
        <div style="font-family: Verdana, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          <div style="background: #0077b6; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 24px;">StockIt - Reporte</h2>
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

    // Manejar archivo adjunto
    let attachmentData = null;
    if (rutaArchivo && fs.existsSync(rutaArchivo)) {
      const content = fs.readFileSync(rutaArchivo);
      const nombreArchivo = path.basename(rutaArchivo);
      
      attachmentData = [{
        filename: nombreArchivo,
        content: content,
      }];
      
      console.log(`   📎 Adjunto: ${nombreArchivo}`);
    }

    // ✅ SOLUCIÓN PARA PLAN FREE: Enviar email individual a cada destinatario
    // Esto evita problemas con CC en dominios no verificados
    
    const todosLosDestinatarios = [destinatario, ...(copias || [])];
    console.log(`\n🚀 Enviando ${todosLosDestinatarios.length} emails individuales...`);
    
    const promesasEnvio = todosLosDestinatarios.map(async (email, index) => {
      const emailData = {
        ...emailBase,
        to: email,
        attachments: attachmentData
      };
      
      try {
        const resultado = await resend.emails.send(emailData);
        const emailId = resultado?.data?.id || resultado?.id || 'sin-id';
        console.log(`   ✅ ${index + 1}/${todosLosDestinatarios.length} - Enviado a ${email} (ID: ${emailId})`);
        return { email, success: true, id: emailId };
      } catch (error) {
        console.error(`   ❌ ${index + 1}/${todosLosDestinatarios.length} - Error enviando a ${email}:`, error.message);
        return { email, success: false, error: error.message };
      }
    });

    const resultados = await Promise.all(promesasEnvio);
    
    // Resumen de envíos
    const exitosos = resultados.filter(r => r.success);
    const fallidos = resultados.filter(r => !r.success);
    
    console.log(`\n📊 Resumen de envíos:`);
    console.log(`   ✅ Exitosos: ${exitosos.length}/${todosLosDestinatarios.length}`);
    if (fallidos.length > 0) {
      console.log(`   ❌ Fallidos: ${fallidos.length}`);
      fallidos.forEach(f => console.log(`      - ${f.email}: ${f.error}`));
    }

    // Limpiar archivo temporal
    if (rutaArchivo && fs.existsSync(rutaArchivo)) {
      fs.unlinkSync(rutaArchivo);
      console.log("\n🗑️ Archivo temporal eliminado");
    }

    // Retornar resultado del primer envío (principal)
    return resultados[0];
    
  } catch (error) {
    console.error("❌ Error general en envío:", error);
    
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