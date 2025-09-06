const jwt = require('jsonwebtoken');

module.exports = function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token no proporcionado o mal formado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // Aquí se asigna el payload del token
    next();
  } catch (err) {
    return res.status(403).json({ mensaje: 'Token inválido' });
  }
};
