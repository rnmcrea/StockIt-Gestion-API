#!/usr/bin/env node
/**
 * Script de Instalación Automática
 * Configura la solución profesional de email en tu proyecto
 * 
 * Uso: node install-email-pro.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🚀 INSTALACIÓN DE EMAIL PROFESIONAL - StockIt\n');
console.log('═══════════════════════════════════════════════\n');

// Rutas
const BASE_DIR = process.cwd();
const CONFIG_DIR = path.join(BASE_DIR, 'config');
const SERVICES_DIR = path.join(BASE_DIR, 'services');
const UTILS_DIR = path.join(BASE_DIR, 'utils');

// Crear directorios si no existen
function crearDirectorio(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Creado: ${path.relative(BASE_DIR, dir)}/`);
  } else {
    console.log(`📁 Existe: ${path.relative(BASE_DIR, dir)}/`);
  }
}

// Función para hacer backup
function hacerBackup(archivo) {
  if (fs.existsSync(archivo)) {
    const backup = `${archivo}.backup-${Date.now()}`;
    fs.copyFileSync(archivo, backup);
    console.log(`   💾 Backup: ${path.basename(backup)}`);
    return true;
  }
  return false;
}

console.log('📂 Creando estructura de carpetas...\n');
crearDirectorio(CONFIG_DIR);
crearDirectorio(SERVICES_DIR);
crearDirectorio(UTILS_DIR);

console.log('\n📝 Copiando archivos...\n');

// Lista de archivos a copiar
const archivos = [
  {
    origen: path.join(__dirname, 'email.config.js'),
    destino: path.join(CONFIG_DIR, 'email.config.js'),
    descripcion: 'Configuración de email'
  },
  {
    origen: path.join(__dirname, 'emailService.js'),
    destino: path.join(SERVICES_DIR, 'emailService.js'),
    descripcion: 'Servicio de email'
  },
  {
    origen: path.join(__dirname, 'correoResend-PRO.js'),
    destino: path.join(UTILS_DIR, 'correoResend.js'),
    descripcion: 'Wrapper de correo (reemplaza el actual)',
    backup: true
  }
];

let exitoso = 0;
let errores = 0;

archivos.forEach(({ origen, destino, descripcion, backup }) => {
  try {
    console.log(`📄 ${descripcion}...`);
    
    // Hacer backup si se solicita y el archivo existe
    if (backup) {
      hacerBackup(destino);
    }
    
    // Copiar archivo
    fs.copyFileSync(origen, destino);
    console.log(`   ✅ ${path.relative(BASE_DIR, destino)}\n`);
    exitoso++;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
    errores++;
  }
});

// Actualizar .env
console.log('⚙️  Configurando variables de entorno...\n');

const envPath = path.join(BASE_DIR, '.env');
const envExamplePath = path.join(BASE_DIR, '.env.example');

// Variables a agregar
const nuevasVariables = `

# ═════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE EMAIL PROFESIONAL
# ═════════════════════════════════════════════════════════════

# 🔐 API Key de Resend (OBLIGATORIO)
RESEND_API_KEY=re_tu_api_key_aqui

# 📧 Configuración de dominio
# Cambia a 'true' cuando tu dominio esté verificado en Resend
EMAIL_DOMAIN_VERIFIED=false

# 📤 Remitente (actualiza con tu dominio cuando esté verificado)
# EMAIL_FROM=StockIt <reportes@tudominio.com>
# EMAIL_REPLY_TO=soporte@tudominio.com

# 📬 Destinatarios de reportes
REPORT_EMAIL_PRINCIPAL=rnm.crea@gmail.com
REPORT_EMAIL_COPIA=roberto.poblete@vorwerk.cl,dmorales@vorwerk.cl

# ═════════════════════════════════════════════════════════════
`;

// Verificar si ya existen las variables
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (!envContent.includes('EMAIL_DOMAIN_VERIFIED')) {
    fs.appendFileSync(envPath, nuevasVariables);
    console.log('✅ Variables agregadas a .env\n');
  } else {
    console.log('ℹ️  Las variables ya existen en .env\n');
  }
} else {
  console.log('⚠️  Archivo .env no encontrado. Créalo manualmente.\n');
}

// Resumen
console.log('═══════════════════════════════════════════════\n');
console.log('📊 RESUMEN DE INSTALACIÓN\n');
console.log(`   ✅ Archivos instalados: ${exitoso}`);
if (errores > 0) {
  console.log(`   ❌ Errores: ${errores}`);
}

console.log('\n🎯 PRÓXIMOS PASOS:\n');
console.log('1. Actualiza tu archivo .env con:');
console.log('   - RESEND_API_KEY (tu API key de Resend)');
console.log('   - EMAIL_FROM (tu dominio cuando esté verificado)');
console.log('   - EMAIL_DOMAIN_VERIFIED=true (cuando esté verificado)\n');

console.log('2. Verifica que tu dominio esté configurado en Resend:');
console.log('   https://resend.com/domains\n');

console.log('3. Reinicia tu servidor:\n');
console.log('   npm run dev\n');

console.log('4. Prueba el envío de emails\n');

console.log('═══════════════════════════════════════════════\n');
console.log('✨ ¡Instalación completada!\n');

// Verificar instalación
console.log('🔍 Para verificar la configuración, ejecuta:');
console.log('   node -e "require(\'./services/emailService\').verificarConfiguracion()"\n');