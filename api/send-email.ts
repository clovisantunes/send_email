import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ----------------------------
  // CORS
  // ----------------------------
  res.setHeader('Access-Control-Allow-Origin', 'https://cms-42v7.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
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
    // ----------------------------
    // Validação de Content-Type
    // ----------------------------
    if (!req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Envie os dados como JSON (application/json).'
      });
    }

    const { nome, email, telefone, mensagem, arquivo_nome } = req.body;

    if (!nome || !email || !telefone) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e telefone são obrigatórios.'
      });
    }

    // ----------------------------
    // Transporter BREVO
    // ----------------------------
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
      },
    });

    // Teste de conexão SMTP (opcional, mas útil)
    await transporter.verify();

    // ----------------------------
    // Email
    // ----------------------------
    const mailOptions = {
      from: '"Site Centro Médico Sapiranga" <suporte.ti@centroms.com.br>',
      to: process.env.RH_EMAIL || 'suporte.ti@centroms.com.br',
      replyTo: email,
      subject: `📋 Nova Candidatura - ${nome}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f4f4f4;
              padding: 20px;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 6px;
              overflow: hidden;
            }
            .header {
              background: #1a5f7a;
              color: #ffffff;
              padding: 20px;
            }
            .content {
              padding: 20px;
            }
            .item {
              margin-bottom: 10px;
            }
            .label {
              font-weight: bold;
            }
            .footer {
              font-size: 12px;
              color: #777;
              padding: 15px;
              border-top: 1px solid #eee;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Nova candidatura recebida</h2>
              <p>Centro Médico Sapiranga</p>
            </div>
            <div class="content">
              <div class="item"><span class="label">Nome:</span> ${nome}</div>
              <div class="item"><span class="label">Email:</span> ${email}</div>
              <div class="item"><span class="label">Telefone:</span> ${telefone}</div>

              ${
                mensagem
                  ? `<div class="item"><span class="label">Mensagem:</span><br/>${mensagem.replace(
                      /\n/g,
                      '<br/>'
                    )}</div>`
                  : ''
              }

              ${
                arquivo_nome
                  ? `<div class="item"><span class="label">Currículo:</span> ${arquivo_nome}</div>`
                  : ''
              }
            </div>
            <div class="footer">
              Enviado automaticamente pelo site em ${new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Nova candidatura recebida

Nome: ${nome}
Email: ${email}
Telefone: ${telefone}
Mensagem: ${mensagem || 'Não informada'}
Currículo: ${arquivo_nome || 'Não informado'}

Data: ${new Date().toLocaleString('pt-BR')}
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: 'Candidatura enviada com sucesso.'
    });

  } catch (error: any) {
    console.error('Erro ao enviar email:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar a candidatura. Tente novamente mais tarde.'
    });
  }
}
