// Script de diagnóstico para Resend
// Ejecutar con: node test-resend-debug.js

require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResendConfiguration() {
  console.log('🔍 DIAGNÓSTICO DE RESEND\n');
  console.log('================================\n');
  
  // 1. Verificar API Key
  console.log('1️⃣ Verificando API Key...');
  if (!process.env.RESEND_API_KEY) {
    console.log('❌ RESEND_API_KEY no está definida en .env');
    return;
  }
  console.log('✅ API Key encontrada:', process.env.RESEND_API_KEY.substring(0, 10) + '...');
  console.log('');

  // 2. Test básico de envío
  console.log('2️⃣ Test de envío básico (solo destinatario principal)...');
  try {
    const testBasic = await resend.emails.send({
      from: 'StockIt <onboarding@resend.dev>',
      to: 'rnm.crea@gmail.com',
      subject: 'Test 1: Envío básico',
      html: '<p>Este es un test básico sin CC</p>'
    });
    
    console.log('✅ Envío básico exitoso');
    console.log('   ID retornado:', testBasic.id);
    console.log('   Objeto completo:', JSON.stringify(testBasic, null, 2));
  } catch (error) {
    console.log('❌ Error en envío básico:', error.message);
    console.log('   Detalles:', JSON.stringify(error, null, 2));
  }
  console.log('');

  // 3. Test con CC
  console.log('3️⃣ Test con copia (CC) a vorwerk.cl...');
  try {
    const testCC = await resend.emails.send({
      from: 'StockIt <onboarding@resend.dev>',
      to: 'rnm.crea@gmail.com',
      cc: ['roberto.poblete@vorwerk.cl'],
      subject: 'Test 2: Envío con CC',
      html: '<p>Este test incluye CC a vorwerk.cl</p>'
    });
    
    console.log('✅ Envío con CC exitoso');
    console.log('   ID retornado:', testCC.id);
    console.log('   Objeto completo:', JSON.stringify(testCC, null, 2));
  } catch (error) {
    console.log('❌ Error en envío con CC:', error.message);
    console.log('   Código de error:', error.statusCode);
    console.log('   Detalles completos:', JSON.stringify(error, null, 2));
  }
  console.log('');

  // 4. Test con múltiples CC
  console.log('4️⃣ Test con múltiples copias...');
  try {
    const testMultiCC = await resend.emails.send({
      from: 'StockIt <onboarding@resend.dev>',
      to: 'rnm.crea@gmail.com',
      cc: ['roberto.poblete@vorwerk.cl', 'dmorales@vorwerk.cl'],
      subject: 'Test 3: Múltiples CC',
      html: '<p>Test con múltiples destinatarios en CC</p>'
    });
    
    console.log('✅ Envío con múltiples CC exitoso');
    console.log('   ID retornado:', testMultiCC.id);
  } catch (error) {
    console.log('❌ Error con múltiples CC:', error.message);
    console.log('   Detalles:', JSON.stringify(error, null, 2));
  }
  console.log('');

  // 5. Información de cuenta
  console.log('5️⃣ Verificando configuración de cuenta...');
  console.log('   Consulta tu dashboard en: https://resend.com/emails');
  console.log('   Revisa:');
  console.log('   - ¿Estás en plan Free o Paid?');
  console.log('   - ¿El dominio vorwerk.cl está verificado?');
  console.log('   - ¿Los emails de vorwerk.cl están en la lista de verificados?');
  console.log('');

  console.log('================================');
  console.log('🏁 Diagnóstico completado');
  console.log('');
  console.log('📧 Revisa AMBAS casillas de correo:');
  console.log('   - rnm.crea@gmail.com');
  console.log('   - roberto.poblete@vorwerk.cl');
  console.log('');
  console.log('⚠️  Si vorwerk.cl NO recibe emails:');
  console.log('   1. Ve a https://resend.com/domains');
  console.log('   2. Agrega y verifica vorwerk.cl');
  console.log('   O');
  console.log('   1. Ve a https://resend.com/emails');
  console.log('   2. Verifica individualmente roberto.poblete@vorwerk.cl');
}

testResendConfiguration();