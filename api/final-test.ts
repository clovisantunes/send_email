// api/final-test.ts - SOLUÇÃO DEFINITIVA
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    console.log('🎯 TESTE FINAL - ENVIANDO SENHA REAL');
    
    // 1. SENHA CORRETA DECODIFICADA
    const rawPass = process.env.EMAIL_PASSWORD || 'Carro@201';
    const decodedPass = decodeURIComponent(rawPass);
    
    console.log('🔐 SENHA QUE SERÁ USADA:', JSON.stringify(decodedPass));
    
    // 2. VERIFICA SE É MESMO 'Carro@201'
    if (decodedPass !== 'Carro@201') {
      console.log('⚠️ ATENÇÃO: Senha diferente do esperado!');
      console.log('Esperado: "Carro@201"');
      console.log('Recebido:', JSON.stringify(decodedPass));
    }
    
    // 3. CONFIGURAÇÃO SIMPLES E DIRETA
    const transporter = nodemailer.createTransport({
      host: 'mail.centroms.com.br',
      port: 587,
      secure: false,
      auth: {
        user: 'suporte.ti@centroms.com.br',
        pass: decodedPass, // SENHA REAL
      },
      // Logs básicos
      debug: true,
      logger: true
    } as any);
    
    // 4. TESTA CONEXÃO
    console.log('🔌 Testando conexão SMTP...');
    await transporter.verify();
    console.log('✅ Conexão SMTP OK!');
    
    // 5. ENVIA EMAIL DE TESTE
    const testEmail = {
      from: '"Teste API" <suporte.ti@centroms.com.br>',
      to: 'suporte.ti@centroms.com.br', // Envia para si mesmo
      subject: '✅ TESTE API - Funcionando!',
      text: `Teste realizado com sucesso!\nSenha usada: ${decodedPass}\nData: ${new Date().toLocaleString('pt-BR')}`
    };
    
    const info = await transporter.sendMail(testEmail);
    console.log('📧 Email enviado! ID:', info.messageId);
    
    return res.json({
      success: true,
      message: 'API funcionando! Email enviado.',
      messageId: info.messageId,
      passwordUsed: decodedPass,
      passwordCorrect: decodedPass === 'Carro@201'
    });
    
  } catch (error: any) {
    console.error('❌ ERRO FINAL:', error.message);
    console.error('Código:', error.code);
    console.error('Resposta:', error.response);
    
    return res.json({
      success: false,
      error: error.message,
      code: error.code,
      hint: 'Se for EAUTH, a senha está ERRADA ou conta bloqueada'
    });
  }
}