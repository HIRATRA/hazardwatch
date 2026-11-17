import { createTransport } from "nodemailer";

/** An email ready to send, with a plain text and an HTML version. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  /** Sends the message, rejecting when the SMTP server does not accept it. */
  send(message: EmailMessage): Promise<void>;
}

export interface MailerOptions {
  /**
   * SMTP server to send through, such as `smtp://localhost:1025` for Mailpit
   * or `smtps://user:password@smtp.example.com:465` for a provider.
   */
  smtpUrl: string;
  /** Sender of every message, as `Name <address>`. */
  from: string;
}

export function createMailer({ smtpUrl, from }: MailerOptions): Mailer {
  const transport = createTransport(smtpUrl);
  return {
    async send(message) {
      await transport.sendMail({ from, ...message });
    },
  };
}
