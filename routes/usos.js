const express = require('express');
const router = express.Router();
const Uso = require('../models/Uso');
const Stock = require('../models/Stock');
const autenticar = require('../middleware/auth');

// POST - Registrar nuevo uso de repuesto
router.post('/', autenticar, async (req, res) => {
  try {
    const { codigo, nombre, maquina, lugarUso, cliente, cantidad } = req.body;
    const usuario = req.usuario.nombre; // Del token JWT

    console.log('📝 Registrando uso:', { codigo, nombre, maquina, lugarUso, cliente, cantidad, usuario });

    if (!codigo || !maquina || !lugarUso || !cliente || !cantidad) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }

    // Buscar el repuesto en el stock personal del usuario
    const stockPersonal = await Stock.findOne({ 
      codigo: codigo.trim(), 
      usuario: usuario 
    });

    if (!stockPersonal) {
      return res.status(404).json({ error: 'No tienes este repuesto en tu stock personal' });
    }

    if (stockPersonal.cantidad < cantidad) {
      return res.status(400).json({ 
        error: `Stock insuficiente. Disponible: ${stockPersonal.cantidad}, Solicitado: ${cantidad}` 
      });
    }

    // Crear registro de uso
    const nuevoUso = new Uso({
      codigo: codigo.trim(),
      nombre: nombre || stockPersonal.nombre,
      maquina: maquina.trim(),
      lugarUso: lugarUso.trim(),
      cliente: cliente.trim(),
      cantidad: parseInt(cantidad),
      usuario: usuario,
      fecha: new Date()
    });

    await nuevoUso.save();

    // Reducir el stock personal
    stockPersonal.cantidad -= parseInt(cantidad);
    if (stockPersonal.cantidad <= 0) {
      // Si queda en 0, eliminar completamente
      await Stock.findByIdAndDelete(stockPersonal._id);
    } else {
      await stockPersonal.save();
    }

    console.log('✅ Uso registrado exitosamente:', {
      codigo: nuevoUso.codigo,
      usuario: nuevoUso.usuario,
      stockRestante: stockPersonal.cantidad
    });

    res.status(201).json({
      message: 'Uso registrado exitosamente',
      uso: nuevoUso,
      stockRestante: stockPersonal.cantidad
    });

  } catch (error) {
    console.error('❌ Error al registrar uso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET - Obtener usos de un usuario específico
router.get('/usuario/:usuario', autenticar, async (req, res) => {
  try {
    const { usuario } = req.params;
    
    // Verificar que el usuario autenticado solo pueda ver sus propios usos
    if (req.usuario.nombre !== usuario) {
      return res.status(403).json({ error: 'No tienes permiso para ver estos usos' });
    }

    const usos = await Uso.find({ usuario })
      .sort({ fecha: -1 }) // Más recientes primero
      .lean();

    console.log(`📊 Usos encontrados para ${usuario}:`, usos.length);
    res.json(usos);

  } catch (error) {
    console.error('❌ Error al obtener usos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET - Obtener todos los usos (solo para administradores)
router.get('/', autenticar, async (req, res) => {
  try {
    // Por ahora, cualquier usuario autenticado puede ver todos los usos
    // Puedes agregar validación de rol de administrador aquí si lo necesitas
    
    const usos = await Uso.find()
      .sort({ fecha: -1 })
      .lean();

    console.log(`📊 Total de usos encontrados:`, usos.length);
    res.json(usos);

  } catch (error) {
    console.error('❌ Error al obtener todos los usos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET - Obtener estadísticas de uso por usuario
router.get('/estadisticas/:usuario', autenticar, async (req, res) => {
  try {
    const { usuario } = req.params;
    
    if (req.usuario.nombre !== usuario) {
      return res.status(403).json({ error: 'No tienes permiso para ver estas estadísticas' });
    }

    const estadisticas = await Uso.aggregate([
      { $match: { usuario: usuario } },
      {
        $group: {
          _id: '$codigo',
          totalUsado: { $sum: '$cantidad' },
          ultimoUso: { $max: '$fecha' },
          nombre: { $first: '$nombre' }
        }
      },
      { $sort: { totalUsado: -1 } }
    ]);

    res.json(estadisticas);

  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE - Eliminar un uso (solo el propietario)
router.delete('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;
    
    const uso = await Uso.findById(id);
    if (!uso) {
      return res.status(404).json({ error: 'Uso no encontrado' });
    }

    // Verificar que el usuario sea el propietario
    if (uso.usuario !== req.usuario.nombre) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este uso' });
    }

    await Uso.findByIdAndDelete(id);
    
    console.log(`🗑️ Uso eliminado por ${req.usuario.nombre}:`, id);
    res.json({ message: 'Uso eliminado correctamente' });

  } catch (error) {
    console.error('❌ Error al eliminar uso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;