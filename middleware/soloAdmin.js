const Usuario = require('../models/Usuario');

// Middleware que exige rol 'admin'. Debe ejecutarse DESPUÉS de `autenticar`
// (usa req.usuario del token). Verifica el rol contra la base de datos para
// que funcione aunque el token sea antiguo o el rol haya cambiado.
module.exports = async function soloAdmin(req, res, next) {
  try {
    if (!req.usuario || !req.usuario.id) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const usuario = await Usuario.findById(req.usuario.id).select('rol nombre');
    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a supervisores' });
    }

    next();
  } catch (err) {
    console.error('❌ Error en soloAdmin:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
