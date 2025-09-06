const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  codigo: { type: String, required: true }, // Tu campo existente
  nombre: { type: String, required: true }, // Tu campo existente
  cantidad: { type: Number, required: true }, // Tu campo existente
  // NUEVO CAMPO: usuario propietario del stock
  usuario: {
    type: String,
    required: false, // Permitimos null para stock general
    default: null
  }
}, {
  timestamps: true
});

// Ãndice compuesto para bÃºsquedas eficientes
stockSchema.index({ codigo: 1, usuario: 1 });

module.exports = mongoose.model('Stock', stockSchema);
