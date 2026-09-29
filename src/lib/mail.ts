import "server-only";
import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string; html?: string };

export async function sendMail(mail: Mail): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    // Разработка без SMTP: письмо целиком уходит в лог сервера.
    console.info(`\n[mail] Кому: ${mail.to}\n[mail] Тема: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, ...mail });
}
