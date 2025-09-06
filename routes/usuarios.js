// routes/usuarios.js
const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');

// GET - Obtener todos los usuarios para transferencias (sin contraseÃ±as)
router.get('/', async (req, res) => {
  try {
    // Solo obtener nombre y correo, sin password ni tokens de reset
    const usuarios = await Usuario.find({}, 'nombre correo createdAt')
      .sort({ nombre: 1 });
    
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET - Obtener usuarios activos (si tienes un campo activo)
router.get('/activos', async (req, res) => {
  try {
    // Filtramos usuarios que no tengan tokens de reset activos (usuarios "activos")
    const usuarios = await Usuario.find({
      $or: [
        { resetPasswordExpires: { $exists: false } },
        { resetPasswordExpires: { $lt: new Date() } }
      ]
    }, 'nombre correo createdAt')
      .sort({ nombre: 1 });
    
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios activos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET - Buscar usuarios por nombre (Ãºtil para autocompletar)
router.get('/buscar/:termino', async (req, res) => {
  try {
    const { termino } = req.params;
    
    if (!termino || termino.length < 2) {
      return res.status(400).json({ error: 'El tÃ©rmino de bÃºsqueda debe tener al menos 2 caracteres' });
    }

    const usuarios = await Usuario.find({
      nombre: { $regex: termino, $options: 'i' }
    }, 'nombre correo')
      .limit(10) // Limitar resultados para mejor rendimiento
      .sort({ nombre: 1 });
    
    res.json(usuarios);
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET - Obtener informaciÃ³n bÃ¡sica de un usuario especÃ­fico
router.get('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id, 'nombre correo createdAt');
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Nota: Para crear, actualizar o eliminar usuarios, usar las rutas de auth.js
// Este archivo es solo para consultas seguras de usuarios para transferencias

module.exports = router;

// ============================================
// En tu app.js - Agregar esta lÃ­nea:
// app.use('/api/usuarios', require('./routes/usuarios'));