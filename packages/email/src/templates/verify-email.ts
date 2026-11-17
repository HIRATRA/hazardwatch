import { escapeHtml, renderButton, renderLayout } from "../layout.js";

export interface VerifyEmailContent {
  name: string;
  /** Link that confirms the address when opened. */
  url: string;
}

/** Asks a new user to confirm their address before alerts are emailed to it. */
export function verifyEmail({ name, url }: VerifyEmailContent) {
  const subject = "Confirm your email address";
  const text = `Hi ${name},

Confirm your email address to receive HazardWatch alerts by email:

${url}

The link expires in one hour. If you did not create a HazardWatch account, ignore this email.
`;
  const html = renderLayout({
    heading: subject,
    contentHtml: `<p style="margin:0 0 12px;line-height:1.5;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0;line-height:1.5;">Confirm your email address to receive HazardWatch alerts by email.</p>
      ${renderButton("Confirm my address", url)}
      <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">The link expires in one hour.</p>`,
    footerHtml: "If you did not create a HazardWatch account, ignore this email.",
  });
  return { subject, text, html };
}
