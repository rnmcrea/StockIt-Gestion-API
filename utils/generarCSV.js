const fs = require('fs');
const path = require('path');

function generarCSV(usos, tipoConsumo = null) {
  console.log(`Generando CSV para ${usos.length} registros${tipoConsumo ? ` de tipo ${tipoConsumo}` : ''}`);
  
  // ============================================
  // AGRUPAR POR CÓDIGO Y SUMAR CANTIDADES
  // ============================================
  const usosAgrupados = {};
  
  usos.forEach(uso => {
    const key = uso.codigo;
    
    if (usosAgrupados[key]) {
      // Si ya existe este código, SUMAR la cantidad
      usosAgrupados[key].cantidad += uso.cantidad;
      
      
      // Actualizar con la fecha más reciente
      if (new Date(uso.fecha) > new Date(usosAgrupados[key].fecha)) {
        usosAgrupados[key].fecha = uso.fecha;
      }
    } else {
      // Si no existe, crear nuevo registro agrupado
      usosAgrupados[key] = {
        codigo: uso.codigo,
        nombre: uso.nombre,
        cliente: uso.cliente,
        cantidad: uso.cantidad,
        tipoConsumo: uso.tipoConsumo || 'N/A',
        fecha: uso.fecha,
      };
    }
  });

  // Convertir objeto a array
  const usosParaCSV = Object.values(usosAgrupados);
  
  console.log(`📦 Registros agrupados: ${usosParaCSV.length}`);
  
  // ============================================
  // GENERAR CSV CON DATOS AGRUPADOS
  // ============================================
  
  // AGREGAR BOM para que Excel reconozca UTF-8 correctamente
  const BOM = '\uFEFF';
  
  // Encabezados del CSV (usando punto y coma para compatibilidad con Excel en español)
  let contenido = BOM + 'CODIGO;REPUESTO;CLIENTE;CANTIDAD TOTAL;TIPO\n';

  // Datos agrupados
  usosParaCSV.forEach(uso => {
    // Función para escapar y limpiar campos CSV
    const limpiarCampo = (campo) => {
      if (!campo) return '';
      // Convertir a string, eliminar saltos de línea y comillas problemáticas
      return String(campo)
        .replace(/[\r\n]/g, ' ') // Reemplazar saltos de línea con espacios
        .replace(/"/g, '""')     // Escapar comillas dobles
        .trim();
    };
    
    const codigo = limpiarCampo(uso.codigo);
    const nombre = limpiarCampo(uso.nombre);
    const cliente = limpiarCampo(uso.cliente);
    const tipo = limpiarCampo(uso.tipoConsumo);
    const cantidad = uso.cantidad || 0;
 
    
    contenido += `"${codigo}";"${nombre}";"${cliente}";"${cantidad}";"${tipo}"\n`;
  });
  
  // Usar zona horaria de Chile para el nombre del archivo
  const ahora = new Date();
  
  // Obtener fecha y hora en zona horaria de Chile (UTC-3)
  const fechaChile = ahora.toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split('-').reverse().join('-'); // De DD-MM-YYYY a YYYY-MM-DD
  
  const horaChile = ahora.toLocaleTimeString('es-CL', {
    timeZone: 'America/Santiago',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/:/g, '-'); // De HH:MM:SS a HH-MM-SS
  
  const nombreArchivo = tipoConsumo ? 
    `Reporte_${tipoConsumo}_${fechaChile}_${horaChile}.csv` : 
    `Reporte_Completo_${fechaChile}_${horaChile}.csv`;
    
  const rutaArchivo = path.join(__dirname, '..', 'tmp', nombreArchivo);
  
  // Crear directorio tmp si no existe
  const dirTmp = path.dirname(rutaArchivo);
  if (!fs.existsSync(dirTmp)) {
    fs.mkdirSync(dirTmp, { recursive: true });
  }
  
  try {
    // Escribir archivo con codificación UTF-8 explícita
    fs.writeFileSync(rutaArchivo, contenido, { encoding: 'utf8' });
    
    console.log(`✅ CSV generado exitosamente: ${nombreArchivo}`);
    console.log(`📍 Ruta: ${rutaArchivo}`);
    console.log(`📦 Líneas en CSV (agrupadas): ${usosParaCSV.length}`);
    
    // Verificar que el archivo se creó correctamente
    const stats = fs.statSync(rutaArchivo);
    console.log(`📏 Tamaño del archivo: ${stats.size} bytes`);
    
    // RETORNAR SOLO LA RUTA (para compatibilidad con código existente)
    return rutaArchivo;
    
  } catch (error) {
    console.error('❌ Error al escribir archivo CSV:', error);
    throw new Error(`No se pudo generar el archivo CSV: ${error.message}`);
  }
}

module.exports = generarCSV;