import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigins = [
    'https://centroms.com.br',
  ];
  
  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido. Use POST.'
    });
  }

  try {
    if (!req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Envie os dados como JSON (application/json).'
      });
    }

    console.log('=== DADOS RECEBIDOS ===');
    console.log('Body completo:', JSON.stringify(req.body, null, 2));
    console.log('=== FIM DADOS ===');

    const { nome, email, telefone, mensagem, arquivo_nome, arquivo_base64, arquivo_tipo } = req.body;

    if (!nome || !email || !telefone) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e telefone são obrigatórios.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, insira um email válido.'
      });
    }

    console.log('=== CONFIGURAÇÃO SMTP ===');
    console.log('BREVO_SMTP_USER existe:', !!process.env.BREVO_SMTP_USER);
    console.log('BREVO_SMTP_KEY existe:', !!process.env.BREVO_SMTP_KEY);
    console.log('RH_EMAIL:', process.env.RH_EMAIL);
    console.log('=== FIM CONFIGURAÇÃO ===');

    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    console.log('=== TESTANDO CONEXÃO SMTP ===');
    try {
      await transporter.verify();
      console.log('✅ Conexão SMTP verificada com sucesso');
    } catch (verifyError: any) {
      console.error('❌ Erro na verificação SMTP:', verifyError.message);
      console.error('Código do erro:', verifyError.code);
      
      if (verifyError.code === 'EAUTH') {
        return res.status(500).json({
          success: false,
          message: 'Erro de autenticação no servidor de email. Verifique as credenciais.'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erro na conexão com o servidor de email.'
      });
    }

    const mailOptions: any = {
      from: '"Site Centro Médico Sapiranga" <Site@centroms.com.br>',
      to: process.env.RH_EMAIL,
      replyTo: email,
      subject: `📋 Nova Candidatura - ${nome.substring(0, 30)}`,
      html: `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notificação - Novo Contato via Site</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .card {
            max-width: 520px;
            width: 100%;
            background: white;
            border-radius: 32px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
            transition: transform 0.2s ease;
        }

        .card:hover {
            transform: translateY(-4px);
        }

        .header {
            background: linear-gradient(105deg, #0f2b3d 0%, #1b4f6e 100%);
            padding: 28px 32px;
            text-align: center;
        }

        .icon {
            background: rgba(255, 255, 255, 0.15);
            width: 72px;
            height: 72px;
            margin: 0 auto 16px;
            border-radius: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(2px);
        }

        .icon svg {
            width: 40px;
            height: 40px;
            stroke: white;
            stroke-width: 1.5;
        }

        .header h1 {
            color: white;
            font-size: 1.75rem;
            font-weight: 600;
            letter-spacing: -0.3px;
            margin-bottom: 6px;
        }

        .header p {
            color: rgba(255, 255, 255, 0.85);
            font-size: 0.95rem;
        }

        .content {
            padding: 32px;
        }

        .info-box {
            background: #f8fafc;
            border-radius: 24px;
            padding: 20px;
            margin-bottom: 28px;
            border: 1px solid #e2e8f0;
        }

        .field {
            margin-bottom: 20px;
        }

        .field:last-child {
            margin-bottom: 0;
        }

        .field-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
            color: #4a6a8b;
            margin-bottom: 6px;
        }

        .field-value {
            font-size: 1rem;
            font-weight: 500;
            color: #0f2b3d;
            background: white;
            padding: 12px 16px;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            word-break: break-word;
        }

        .badge {
            display: inline-block;
            background: #e6f7ec;
            color: #1e7b48;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 50px;
            margin-top: 8px;
        }

        .message {
            background: #fef9e3;
            border-left: 4px solid #f5b042;
            padding: 16px;
            border-radius: 16px;
            margin: 20px 0;
            font-size: 0.9rem;
            color: #7c5c1f;
            line-height: 1.5;
        }

        .actions {
            display: flex;
            gap: 12px;
            margin-top: 28px;
        }

        .btn {
            flex: 1;
            padding: 12px 8px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.85rem;
            text-align: center;
            text-decoration: none;
            transition: all 0.2s;
            cursor: pointer;
            border: none;
            font-family: inherit;
        }

        .btn-primary {
            background: #1b4f6e;
            color: white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }

        .btn-primary:hover {
            background: #0f3a52;
            transform: scale(0.98);
        }

        .btn-secondary {
            background: white;
            color: #1b4f6e;
            border: 1px solid #cbd5e1;
        }

        .btn-secondary:hover {
            background: #f1f5f9;
            border-color: #94a3b8;
        }

        .footer-note {
            text-align: center;
            font-size: 0.7rem;
            color: #7f8c9a;
            border-top: 1px solid #edf2f7;
            padding-top: 20px;
            margin-top: 12px;
        }

        @media (max-width: 480px) {
            .card {
                border-radius: 28px;
            }
            .content {
                padding: 24px;
            }
            .header h1 {
                font-size: 1.4rem;
            }
            .actions {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 6L12 13L2 6M22 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6l10 7l10-7Z" />
                    <path d="M4 4h16a2 2 0 0 1 2 2v10" />
                </svg>
            </div>
            <h1>📬 Novo contato via site</h1>
            <p>Alguém preencheu o formulário agora há pouco</p>
        </div>

        <div class="content">
            <div class="info-box">
                <div class="field">
                    <div class="field-label">📧 E-mail do remetente</div>
                    <div class="field-value">ana.carvalho@exemplo.com</div>
                    <div class="badge">✔️ Verificado (domínio válido)</div>
                </div>
                <div class="field">
                    <div class="field-label">👤 Nome completo</div>
                    <div class="field-value">Ana Beatriz Carvalho</div>
                </div>
                <div class="field">
                    <div class="field-label">📞 Telefone (opcional)</div>
                    <div class="field-value">(11) 98765-4321</div>
                </div>
                <div class="field">
                    <div class="field-label">🌐 Página de origem</div>
                    <div class="field-value">/contato / página "Fale Conosco"</div>
                </div>
            </div>

            <div class="message">
                <strong>💬 Mensagem do visitante:</strong><br>
                "Olá, gostaria de receber mais informações sobre os serviços de consultoria. Vocês atendem empresas de pequeno porte? Obrigado."
            </div>

            <div class="actions">
                <a href="#" class="btn btn-primary">✉️ Responder agora</a>
                <a href="#" class="btn btn-secondary">📋 Ver no painel</a>
            </div>

            <div class="footer-note">
                ⏱️ Recebido em 07/04/2026 às 14:32 • IP: 189.45.xxx.xx
            </div>
        </div>
    </div>
</body>
</html>
      `,
      text: `
Nova candidatura recebida - Centro Médico Sapiranga

Nome: ${nome}
Email: ${email}
Telefone: ${telefone}
${mensagem ? `Mensagem: ${mensagem}\n` : ''}
${arquivo_nome ? `Currículo: ${arquivo_nome} (anexado)\n` : ''}

Data: ${new Date().toLocaleString('pt-BR')}
      `
    };

    if (arquivo_base64 && arquivo_nome) {
      console.log('=== PROCESSANDO ANEXO ===');
      console.log('Nome do arquivo:', arquivo_nome);
      console.log('Tipo do arquivo:', arquivo_tipo);
      console.log('Tamanho do Base64:', arquivo_base64.length, 'caracteres');
      
      if (!isValidBase64(arquivo_base64)) {
        console.error('❌ Base64 inválido');
        return res.status(400).json({
          success: false,
          message: 'Formato do arquivo inválido.'
        });
      }
      
      try {
        const buffer = Buffer.from(arquivo_base64, 'base64');
        console.log('✅ Base64 válido - Tamanho decodificado:', buffer.length, 'bytes');
        
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (buffer.length > MAX_SIZE) {
          console.error(`❌ Arquivo muito grande: ${buffer.length} bytes (limite: ${MAX_SIZE} bytes)`);
          return res.status(400).json({
            success: false,
            message: `Arquivo muito grande. Tamanho máximo: ${MAX_SIZE / 1024 / 1024}MB`
          });
        }
        
        mailOptions.attachments = [
          {
            filename: arquivo_nome,
            content: arquivo_base64,
            encoding: 'base64',
            contentType: arquivo_tipo || getMimeType(arquivo_nome)
          }
        ];
        
        console.log('✅ Anexo configurado com sucesso');
      } catch (bufferError: any) {
        console.error('❌ Erro ao processar Base64:', bufferError.message);
        return res.status(400).json({
          success: false,
          message: 'Erro ao processar o arquivo. Por favor, tente novamente.'
        });
      }
    } else {
      console.log('ℹ️ Nenhum arquivo para anexar');
    }

    console.log('=== ENVIANDO EMAIL ===');
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email enviado com sucesso!');
      console.log('Message ID:', info.messageId);
      console.log('Response:', info.response);
      
      return res.status(200).json({
        success: true,
        message: 'Candidatura enviada com sucesso!'
      });
      
    } catch (sendError: any) {
      console.error('❌ Erro ao enviar email:', sendError.message);
      console.error('Código do erro:', sendError.code);
      
      if (sendError.code === 'EENVELOPE') {
        return res.status(500).json({
          success: false,
          message: 'Erro no endereço de email. Verifique o email de destino.'
        });
      }
      
      if (sendError.code === 'EMESSAGE') {
        return res.status(500).json({
          success: false,
          message: 'Erro no conteúdo da mensagem. O arquivo pode estar muito grande.'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar o email. Por favor, tente novamente mais tarde.'
      });
    }

  } catch (error: any) {
    console.error('❌ ERRO GERAL NO BACKEND:');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor. Por favor, tente novamente mais tarde.'
    });
  }
}

function isValidBase64(str: string): boolean {
  try {
    if (!str || typeof str !== 'string') {
      return false;
    }
    
    if (str.length % 4 !== 0) {
      return false;
    }
    
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    
    Buffer.from(str, 'base64');
    return true;
    
  } catch (e) {
    return false;
  }
}

function getMimeType(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop() || '';
  
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    'odt': 'application/vnd.oasis.opendocument.text',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}