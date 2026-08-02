const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const autenticar = require('../middleware/auth');
const Usuario = require('../models/Usuario');
const { enviarCorreo } = require('../utils/correoResend');

// 📦 GET - Obtener todo el stock (general + de usuarios) - SOLO ADMIN
router.get('/todos', autenticar, async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ codigo: 1, usuario: 1 });
    res.json(stocks);
  } catch (error) {
    console.error('Error al obtener stocks:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 📦 GET - Obtener solo stock general (sin usuario) - RUTA ORIGINAL
router.get('/', async (req, res) => {
  try {
    const stocks = await Stock.find({ usuario: null }).sort({ codigo: 1 });
    res.json(stocks);
  } catch (error) {
    console.error('Error al obtener stock general:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 👤 GET - NUEVA RUTA: Obtener stock de un usuario específico
router.get('/usuario/:usuario', autenticar, async (req, res) => {
  try {
    const { usuario } = req.params;
    
    // Verificar que el usuario autenticado solo pueda ver su propio stock
    if (req.usuario.nombre !== usuario) {
      return res.status(403).json({ message: 'No tienes permiso para ver este stock' });
    }
    
    const stocks = await Stock.find({ usuario }).sort({ codigo: 1 });
    res.json(stocks);
  } catch (error) {
    console.error('Error al obtener stock del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 🔍 GET - Buscar repuesto por código
router.get('/buscar/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { usuario } = req.query; // Opcional: filtrar por usuario
    
    const filtro = { codigo: { $regex: codigo, $options: 'i' } };
    if (usuario) filtro.usuario = usuario;
    
    const stocks = await Stock.find(filtro).sort({ codigo: 1 });
    res.json(stocks);
  } catch (error) {
    console.error('Error al buscar stock:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ➕ POST - Agregar stock personal
router.post('/personal', autenticar, async (req, res) => {
  try {
    const { codigo, nombre, cantidad } = req.body;
    const usuario = req.usuario.nombre;

    console.log('🔍 Agregando stock personal:', { codigo, nombre, cantidad, usuario });

    if (!codigo || !nombre || cantidad === undefined) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    if (cantidad <= 0) {
      return res.status(400).json({ message: 'La cantidad debe ser mayor a 0' });
    }

    // Verificar si ya existe en el stock del usuario
    const stockExistente = await Stock.findOne({ 
      codigo: codigo.trim(), 
      usuario 
    });

    if (stockExistente) {
      // Si existe, SUMAR la cantidad
      const cantidadAnterior = stockExistente.cantidad;
      stockExistente.cantidad += parseInt(cantidad);
      await stockExistente.save();
      
      console.log(`✅ Cantidad sumada: ${cantidadAnterior} + ${cantidad} = ${stockExistente.cantidad}`);
      
      return res.json({
        message: 'Cantidad sumada al stock existente',
        stock: stockExistente,
        operacion: 'suma',
        cantidadAnterior,
        cantidadSumada: parseInt(cantidad),
        cantidadTotal: stockExistente.cantidad
      });
    }

    // Crear nuevo stock para el usuario
    const nuevoStock = new Stock({
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      cantidad: parseInt(cantidad),
      usuario
    });

    await nuevoStock.save();
    console.log('✅ Nuevo stock creado para usuario:', usuario);
    
    res.status(201).json({
      message: 'Stock personal creado exitosamente',
      stock: nuevoStock,
      operacion: 'crear'
    });

  } catch (error) {
    console.error('❌ Error al agregar stock personal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ➕ POST - Agregar nuevo stock GENERAL
router.post('/', async (req, res) => {
  try {
    const { codigo, nombre, cantidad } = req.body;

    if (!codigo || !nombre || cantidad === undefined) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    if (cantidad < 0) {
      return res.status(400).json({ message: 'La cantidad no puede ser negativa' });
    }

    // Verificar si ya existe en stock general
    const stockExistente = await Stock.findOne({ 
      codigo, 
      usuario: null
    });

    if (stockExistente) {
      return res.status(400).json({ 
        message: 'El repuesto ya existe en el stock general' 
      });
    }

    // Crear nuevo stock general
    const nuevoStock = new Stock({
      codigo,
      nombre,
      cantidad,
      usuario: null
    });

    await nuevoStock.save();
    res.status(201).json(nuevoStock);

  } catch (error) {
    console.error('Error al agregar stock:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 🔄 PUT - Actualizar stock existente
router.put('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cantidad } = req.body;

    if (cantidad < 0) {
      return res.status(400).json({ message: 'La cantidad no puede ser negativa' });
    }

    // Buscar el stock
    const stock = await Stock.findById(id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock no encontrado' });
    }

    // Verificar permisos: el usuario solo puede actualizar su propio stock
    if (stock.usuario && stock.usuario !== req.usuario.nombre) {
      return res.status(403).json({ message: 'No tienes permiso para actualizar este stock' });
    }

    // Actualizar
    stock.nombre = nombre || stock.nombre;
    stock.cantidad = cantidad !== undefined ? cantidad : stock.cantidad;
    await stock.save();

    res.json(stock);

  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET - Historial de transferencias de un usuario
router.get('/transferencias/:usuario', autenticar, async (req, res) => {
  try {
    const { usuario } = req.params;
    
    // Verificar permisos
    if (req.usuario.nombre !== usuario) {
      return res.status(403).json({ message: 'No tienes permiso para ver estas transferencias' });
    }

    const Transferencia = require('../models/Transferencia');
    
    // Obtener transferencias donde el usuario sea origen o destino
    const transferencias = await Transferencia.find({
      $or: [
        { usuarioOrigen: usuario },
        { usuarioDestino: usuario }
      ]
    }).sort({ fecha: -1 }).limit(50);

    res.json(transferencias);
  } catch (error) {
    console.error('Error al obtener transferencias:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST - Transferir stock entre usuarios (CON VARIABLES DE ENTORNO)
router.post('/transferir-personal', autenticar, async (req, res) => {
  try {
    const { codigo, cantidadTransferir, usuarioOrigen, usuarioDestino } = req.body;

    if (!codigo || !cantidadTransferir || !usuarioOrigen || !usuarioDestino) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    if (cantidadTransferir <= 0) {
      return res.status(400).json({ message: 'La cantidad a transferir debe ser mayor a 0' });
    }

    // Verificar que el usuario autenticado sea el origen
    if (req.usuario.nombre !== usuarioOrigen) {
      return res.status(403).json({ message: 'Solo puedes transferir desde tu propio stock' });
    }

    // 1. Buscar stock del usuario origen
    const stockOrigen = await Stock.findOne({ 
      codigo: codigo.trim(), 
      usuario: usuarioOrigen 
    });

    if (!stockOrigen) {
      return res.status(404).json({ message: 'Repuesto no encontrado en tu stock' });
    }

    if (stockOrigen.cantidad < cantidadTransferir) {
      return res.status(400).json({ 
        message: `Stock insuficiente. Disponible: ${stockOrigen.cantidad}, Solicitado: ${cantidadTransferir}` 
      });
    }

    // 2. Reducir cantidad del stock origen
    stockOrigen.cantidad -= cantidadTransferir;
    await stockOrigen.save();

    // 3. Buscar o crear stock del usuario destino
    let stockDestino = await Stock.findOne({ 
      codigo: codigo.trim(), 
      usuario: usuarioDestino 
    });

    if (stockDestino) {
      // Ya existe, sumar cantidad
      stockDestino.cantidad += cantidadTransferir;
      await stockDestino.save();
    } else {
      // No existe, crear nuevo registro para el usuario destino
      stockDestino = new Stock({
        codigo: codigo.trim(),
        nombre: stockOrigen.nombre,
        cantidad: cantidadTransferir,
        usuario: usuarioDestino
      });
      await stockDestino.save();
    }

    // 4. Registrar la transferencia en el historial
    const Transferencia = require('../models/Transferencia');
    const nuevaTransferencia = new Transferencia({
      stockId: stockOrigen._id,
      codigo: codigo.trim(),
      nombre: stockOrigen.nombre,
      cantidad: cantidadTransferir,
      usuarioOrigen: usuarioOrigen,
      usuarioDestino: usuarioDestino,
      motivo: 'Transferencia manual desde app',
      estado: 'completada'
    });
    await nuevaTransferencia.save();

    // 5. Enviar correo usando variables de entorno
    const usuarioData = await Usuario.findOne({ nombre: usuarioOrigen }, 'nombre correo');

    // Leer destinatarios de variables de entorno
    const emailPrincipal = process.env.REPORT_EMAIL_PRINCIPAL || 'rnm.crea@gmail.com';
    const emailsCopia = process.env.REPORT_EMAIL_COPIA 
      ? process.env.REPORT_EMAIL_COPIA.split(',').map(email => email.trim())
      : [];

    const cuerpoTransferencia = `
📦 **SOLICITUD DE TRASPASO DE MALETA**

👤 **Solicitado por:** ${usuarioOrigen}
📂 **Código:** ${codigo}
🔧 **Repuesto:** ${stockOrigen.nombre}
📊 **Cantidad:** ${cantidadTransferir}
👥 **Para:** ${usuarioDestino}

💼 ACCIÓN REQUERIDA:
Favor realizar el traspaso físico del repuesto entre las maletas correspondientes.

📅 **Fecha:** ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
🤖 Generado automáticamente desde StockIt
    `.trim();

    try {
      await enviarCorreo(emailPrincipal, 'Solicitud de Traspaso de Maleta', cuerpoTransferencia, null, emailsCopia, usuarioData);
      console.log(`📧 Notificación enviada a ${emailPrincipal}${emailsCopia.length > 0 ? ` y ${emailsCopia.length} copias` : ''}`);
    } catch (emailError) {
      console.error('Error enviando correo:', emailError);
    }

    console.log(`Transferencia completada: ${usuarioOrigen} -> ${usuarioDestino}, ${cantidadTransferir}x ${codigo}`);

    res.json({
      message: 'Transferencia realizada exitosamente',
      transferencia: {
        id: nuevaTransferencia._id,
        codigo: codigo,
        cantidad: cantidadTransferir,
        origen: usuarioOrigen,
        destino: usuarioDestino
      },
      stockOrigen: {
        id: stockOrigen._id,
        cantidad: stockOrigen.cantidad
      },
      stockDestino: {
        id: stockDestino._id,
        cantidad: stockDestino.cantidad,
        usuario: stockDestino.usuario
      }
    });

  } catch (error) {
    console.error('Error en transferencia personal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 🔄 PUT - Descontar unidades del stock (por defecto 1).
// Acepta { cantidad } en el body para quitar varias de una vez.
router.put('/:id/remove', autenticar, async (req, res) => {
  try {
    const { id } = req.params;
    const aQuitar = parseInt(req.body?.cantidad) || 1;

    const stock = await Stock.findById(id);
    if (!stock) {
      return res.status(404).json({ error: 'Stock no encontrado' });
    }

    // Verificar permisos si es stock de usuario
    if (stock.usuario && stock.usuario !== req.usuario.nombre) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este stock' });
    }

    if (aQuitar <= 0) {
      return res.status(400).json({ error: 'La cantidad a quitar debe ser mayor a 0' });
    }

    if (aQuitar >= stock.cantidad) {
      // Se quitan todas (o más de las que hay) → eliminar por completo
      await Stock.findByIdAndDelete(id);
      res.json({
        eliminado: true,
        mensaje: 'Repuesto eliminado completamente'
      });
    } else {
      // Reducir la cantidad indicada
      stock.cantidad -= aQuitar;
      await stock.save();
      res.json({
        eliminado: false,
        item: stock,
        mensaje: `Cantidad reducida a ${stock.cantidad}`
      });
    }
  } catch (error) {
    console.error('Error al eliminar stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🗑️ DELETE - Eliminar stock completamente
router.delete('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stock = await Stock.findById(id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock no encontrado' });
    }

    // Verificar permisos si es stock de usuario
    if (stock.usuario && stock.usuario !== req.usuario.nombre) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este stock' });
    }
    
    await Stock.findByIdAndDelete(id);
    res.json({ message: 'Stock eliminado correctamente' });
    
  } catch (error) {
    console.error('Error al eliminar stock:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;