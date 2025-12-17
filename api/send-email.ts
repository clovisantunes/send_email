import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false, 
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigins = ['https://cms-42v7.vercel.app', 'https://cms-jet-one.vercel.app'];
  const allowedOrigin = allowedOrigins.includes(req.headers.origin || '') ? (req.headers.origin || allowedOrigins[0]) : allowedOrigins[0];

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const busboy = Busboy({ headers: req.headers });


    interface EmailFields {
      nome?: string;
      email?: string;
      telefone?: string;
      mensagem?: string;
      [key: string]: string | undefined;
    }

    interface FileInfo {
      filename: string;
      mimeType: string;
    }


        const fields: EmailFields = {};
        let fileBuffer: Buffer | null = null;
        let fileName = '';
        let fileMime = '';

        busboy.on('field', (name: string, value: string) => {
          fields[name] = value;
        });

    busboy.on('file', (_name, file, info) => {
      fileName = info.filename;
      fileMime = info.mimeType;

      const chunks: Buffer[] = [];
      file.on('data', (data) => chunks.push(data));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('finish', async () => {
      const { nome, email, telefone, mensagem } = fields;

      if (!nome || !email || !telefone) {
        return res.status(400).json({
          success: false,
          message: 'Nome, email e telefone são obrigatórios',
        });
      }

      const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.BREVO_SMTP_USER,
          pass: process.env.BREVO_SMTP_KEY,
        },
      });

      const attachments = fileBuffer
        ? [
            {
              filename: fileName,
              content: fileBuffer,
              contentType: fileMime,
            },
          ]
        : [];

      await transporter.sendMail({
        from: '"Site Centro Médico Sapiranga" <suporte.ti@centroms.com.br>',
        to: process.env.RH_EMAIL,
        replyTo: email,
        subject: `Nova candidatura - ${nome}`,
        text: `
Nome: ${nome}
Email: ${email}
Telefone: ${telefone}

Mensagem:
${mensagem || 'Não informada'}
        `,
        attachments,
      });

      return res.status(200).json({
        success: true,
        message: 'Candidatura enviada com anexo',
      });
    });

    req.pipe(busboy);
  } catch (err: any) {
    console.error('ERRO BACKEND:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar email',
    });
  }
}
