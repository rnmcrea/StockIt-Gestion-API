// utils/correoResend.js
const EmailService = require('../services/emailService');

const emailService = new EmailService();

async function enviarCorreo(destinatario, asunto, cuerpo, rutaArchivo = null, copias = [], usuarioData = null, bcc = []) {
  return await emailService.enviar({
    destinatario,
    asunto,
    cuerpo,
    rutaArchivo,
    copias,
    usuarioData,
    bcc
  });
}

module.exports = {
  enviarCorreo,
  EmailService
};