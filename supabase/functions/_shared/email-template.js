export const EMAIL_SIGNATURE = "Thaís Santos Beauty Studio<br>Cuidando da sua beleza com carinho. 🤎";

export const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export const renderTemplate = (value = "", variables = {}, { html = false } = {}) =>
  Object.entries(variables).reduce((result, [key, replacement]) =>
    result.replaceAll(`{{${key}}}`, html ? escapeHtml(replacement) : String(replacement ?? "")), value);

export function renderEmailLayout({ title, subtitle, body, signature, buttonText, buttonUrl }) {
  const button = buttonText && buttonUrl ? `<p style="margin:28px 0 8px;text-align:center"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;padding:13px 22px;border-radius:9px;background:#8b5e45;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(buttonText)}</a></p>` : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:28px 12px;background:#f5eee8;color:#513d33;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e7d8cd;border-radius:16px"><h1 style="margin:0 0 8px;color:#7b503a;font-family:Georgia,serif;font-size:28px">${title}</h1>${subtitle ? `<p style="margin:0 0 24px;color:#806f66">${subtitle}</p>` : ""}<div style="font-size:15px;line-height:1.65">${body}</div>${button}<p style="margin:30px 0 0;padding-top:20px;border-top:1px solid #eaded5;color:#765b4d;line-height:1.55">${signature || EMAIL_SIGNATURE}</p></main></body></html>`;
}
