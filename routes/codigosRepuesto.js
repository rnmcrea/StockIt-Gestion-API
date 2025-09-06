// routes/codigosRepuesto.js
const express = require('express');
const router = express.Router();
const CodigoRepuesto = require('../models/CodigoRepuesto');

// GET - Obtener todos los cÃ³digos disponibles
router.get('/', async (req, res) => {
  try {
    const codigos = await CodigoRepuesto.find().sort({ codigo: 1 });
    res.json(codigos);
  } catch (error) {
    console.error('Error al obtener cÃ³digos de repuestos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST - Agregar nuevo cÃ³digo (para administrador futuro)
router.post('/', async (req, res) => {
  try {
    const { codigo, nombre } = req.body;
    
    if (!codigo || !nombre) {
      return res.status(400).json({ error: 'CÃ³digo y nombre son requeridos' });
    }

    // Verificar si ya existe
    const existente = await CodigoRepuesto.findOne({ codigo: codigo.trim() });
    if (existente) {
      return res.status(409).json({ error: 'El cÃ³digo ya existe' });
    }

    const nuevoCodigo = new CodigoRepuesto({
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim()
    });

    const guardado = await nuevoCodigo.save();
    res.status(201).json(guardado);
  } catch (error) {
    console.error('Error al crear cÃ³digo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT - Actualizar cÃ³digo existente
router.put('/:id', async (req, res) => {
  try {
    const { codigo, nombre } = req.body;
    
    const actualizado = await CodigoRepuesto.findByIdAndUpdate(
      req.params.id,
      {
        ...(codigo && { codigo: codigo.trim().toUpperCase() }),
        ...(nombre && { nombre: nombre.trim() })
      },
      { new: true }
    );

    if (!actualizado) {
      return res.status(404).json({ error: 'CÃ³digo no encontrado' });
    }

    res.json(actualizado);
  } catch (error) {
    console.error('Error al actualizar cÃ³digo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE - Eliminar cÃ³digo
router.delete('/:id', async (req, res) => {
  try {
    const eliminado = await CodigoRepuesto.findByIdAndDelete(req.params.id);

    if (!eliminado) {
      return res.status(404).json({ error: 'CÃ³digo no encontrado' });
    }

    res.json({ message: 'CÃ³digo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cÃ³digo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;