// config/email.config.js
// Configuración centralizada de email para múltiples proyectos

require('dotenv').config();

const emailConfig = {
  // Proveedor de email
  provider: 'resend',
  
  // Credenciales
  apiKey: process.env.RESEND_API_KEY,
  
  // Configuración de dominios por proyecto
  domains: {
    stockit: {
      // Opción A: Dominio corporativo verificado
      verified: process.env.EMAIL_DOMAIN_VERIFIED === 'true',
      from: process.env.EMAIL_FROM || 'StockIt <noreply@vorwerk.cl>',
      replyTo: process.env.EMAIL_REPLY_TO,
      
      // Opción B: Dominio sandbox (desarrollo)
      sandbox: {
        from: 'StockIt <onboarding@resend.dev>',
        limitedTo: ['gmail.com', 'outlook.com', 'hotmail.com'] // Solo estos dominios en sandbox
      }
    },
    
    // Configuración para otros proyectos futuros
    otroProyecto: {
      verified: false,
      from: 'Otro Proyecto <noreply@tudominio.com>',
      replyTo: 'soporte@tudominio.com'
    }
  },
  
  // Configuración de reintentos
  retry: {
    attempts: 3,
    delay: 1000, // ms
    backoff: 2 // multiplicador exponencial
  },
  
  // Límites del plan Free de Resend
  limits: {
    free: {
      emailsPerDay: 100,
      emailsPerMonth: 3000,
      requiresDomainVerification: true,
      sandboxModeRestrictions: true
    }
  },
  
  // Templates de email
  templates: {
    base: (content) => `
      <div style="font-family: Verdana, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="background: #0077b6; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 24px;">StockIt - Reporte</h2>
        </div>
        <div style="background-color: #f9f9f9; padding: 25px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          ${content}
        </div>
      </div>
    `,
    
    reporte: (cuerpo) => `
      <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Estimado usuario,</p>
      <p style="color: #333; margin-bottom: 20px;">Adjunto encontrarás la siguiente solicitud.</p>
      <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div style="margin: 0; white-space: pre-wrap; font-family: Verdana; font-size: 13px; color: #444;">
          ${cuerpo.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
        </div>
      </div>
    `
  }
};

// Validación de configuración
function validateConfig() {
  const errors = [];
  
  if (!emailConfig.apiKey) {
    errors.push('❌ RESEND_API_KEY no está configurada en .env');
  }
  
  if (!emailConfig.domains.stockit.verified && process.env.NODE_ENV === 'production') {
    errors.push('⚠️  El dominio no está verificado. Los emails a dominios corporativos pueden fallar.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: errors.filter(e => e.startsWith('⚠️'))
  };
}

// Helper para determinar si un email es de dominio público
function isPublicDomain(email) {
  const publicDomains = [
    'gmail.com', 'googlemail.com',
    'outlook.com', 'hotmail.com', 'live.com',
    'yahoo.com', 'icloud.com',
    'protonmail.com', 'mail.com'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return publicDomains.includes(domain);
}

// Estrategia de envío según configuración
function getEmailStrategy() {
  const config = emailConfig.domains.stockit;
  
  if (config.verified) {
    return {
      strategy: 'verified-domain',
      description: 'Dominio verificado - Envío directo con CC',
      useCC: true,
      from: config.from
    };
  } else {
    return {
      strategy: 'sandbox-mode',
      description: 'Modo sandbox - Envíos individuales',
      useCC: false,
      from: config.sandbox.from,
      warning: 'Solo funcionará con dominios públicos (Gmail, Outlook, etc.)'
    };
  }
}

module.exports = {
  emailConfig,
  validateConfig,
  isPublicDomain,
  getEmailStrategy
};