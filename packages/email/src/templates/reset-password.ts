import { escapeHtml, renderButton, renderLayout } from "../layout.js";

export interface ResetPasswordContent {
  name: string;
  /** Link that leads to the page where a new password is chosen. */
  url: string;
}

/** Sends the link to choose a new password, after a request from the sign in page. */
export function resetPassword({ name, url }: ResetPasswordContent) {
  const subject = "Reset your password";
  const text = `Hi ${name},

Someone asked to reset the password of your HazardWatch account. Choose a new one here:

${url}

The link expires in one hour and works once. If you did not ask for it, ignore this email: your password stays the same.
`;
  const html = renderLayout({
    heading: subject,
    contentHtml: `<p style="margin:0 0 12px;line-height:1.5;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0;line-height:1.5;">Someone asked to reset the password of your HazardWatch account. Choose a new one with the button below.</p>
      ${renderButton("Choose a new password", url)}
      <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">The link expires in one hour and works once.</p>`,
    footerHtml: "If you did not ask for it, ignore this email: your password stays the same.",
  });
  return { subject, text, html };
}
