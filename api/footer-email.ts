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
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f8; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .header { background: #0d3b66; color: white; padding: 20px; }
    .header h2 { margin: 0; }
    .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 20px; }
    .item { margin-bottom: 12px; font-size: 14px; }
    .label { font-weight: bold; color: #222; }
    .footer { background: #f1f3f5; padding: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #555; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Novo contato</h2>
      <p>Mensagem enviada pelo formulário do site</p>
    </div>
    <div class="content">
      <div class="item"><span class="label">Nome:</span> ${nome}</div>
      <div class="item"><span class="label">Email:</span> ${email}</div>
      <div class="item"><span class="label">Telefone:</span> ${telefone}</div>
      ${mensagem ? `<div class="item"><span class="label">Mensagem:</span><br>${mensagem.replace(/\n/g, '<br>')}</div>` : ''}
      ${arquivo_nome ? `<div class="item"><span class="label">Anexo:</span> ${arquivo_nome}</div>` : ''}
    </div>
    <div class="footer">
      Recebido em ${new Date().toLocaleString('pt-BR')}
    </div>
  </div>
</body>
</html>
`,
            text: `
Novo contato - Formulário do site

Nome: ${nome}
Email: ${email}
Telefone: ${telefone}
${mensagem ? `Mensagem: ${mensagem}\n` : ''}
${arquivo_nome ? `Anexo: ${arquivo_nome}\n` : ''}

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