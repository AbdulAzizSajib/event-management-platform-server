import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { envVars } from "../config/env";

const transporter = nodemailer.createTransport({
  host: envVars.EMAIL_SENDER.SMTP_HOST,
  port: Number(envVars.EMAIL_SENDER.SMTP_PORT),
  secure: true, // true for port 465
  auth: {
    user: envVars.EMAIL_SENDER.SMTP_USER,
    pass: envVars.EMAIL_SENDER.SMTP_PASS,
  },
});

interface ISendEmailOptions {
  to: string;
  subject: string;
  templateName: string;
  templateData: Record<string, unknown>;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[];
}

export const sendEmail = async (options: ISendEmailOptions): Promise<void> => {
  const { to, subject, templateName, templateData, attachments } = options;

  const templatePath = path.resolve(
    process.cwd(),
    `src/app/templates/${templateName}.ejs`,
  );

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: `"Event Management Platform" <${envVars.EMAIL_SENDER.SMTP_FROM}>`,
    to,
    subject,
    html,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });
};
