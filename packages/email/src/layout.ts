/** Escapes text for HTML content and attribute values. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface EmailLayout {
  /** Main heading of the message. */
  heading: string;
  /** Body, already escaped. */
  contentHtml: string;
  /** Small print at the bottom, already escaped. */
  footerHtml: string;
}

/**
 * Wraps content in a minimal HTML document with inline styles, the only
 * styling that email clients apply reliably.
 */
export function renderLayout({ heading, contentHtml, footerHtml }: EmailLayout): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
      <p style="margin:0 0 24px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;">HazardWatch</p>
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${escapeHtml(heading)}</h1>
      ${contentHtml}
    </div>
    <p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#6b7280;">${footerHtml}</p>
  </body>
</html>
`;
}

/** A button-like link, which survives clients that strip most styles. */
export function renderButton(label: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#f97316;color:#111827;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a></p>`;
}
