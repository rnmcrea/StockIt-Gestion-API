// models/CodigoRepuesto.js
const mongoose = require('mongoose');

const codigoSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  nombre: { type: String, required: true }
});

module.exports = mongoose.model('CodigoRepuesto', codigoSchema);