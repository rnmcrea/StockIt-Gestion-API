const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.get('/usuario', authMiddleware, (req, res) => {
  res.json({ mensaje: `Hola ${req.usuario.nombre}, estás autenticado.` });
});

module.exports = router;
