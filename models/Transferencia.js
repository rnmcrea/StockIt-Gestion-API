const mongoose = require('mongoose');

const TransferenciaSchema = new mongoose.Schema({
  stockId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },
  codigo: {
    type: String,
    required: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  usuarioOrigen: {
    type: String, // Puede ser ObjectId si tienes modelo User
    required: true
  },
  usuarioDestino: {
    type: String, // Puede ser ObjectId si tienes modelo User
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  motivo: {
    type: String,
    default: 'Transferencia manual'
  },
  estado: {
    type: String,
    enum: ['completada', 'pendiente', 'cancelada'],
    default: 'completada'
  }
}, {
  timestamps: true
});

// Ãndices para optimizar consultas
TransferenciaSchema.index({ usuarioOrigen: 1, fecha: -1 });
TransferenciaSchema.index({ usuarioDestino: 1, fecha: -1 });
TransferenciaSchema.index({ codigo: 1, fecha: -1 });

module.exports = mongoose.model('Transferencia', TransferenciaSchema);