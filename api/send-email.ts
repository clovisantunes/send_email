import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ CORS - Permite seu domínio frontend
  res.setHeader('Access-Control-Allow-Origin', 'https://cms-42v7.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // ✅ CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // ✅ Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido. Use POST.'
    });
  }
  
  try {
    console.log('📥 Recebendo candidatura...');
    
    // ✅ Aceita JSON
    if (!req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Envie dados como JSON (Content-Type: application/json)'
      });
    }
    
    const { nome, email, telefone, mensagem, arquivo_nome } = req.body;
    
    // Validação
    if (!nome || !email || !telefone) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e telefone são obrigatórios.'
      });
    }
    
    console.log('📄 Dados:', { nome, email, telefone });
    
    // 🔍 DEBUG DETALHADO DAS CREDENCIAIS
    const rawPasswordFromEnv = process.env.EMAIL_PASSWORD;
    console.log('🔐 DEBUG CREDENCIAIS:');
    console.log('1. Variável de ambiente (RAW):', JSON.stringify(rawPasswordFromEnv));
    console.log('2. Tipo:', typeof rawPasswordFromEnv);
    
    let decodedPassword = 'Carro@201'; // Fallback
    
    if (rawPasswordFromEnv) {
      // Tenta decodificar apenas se contém %
      if (rawPasswordFromEnv.includes('%')) {
        decodedPassword = decodeURIComponent(rawPasswordFromEnv);
        console.log('3. Após decodeURIComponent:', JSON.stringify(decodedPassword));
      } else {
        decodedPassword = rawPasswordFromEnv;
        console.log('3. Usando raw (sem decode):', JSON.stringify(decodedPassword));
      }
    }
    
    console.log('4. Esperado:', JSON.stringify('Carro@201'));
    console.log('5. Usuário:', 'suporte.ti@centroms.com.br');
    
    // ✅ CONFIGURAÇÃO SIMPLIFICADA (sem propriedades extras)
    const transporter = nodemailer.createTransport({
      host: 'mail.centroms.com.br',
      port: 587,
      secure: false, // false para STARTTLS
      requireTLS: true,
      tls: {
        rejectUnauthorized: false
      },
      auth: {
        user: 'suporte.ti@centroms.com.br',
        pass: decodedPassword, // Senha já decodificada
      },
      // Configurações de debug CORRETAS para o Nodemailer
      debug: true,
      logger: true
    } as any); // 'as any' para evitar problemas de tipos
    
    // Testa conexão SMTP
    console.log('🔍 Testando conexão SMTP...');
    await transporter.verify();
    console.log('✅ SMTP conectado');
    
    // Template do email
    const mailOptions = {
      from: `"Site Centro Médico Sapiranga" <suporte.ti@centroms.com.br>`,
      to: process.env.RH_EMAIL || 'suporte.ti@centroms.com.br',
      replyTo: email,
      subject: `📋 Nova Candidatura - ${nome}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a5f7a; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
            .info-item { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Nova Candidatura Recebida</h1>
              <p>Centro Médico Sapiranga</p>
            </div>
            <div class="content">
              <h2>👤 Dados do Candidato</h2>
              <div class="info-item">
                <span class="label">Nome:</span> ${nome}
              </div>
              <div class="info-item">
                <span class="label">Email:</span> ${email}
              </div>
              <div class="info-item">
                <span class="label">Telefone:</span> ${telefone}
              </div>
              ${mensagem ? `
              <div class="info-item">
                <span class="label">Mensagem:</span><br>
                ${mensagem.replace(/\n/g, '<br>')}
              </div>
              ` : ''}
              ${arquivo_nome ? `
              <div class="info-item">
                <span class="label">Currículo:</span> ${arquivo_nome}
              </div>
              ` : ''}
              <hr>
              <p><em>Enviado automaticamente do formulário do site.</em></p>
              <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `NOVA CANDIDATURA\n\nNome: ${nome}\nEmail: ${email}\nTelefone: ${telefone}\nMensagem: ${mensagem || 'Nenhuma'}\nCurrículo: ${arquivo_nome || 'Não informado'}\n\nData: ${new Date().toLocaleString('pt-BR')}`
    };
    
    // Envia email
    console.log('📤 Enviando email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado! ID:', info.messageId);
    
    return res.status(200).json({
      success: true,
      message: '✅ Candidatura enviada com sucesso! Entraremos em contato em breve.',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro:', error);
    
    // Log detalhado do erro SMTP
    if (error.code === 'EAUTH') {
      console.error('🔍 DETALHES DO ERRO AUTH:');
      console.error('- Código:', error.code);
      console.error('- Resposta:', error.response);
      console.error('- Comando:', error.command);
    }
    
    let errorMessage = 'Erro ao enviar candidatura. Tente novamente.';
    
    if (error.code === 'EAUTH') {
      errorMessage = `Erro de autenticação: ${error.response || 'Credenciais inválidas'}`;
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Não foi possível conectar ao servidor de email.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Servidor de email não encontrado.';
    }
    
    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}