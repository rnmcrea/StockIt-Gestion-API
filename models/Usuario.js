const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Campos para recuperaciÃ³n de contraseÃ±a
  resetPasswordToken: { 
    type: String, 
    default: undefined 
  },
  resetPasswordExpires: { 
    type: Date, 
    default: undefined 
  },
}, {
  timestamps: true // Agrega createdAt y updatedAt automÃ¡ticamente
});

// Encriptar la contraseÃ±a antes de guardar
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// MÃ©todo para comparar contraseÃ±a ingresada
usuarioSchema.methods.compararPassword = function (pass) {
  return bcrypt.compare(pass, this.password);
};

// MÃ©todo para limpiar tokens de reset expirados
usuarioSchema.methods.limpiarTokenReset = function () {
  this.resetPasswordToken = undefined;
  this.resetPasswordExpires = undefined;
  return this.save();
};

// MÃ©todo estÃ¡tico para limpiar tokens expirados de todos los usuarios
usuarioSchema.statics.limpiarTokensExpirados = function () {
  return this.updateMany(
    { resetPasswordExpires: { $lt: new Date() } },
    { 
      $unset: { 
        resetPasswordToken: 1, 
        resetPasswordExpires: 1 
      } 
    }
  );
};

module.exports = mongoose.model('Usuario', usuarioSchema);