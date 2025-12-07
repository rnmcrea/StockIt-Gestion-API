// utils/correoResend.js
const EmailService = require('../services/emailService');

const emailService = new EmailService();

async function enviarCorreo(destinatario, asunto, cuerpo, rutaArchivo = null, copias = [], usuarioData = null) {
  return await emailService.enviar({
    destinatario,
    asunto,
    cuerpo,
    rutaArchivo,
    copias,
    usuarioData
  });
}

module.exports = {
  enviarCorreo,
  EmailService
};