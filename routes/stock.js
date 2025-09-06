const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const nodemailer = require('nodemailer');
const autenticar = require('../middleware/auth'); // Asegúrate de importar el middleware

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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

// 🔍 GET - Buscar repuesto por código (conservando tu lógica)
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

// ➕ POST - NUEVA RUTA: Agregar stock personal (la que necesita StockScreen.js)
router.post('/personal', autenticar, async (req, res) => {
  try {
    const { codigo, nombre, cantidad } = req.body;
    const usuario = req.usuario.nombre; // Del token JWT

    console.log('📝 Agregando stock personal:', { codigo, nombre, cantidad, usuario });

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
      usuario // Asignar al usuario autenticado
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

// ➕ POST - Agregar nuevo stock GENERAL (conservando tu lógica original)
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
      usuario: null // Solo buscar en stock general
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
      usuario: null // Stock general
    });

    await nuevoStock.save();
    res.status(201).json(nuevoStock);

  } catch (error) {
    console.error('Error al agregar stock:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 🔄 PUT - Actualizar stock existente (conservando tu lógica)
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

// POST - Transferir stock entre usuarios (MEJORADA CON REGISTRO DE TRANSFERENCIA)
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

    // 4. NUEVO: Registrar la transferencia en el historial
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

    // 5. Enviar correo de notificación (opcional)
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'rnm.crea@gmail.com', // Usar tu email fijo
      subject: `Transferencia de Repuesto - ${codigo}`,
      html: `
        <h2>Transferencia de Repuesto Completada</h2>
        <p><strong>Código:</strong> ${codigo}</p>
        <p><strong>Repuesto:</strong> ${stockOrigen.nombre}</p>
        <p><strong>Cantidad transferida:</strong> ${cantidadTransferir}</p>
        <p><strong>De:</strong> ${usuarioOrigen}</p>
        <p><strong>Para:</strong> ${usuarioDestino}</p>
        <hr>
        <p><strong>Stock restante origen:</strong> ${stockOrigen.cantidad}</p>
        <p><strong>Stock destino:</strong> ${stockDestino.cantidad}</p>
        <p><em>Fecha: ${new Date().toLocaleString('es-CL')}</em></p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
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

// MANTENER TUS RUTAS EXISTENTES PARA COMPATIBILIDAD

// Transferir del stock general (tu ruta original)
router.post('/transferir', async (req, res) => {
  try {
    const { codigo, cantidadTransferir, usuarioDestino } = req.body;

    if (!codigo || !cantidadTransferir || !usuarioDestino) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    if (cantidadTransferir <= 0) {
      return res.status(400).json({ message: 'La cantidad a transferir debe ser mayor a 0' });
    }

    // 1. Buscar stock general
    const stockGeneral = await Stock.findOne({ 
      codigo, 
      usuario: null 
    });

    if (!stockGeneral) {
      return res.status(404).json({ message: 'Repuesto no encontrado en stock general' });
    }

    if (stockGeneral.cantidad < cantidadTransferir) {
      return res.status(400).json({ 
        message: `Stock insuficiente. Disponible: ${stockGeneral.cantidad}, Solicitado: ${cantidadTransferir}` 
      });
    }

    // 2. Reducir cantidad del stock general
    stockGeneral.cantidad -= cantidadTransferir;
    await stockGeneral.save();

    // 3. Buscar o crear stock del usuario
    let stockUsuario = await Stock.findOne({ 
      codigo, 
      usuario: usuarioDestino 
    });

    if (stockUsuario) {
      // Ya existe, sumar cantidad
      stockUsuario.cantidad += cantidadTransferir;
      await stockUsuario.save();
    } else {
      // No existe, crear nuevo registro
      stockUsuario = new Stock({
        codigo: stockGeneral.codigo,
        nombre: stockGeneral.nombre,
        cantidad: cantidadTransferir,
        usuario: usuarioDestino
      });
      await stockUsuario.save();
    }

    // 4. Enviar correo de notificación
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'bodega@empresa.com',
      subject: `Transferencia de Repuesto - ${codigo}`,
      html: `
        <h2>Transferencia de Repuesto</h2>
        <p><strong>Código:</strong> ${codigo}</p>
        <p><strong>Repuesto:</strong> ${stockGeneral.nombre}</p>
        <p><strong>Cantidad transferida:</strong> ${cantidadTransferir}</p>
        <p><strong>Usuario destino:</strong> ${usuarioDestino}</p>
        <hr>
        <p><strong>Stock restante general:</strong> ${stockGeneral.cantidad}</p>
        <p><strong>Stock del usuario:</strong> ${stockUsuario.cantidad}</p>
        <p><em>Fecha: ${new Date().toLocaleString('es-CL')}</em></p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Error enviando correo:', emailError);
    }

    res.json({
      message: 'Transferencia realizada exitosamente',
      stockGeneral: {
        id: stockGeneral._id,
        cantidad: stockGeneral.cantidad
      },
      stockUsuario: {
        id: stockUsuario._id,
        cantidad: stockUsuario.cantidad,
        usuario: stockUsuario.usuario
      }
    });

  } catch (error) {
    console.error('Error en transferencia:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 🔄 PUT - Eliminar una unidad (tu ruta actual)
router.put('/:id/remove', autenticar, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stock = await Stock.findById(id);
    if (!stock) {
      return res.status(404).json({ error: 'Stock no encontrado' });
    }

    // Verificar permisos si es stock de usuario
    if (stock.usuario && stock.usuario !== req.usuario.nombre) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este stock' });
    }
    
    if (stock.cantidad <= 1) {
      // Eliminar completamente si solo queda 1
      await Stock.findByIdAndDelete(id);
      res.json({ 
        eliminado: true, 
        mensaje: 'Repuesto eliminado completamente' 
      });
    } else {
      // Reducir cantidad en 1
      stock.cantidad -= 1;
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