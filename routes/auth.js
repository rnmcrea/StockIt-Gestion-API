const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Usuario = require('../models/Usuario');

const router = express.Router();

// POST /api/auth/registro
router.post('/registro', async (req, res) => {
  const { nombre, correo, password } = req.body;
  
  console.log('ðŸ“ Intento de registro:', { nombre, correo });
  
  // Validaciones bÃ¡sicas
  if (!nombre || !correo || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseÃ±a debe tener al menos 6 caracteres' });
  }

  try {
    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ correo });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El correo ya estÃ¡ registrado' });
    }

    const usuario = new Usuario({ nombre, correo, password });
    await usuario.save();
    
    console.log('âœ… Usuario registrado exitosamente:', correo);
    res.status(201).json({ 
      mensaje: 'Usuario registrado exitosamente',
      usuario: { id: usuario._id, nombre: usuario.nombre, correo: usuario.correo }
    });
  } catch (err) {
    console.error('âŒ Error en registro:', err);
    res.status(400).json({ error: 'No se pudo registrar el usuario' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { correo, password } = req.body;
  console.log('ðŸ“¨ Login con:', correo, password);

  try {
    const usuario = await Usuario.findOne({ correo });
    if (!usuario) {
      console.log('âŒ Usuario no encontrado');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('ðŸ” Password en BD:', usuario.password);

    const valido = await usuario.compararPassword(password);
    console.log('âœ… Â¿ContraseÃ±a vÃ¡lida?', valido);
    
    if (!valido) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: usuario._id, nombre: usuario.nombre}, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    console.log('âœ… Login exitoso para:', usuario.nombre);
    res.json({ 
      token, 
      usuario: { 
        id: usuario._id, 
        nombre: usuario.nombre, 
        correo: usuario.correo 
      } 
    });
  } catch (err) {
    console.error('âŒ Error en login:', err);
    res.status(500).json({ error: 'Error al iniciar sesiÃ³n' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { correo } = req.body;
  
  console.log('ðŸ”‘ Solicitud de recuperaciÃ³n para:', correo);
  
  if (!correo) {
    return res.status(400).json({ error: 'El correo es requerido' });
  }

  try {
    const usuario = await Usuario.findOne({ correo });
    if (!usuario) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({ mensaje: 'Si el correo existe, recibirÃ¡s instrucciones de recuperaciÃ³n' });
    }

    // Generar token de recuperaciÃ³n (vÃ¡lido por 1 hora)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hora

    // Guardar token en la base de datos (necesitarÃ¡s agregar estos campos al modelo Usuario)
    usuario.resetPasswordToken = resetToken;
    usuario.resetPasswordExpires = resetTokenExpiry;
    await usuario.save();

    // AquÃ­ deberÃ­as enviar el email con el token
    // Por ahora, solo lo logueamos para desarrollo
    console.log('ðŸ”‘ Token de recuperaciÃ³n generado:', resetToken);
    console.log('ðŸ“§ Enviar email a:', correo);
    console.log('ðŸ”— Link de recuperaciÃ³n:', `${process.env.FRONTEND_URL}/reset-password/${resetToken}`);

    // TODO: Implementar envÃ­o de email real
    // await enviarEmailRecuperacion(correo, resetToken);

    res.json({ 
      mensaje: 'Si el correo existe, recibirÃ¡s instrucciones de recuperaciÃ³n',
      // En desarrollo, puedes incluir el token para testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });

  } catch (err) {
    console.error('âŒ Error en recuperaciÃ³n:', err);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  console.log('ðŸ” Intento de reset con token:', token);
  
  if (!token || !password) {
    return res.status(400).json({ error: 'Token y nueva contraseÃ±a son requeridos' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseÃ±a debe tener al menos 6 caracteres' });
  }

  try {
    const usuario = await Usuario.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!usuario) {
      return res.status(400).json({ error: 'Token invÃ¡lido o expirado' });
    }

    // Actualizar contraseÃ±a
    usuario.password = password;
    usuario.resetPasswordToken = undefined;
    usuario.resetPasswordExpires = undefined;
    await usuario.save();

    console.log('âœ… ContraseÃ±a actualizada para:', usuario.correo);
    res.json({ mensaje: 'ContraseÃ±a actualizada exitosamente' });

  } catch (err) {
    console.error('âŒ Error en reset:', err);
    res.status(500).json({ error: 'Error al actualizar la contraseÃ±a' });
  }
});

module.exports = router;