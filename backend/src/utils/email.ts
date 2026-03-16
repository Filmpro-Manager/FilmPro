import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(toEmail: string, userName: string, code: string) {
  const transporter = createTransporter();

  const fromName = process.env.SMTP_FROM_NAME || 'FilmPro Manager';
  const fromEmail = process.env.SMTP_USER;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/redefinir-senha`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Redefinição de senha</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #070c1a; padding: 36px 40px; text-align: center; }
    .logo { display: inline-flex; align-items: center; gap: 10px; }
    .logo-icon { width: 40px; height: 40px; background: #2563eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .logo-text { color: #ffffff; font-size: 18px; font-weight: 600; }
    .body { padding: 40px; }
    .greeting { font-size: 16px; color: #374151; margin-bottom: 12px; }
    .message { font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 32px; }
    .code-box { background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px; }
    .code-label { font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
    .code { font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #111827; font-family: 'Courier New', monospace; }
    .expiry { font-size: 12px; color: #ef4444; margin-top: 10px; }
    .cta { text-align: center; margin-bottom: 28px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .footer-note { font-size: 12px; color: #9ca3af; line-height: 1.6; }
    .footer { background: #f8fafc; padding: 20px 40px; text-align: center; }
    .footer-text { font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">
        <span class="logo-text">FilmPro Manager</span>
      </div>
    </div>
    <div class="body">
      <p class="greeting">Olá, <strong>${userName}</strong>!</p>
      <p class="message">
        Recebemos uma solicitação para redefinir a senha da sua conta no <strong>FilmPro Manager</strong>.
        Use o código abaixo para criar sua nova senha.
      </p>

      <div class="code-box">
        <p class="code-label">Seu código de verificação</p>
        <p class="code">${code}</p>
        <p class="expiry">⏱ Válido por 1 hora</p>
      </div>

      <div class="cta">
        <a href="${resetUrl}" class="btn">Ir para redefinição de senha</a>
      </div>

      <hr class="divider" />
      <p class="footer-note">
        Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanece a mesma.
        <br/><br/>
        Por segurança, nunca compartilhe este código com ninguém.
      </p>
    </div>
    <div class="footer">
      <p class="footer-text">© ${new Date().getFullYear()} FilmPro Manager — Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>
`;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: `${code} — Código de redefinição de senha · FilmPro Manager`,
    html,
    text: `Olá ${userName},\n\nSeu código de redefinição de senha é: ${code}\n\nEsse código é válido por 1 hora.\n\nAcesse ${resetUrl} para criar sua nova senha.\n\nSe não foi você que solicitou, ignore este e-mail.`,
  });
}
