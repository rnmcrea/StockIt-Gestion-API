const mongoose = require('mongoose');

const usoSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    trim: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  maquina: {
    type: String,
    required: true,
    trim: true
  },
  lugarUso: {
    type: String,
    required: true,
    trim: true
  },
  cliente: {
    type: String,
    required: true,
    trim: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  usuario: {
    type: String,
    required: true,
    trim: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  tipoConsumo: {
    type: String,
    required: true,
    enum: ['Consumo', 'Facturable'],
    default: 'Consumo'
  },
  enviadoManual: {
    type: Boolean,
    default: false
  },
  fechaEnvioManual: {
    type: Date
  },
  enviadoAutomatico: {
    type: Boolean,
    default: false
  } 
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
usoSchema.index({ usuario: 1, fecha: -1 });
usoSchema.index({ codigo: 1, usuario: 1 });
usoSchema.index({ cliente: 1 });
usoSchema.index({ lugarUso: 1 });

// Método para obtener usos por usuario
usoSchema.statics.obtenerPorUsuario = function(usuario) {
  return this.find({ usuario }).sort({ fecha: -1 });
};

// Método para obtener estadísticas por usuario
usoSchema.statics.estadisticasPorUsuario = function(usuario) {
  return this.aggregate([
    { $match: { usuario } },
    {
      $group: {
        _id: '$codigo',
        totalUsado: { $sum: '$cantidad' },
        ultimoUso: { $max: '$fecha' },
        nombre: { $first: '$nombre' },
        usos: { $sum: 1 }
      }
    },
    { $sort: { totalUsado: -1 } }
  ]);
};

module.exports = mongoose.model('Uso', usoSchema);



