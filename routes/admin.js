const express = require('express');
const router = express.Router();
const Uso = require('../models/Uso');
const Stock = require('../models/Stock');
const Usuario = require('../models/Usuario');
const autenticar = require('../middleware/auth');
const soloAdmin = require('../middleware/soloAdmin');

// Todas las rutas de admin requieren estar autenticado Y ser supervisor
router.use(autenticar, soloAdmin);

// Parsea 'YYYY-MM-DD' a Date local (inicio o fin del día)
function parseFecha(valor, finDelDia = false) {
  if (!valor) return null;
  const [y, m, d] = String(valor).split('-').map(Number);
  if (!y || !m || !d) return null;
  return finDelDia
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
}

// GET /api/admin/tecnicos - lista de técnicos (para el filtro)
router.get('/tecnicos', async (req, res) => {
  try {
    const tecnicos = await Usuario.find({ rol: { $ne: 'admin' } }, 'nombre correo')
      .sort({ nombre: 1 })
      .lean();
    res.json(tecnicos);
  } catch (error) {
    console.error('❌ Error al listar técnicos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/admin/usos?tecnico=&desde=&hasta= - usos de todos (o de un técnico) por rango de fechas
router.get('/usos', async (req, res) => {
  try {
    const { tecnico, desde, hasta } = req.query;

    const filtro = {};
    if (tecnico) filtro.usuario = tecnico;

    const fDesde = parseFecha(desde, false);
    const fHasta = parseFecha(hasta, true);
    if (fDesde || fHasta) {
      filtro.fecha = {};
      if (fDesde) filtro.fecha.$gte = fDesde;
      if (fHasta) filtro.fecha.$lte = fHasta;
    }

    const usos = await Uso.find(filtro).sort({ fecha: -1 }).lean();

    const totalUnidades = usos.reduce((acc, u) => acc + (u.cantidad || 0), 0);

    res.json({
      total: usos.length,
      totalUnidades,
      usos
    });
  } catch (error) {
    console.error('❌ Error al obtener usos (admin):', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/admin/resumen-mensual?year=&month= - ranking de repuestos usados en el mes (todos los técnicos)
router.get('/resumen-mensual', async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1); // 1-12

    const inicio = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const fin = new Date(year, month, 0, 23, 59, 59, 999); // último día del mes

    const items = await Uso.aggregate([
      { $match: { fecha: { $gte: inicio, $lte: fin } } },
      {
        $group: {
          _id: '$codigo',
          nombre: { $first: '$nombre' },
          total: { $sum: '$cantidad' },
          consumo: { $sum: { $cond: [{ $eq: ['$tipoConsumo', 'Consumo'] }, '$cantidad', 0] } },
          facturable: { $sum: { $cond: [{ $eq: ['$tipoConsumo', 'Facturable'] }, '$cantidad', 0] } },
          registros: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const totalGeneral = items.reduce((acc, i) => acc + (i.total || 0), 0);

    res.json({
      periodo: { year, month },
      totalGeneral,
      totalRepuestos: items.length,
      items: items.map(i => ({
        codigo: i._id,
        nombre: i.nombre,
        total: i.total,
        consumo: i.consumo,
        facturable: i.facturable,
        registros: i.registros
      }))
    });
  } catch (error) {
    console.error('❌ Error en resumen mensual (admin):', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/admin/stock-tecnicos - stock actual agrupado por técnico
router.get('/stock-tecnicos', async (req, res) => {
  try {
    const stocks = await Stock.find({ usuario: { $ne: null } })
      .sort({ usuario: 1, codigo: 1 })
      .lean();

    const porTecnico = {};
    for (const s of stocks) {
      if (!porTecnico[s.usuario]) {
        porTecnico[s.usuario] = { usuario: s.usuario, items: [], totalItems: 0, totalUnidades: 0 };
      }
      porTecnico[s.usuario].items.push({ codigo: s.codigo, nombre: s.nombre, cantidad: s.cantidad });
      porTecnico[s.usuario].totalItems += 1;
      porTecnico[s.usuario].totalUnidades += (s.cantidad || 0);
    }

    const resultado = Object.values(porTecnico).sort((a, b) => a.usuario.localeCompare(b.usuario));
    res.json(resultado);
  } catch (error) {
    console.error('❌ Error en stock por técnico (admin):', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
