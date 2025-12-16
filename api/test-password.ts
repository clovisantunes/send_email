// api/test-password.ts - MOSTRA SENHA REAL
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    console.log('🔍 TESTANDO SENHA REALMENTE ENVIADA');
    
    // 1. PEGA A SENHA E DECODIFICA
    const rawPass = process.env.EMAIL_PASSWORD || 'Carro@201';
    const decodedPass = decodeURIComponent(rawPass);
    
    console.log('📊 DADOS BRUTOS:');
    console.log('Raw do env:', JSON.stringify(rawPass));
    console.log('Após decode:', JSON.stringify(decodedPass));
    console.log('Comprimento decoded:', decodedPass.length);
    
    // 2. VERIFICAÇÃO MANUAL
    console.log('\n🔐 VERIFICAÇÃO CARACTERE A CARACTERE:');
    console.log('Esperado (Carro@201):');
    'Carro@201'.split('').forEach((char, i) => {
      console.log(`  [${i}] '${char}' = código ${char.charCodeAt(0)}`);
    });
    
    console.log('\nRecebido:');
    decodedPass.split('').forEach((char, i) => {
      console.log(`  [${i}] '${char}' = código ${char.charCodeAt(0)}`);
    });
    
    // 3. MONTA O COMANDO AUTH PLAIN MANUALMENTE
    const user = 'suporte.ti@centroms.com.br';
    const authString = `\0${user}\0${decodedPass}`;
    
    console.log('\n🔑 COMANDO AUTH PLAIN CONSTRUÍDO:');
    console.log('String original:', `\\0${user}\\0${decodedPass}`);
    console.log('Comprimento total:', authString.length);
    
    // Em Node, usamos Buffer
    const base64Auth = Buffer.from(authString).toString('base64');
    
    console.log('\n📡 BASE64 QUE SERIA ENVIADO:');
    console.log(base64Auth);
    
    console.log('\n📡 BASE64 DO LOG ANTERIOR (para comparar):');
    const previousBase64 = 'AHN1cG9ydGUudGlAY2VudHJvbXMuY29tLmJyAC8qIHNlY3JldCAqLw==';
    console.log(previousBase64);
    
    // 4. DECODIFICA O BASE64 ANTERIOR PARA VER O QUE ESTAVA LÁ
    const previousDecoded = Buffer.from(previousBase64, 'base64').toString();
    console.log('\n🔍 DECODIFICANDO BASE64 DO LOG ANTERIOR:');
    console.log('Hex:', Buffer.from(previousDecoded).toString('hex'));
    console.log('String com \\0:', previousDecoded.replace(/\0/g, '\\0'));
    
    // 5. TESTE SMTP REAL
    console.log('\n🧪 TESTANDO CONEXÃO SMTP...');
    
    const transporter = nodemailer.createTransport({
      host: 'mail.centroms.com.br',
      port: 587,
      secure: false,
      auth: {
        user: user,
        pass: decodedPass,
      },
      // Cria logger customizado para PEGAR TUDO
      logger: {
        level: 'debug',
        log: (entry: any) => {
          console.log(`[SMTP RAW] ${JSON.stringify(entry)}`);
          // Se tiver data sobre auth, mostra
          if (entry.message && entry.message.includes('AUTH')) {
            console.log(`[SMTP AUTH DEBUG] ${entry.message}`);
          }
        }
      }
    } as any);
    
    await transporter.verify();
    console.log('✅ SMTP conectado!');
    
    return res.json({
      success: true,
      debug: {
        raw_password: rawPass,
        decoded_password: decodedPass,
        password_length: decodedPass.length,
        base64_to_send: base64Auth,
        previous_base64: previousBase64,
        comparison: base64Auth === previousBase64 ? 'IGUAIS' : 'DIFERENTES'
      }
    });
    
  } catch (error: any) {
    console.error('❌ ERRO:', error);
    
    return res.json({
      success: false,
      error: error.message,
      code: error.code,
      response: error.response
    });
  }
}