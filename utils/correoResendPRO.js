// utils/correoResend.js
// Wrapper que usa el servicio profesional de email

const EmailService = require('../services/emailService');

const emailService = new EmailService();

/**
 * Función de compatibilidad con la interfaz existente
 * @param {string} destinatario - Email del destinatario principal
 * @param {string} asunto - Asunto del correo
 * @param {string} cuerpo - Cuerpo del mensaje
 * @param {string} rutaArchivo - Ruta al archivo adjunto (opcional)
 * @param {Array} copias - Array de emails en copia (opcional)
 * @param {Object} usuarioData - Datos del usuario (nombre, correo)
 */
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
  EmailService // Exportar también la clase para uso avanzado
};