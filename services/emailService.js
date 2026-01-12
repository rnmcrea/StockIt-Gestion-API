// services/emailService.js
// Servicio profesional de email con soporte para múltiples estrategias

const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
const { emailConfig, isPublicDomain, getEmailStrategy } = require('../config/email.config');

const resend = new Resend(emailConfig.apiKey);

class EmailService {
  constructor() {
    this.strategy = getEmailStrategy();
    console.log(`📧 Email Service iniciado con estrategia: ${this.strategy.strategy}`);
    if (this.strategy.warning) {
      console.log(`⚠️  ${this.strategy.warning}`);
    }
  }

  /**
   * Envía un email con la estrategia apropiada según la configuración
   */
  async enviar(opciones) {
    const { destinatario, asunto, cuerpo, rutaArchivo, copias = [], usuarioData, bcc = [] } = opciones;

    try {
      console.log("\n📤 ═══════════════════════════════════════");
      console.log(`📧 Estrategia: ${this.strategy.strategy}`);
      console.log(`📧 Para: ${destinatario}`);
      if (copias.length > 0) {
        console.log(`📋 Copias (${copias.length}): ${copias.join(', ')}`);
      }
      if (bcc.length > 0) {
        console.log(`🔒 BCC - Copias ocultas (${bcc.length}): ${bcc.join(', ')}`);
      }

      // Preparar datos base del email
      const emailBase = this.prepararEmailBase(asunto, cuerpo, rutaArchivo, usuarioData);

      let resultado;

      if (this.strategy.useCC) {
        // Estrategia 1: Dominio verificado - Usar CC
        resultado = await this.enviarConCC(destinatario, copias, emailBase, bcc);
      } else {
        // Estrategia 2: Sandbox - Envíos individuales
        resultado = await this.enviarIndividual(destinatario, copias, emailBase, bcc);
      }

      // Limpiar archivo temporal
      this.limpiarArchivo(rutaArchivo);

      console.log("═══════════════════════════════════════\n");
      return resultado;

    } catch (error) {
      console.error("❌ Error en envío de email:", error);
      this.limpiarArchivo(rutaArchivo);
      throw error;
    }
  }

  /**
   * Prepara los datos base del email
   */
  prepararEmailBase(asunto, cuerpo, rutaArchivo, usuarioData) {
    const emailData = {
      from: this.strategy.from,
      replyTo: usuarioData?.correo || emailConfig.domains.stockit.replyTo,
      subject: asunto,
      html: emailConfig.templates.base(emailConfig.templates.reporte(cuerpo))
    };

    // Adjuntar archivo si existe
    if (rutaArchivo && fs.existsSync(rutaArchivo)) {
      const content = fs.readFileSync(rutaArchivo);
      const nombreArchivo = path.basename(rutaArchivo);
      
      emailData.attachments = [{
        filename: nombreArchivo,
        content: content,
      }];
      
      const stats = fs.statSync(rutaArchivo);
      console.log(`📎 Adjunto: ${nombreArchivo} (${(stats.size / 1024).toFixed(2)} KB)`);
    }

    return emailData;
  }

  /**
   * Estrategia 1: Envío con CC (requiere dominio verificado)
   */
  async enviarConCC(destinatario, copias, emailBase, bcc = []) {
    console.log("\n🚀 Enviando con CC (dominio verificado)...");

    const emailData = {
      ...emailBase,
      to: destinatario
    };

    if (copias.length > 0) {
      emailData.cc = copias;
    }
    if (bcc.length > 0) {
      emailData.bcc = bcc;
    }

    try {
      const respuesta = await resend.emails.send(emailData);
      const emailId = respuesta?.data?.id || respuesta?.id;

      console.log(`✅ Email enviado exitosamente`);
      console.log(`   ID: ${emailId}`);
      console.log(`   Destinatarios: ${1 + copias.length}`);

      return {
        success: true,
        id: emailId,
        strategy: 'cc',
        recipients: [destinatario, ...copias],
        totalSent: 1 + copias.length
      };

    } catch (error) {
      console.error(`❌ Error con CC:`, error.message);
      
      // Fallback: Si falla CC, intentar envíos individuales
      console.log(`🔄 Intentando fallback a envíos individuales...`);
      return await this.enviarIndividual(destinatario, copias, emailBase);
    }
  }

  /**
   * Estrategia 2: Envíos individuales (para sandbox o fallback)
   */
  async enviarIndividual(destinatario, copias, emailBase, bcc = []) {
    const todosLosDestinatarios = [destinatario, ...copias];

    if (bcc.length > 0) {
      emailBase.bcc = bcc;
    }
    
    console.log(`\n🚀 Enviando ${todosLosDestinatarios.length} emails individuales...`);

    // Validar dominios en modo sandbox
    if (!this.strategy.useCC) {
      const destinatariosInvalidos = todosLosDestinatarios.filter(email => !isPublicDomain(email));
      
      if (destinatariosInvalidos.length > 0) {
        console.log(`\n⚠️  ADVERTENCIA: Estos emails pueden NO recibirse (dominio no verificado):`);
        destinatariosInvalidos.forEach(email => console.log(`   - ${email}`));
        console.log(`\n💡 Solución: Verifica el dominio en Resend o usa emails de Gmail/Outlook\n`);
      }
    }

    const promesasEnvio = todosLosDestinatarios.map(async (email, index) => {
      const emailData = {
        ...emailBase,
        to: email
      };

      try {
        const respuesta = await resend.emails.send(emailData);
        const emailId = respuesta?.data?.id || respuesta?.id;
        
        console.log(`   ✅ ${index + 1}/${todosLosDestinatarios.length} → ${email} (${emailId})`);
        
        return { 
          email, 
          success: true, 
          id: emailId,
          isPublicDomain: isPublicDomain(email)
        };
      } catch (error) {
        console.error(`   ❌ ${index + 1}/${todosLosDestinatarios.length} → ${email} (${error.message})`);
        
        return { 
          email, 
          success: false, 
          error: error.message 
        };
      }
    });

    const resultados = await Promise.all(promesasEnvio);

    // Resumen
    const exitosos = resultados.filter(r => r.success);
    const fallidos = resultados.filter(r => !r.success);

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Exitosos: ${exitosos.length}/${todosLosDestinatarios.length}`);
    
    if (fallidos.length > 0) {
      console.log(`   ❌ Fallidos: ${fallidos.length}`);
      fallidos.forEach(f => console.log(`      - ${f.email}: ${f.error}`));
    }

    return {
      success: exitosos.length > 0,
      strategy: 'individual',
      results: resultados,
      totalSent: exitosos.length,
      totalFailed: fallidos.length,
      recipients: todosLosDestinatarios
    };
  }

  /**
   * Limpia archivos temporales
   */
  limpiarArchivo(rutaArchivo) {
    if (rutaArchivo && fs.existsSync(rutaArchivo)) {
      try {
        fs.unlinkSync(rutaArchivo);
        console.log("🗑️  Archivo temporal eliminado");
      } catch (error) {
        console.error("⚠️  No se pudo eliminar archivo temporal:", error.message);
      }
    }
  }

  /**
   * Método de utilidad para validar configuración
   */
  static verificarConfiguracion() {
    const { validateConfig } = require('../config/email.config');
    const validacion = validateConfig();

    console.log("\n🔍 VALIDACIÓN DE CONFIGURACIÓN DE EMAIL");
    console.log("═══════════════════════════════════════");

    if (validacion.valid) {
      console.log("✅ Configuración válida");
    } else {
      console.log("❌ Problemas encontrados:");
      validacion.errors.forEach(error => console.log(`   ${error}`));
    }

    const strategy = getEmailStrategy();
    console.log(`\n📧 Estrategia actual: ${strategy.strategy}`);
    console.log(`   Descripción: ${strategy.description}`);
    if (strategy.warning) {
      console.log(`   ⚠️  ${strategy.warning}`);
    }

    console.log("\n💡 Recomendaciones:");
    if (!emailConfig.domains.stockit.verified) {
      console.log("   1. Verifica vorwerk.cl en Resend para envío profesional");
      console.log("   2. O usa un dominio personal verificado");
      console.log("   3. Docs: https://resend.com/docs/dashboard/domains/introduction");
    } else {
      console.log("   ✅ Tu dominio está verificado - configuración óptima");
    }

    console.log("═══════════════════════════════════════\n");

    return validacion;
  }
}

module.exports = EmailService;