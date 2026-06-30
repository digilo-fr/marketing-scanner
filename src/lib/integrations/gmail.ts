import { google } from "googleapis";
import type { NotificationPayload } from "@/types";

/**
 * Build an OAuth2 client using the same env vars as sheets-client.ts.
 */
function getOAuth2() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!refreshToken) missing.push("GOOGLE_REFRESH_TOKEN");
  if (missing.length > 0) {
    throw new Error(`[gmail] Missing env vars: ${missing.join(", ")}`);
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "#16a34a";
    case "B":
      return "#65a30d";
    case "C":
      return "#ca8a04";
    case "D":
      return "#ea580c";
    default:
      return "#dc2626";
  }
}

function buildHtml(payload: NotificationPayload): string {
  const recos = payload.top_recommendations
    .map(
      (r) => `
        <li style="margin-bottom:10px;">
          <strong>${escapeHtml(r.title)}</strong>
          <span style="color:#64748b;"> — impact estimé jusqu'à ${r.impact_estimate_max}€/mois</span>
        </li>`
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="background:#818cf8;padding:24px 32px;color:#ffffff;">
          <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">Marketing Scanner — Digilo</div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;">Audit terminé</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px 0;font-size:15px;color:#475569;">Résultats pour</p>
          <h1 style="margin:0 0 4px 0;font-size:22px;">${escapeHtml(payload.business_name)}</h1>
          <a href="${escapeHtml(payload.target_url)}" style="color:#818cf8;font-size:14px;">${escapeHtml(payload.target_url)}</a>

          <div style="margin:28px 0;padding:24px;background:#faf5ff;border-radius:10px;text-align:center;">
            <div style="font-size:13px;color:#818cf8;letter-spacing:0.06em;text-transform:uppercase;">Score global</div>
            <div style="font-size:48px;font-weight:800;color:#0f172a;margin-top:6px;">
              ${payload.overall_score}<span style="font-size:24px;color:#94a3b8;">/100</span>
            </div>
            <div style="display:inline-block;margin-top:10px;padding:4px 14px;border-radius:999px;background:${gradeColor(payload.grade)};color:#fff;font-weight:700;">
              Grade ${escapeHtml(payload.grade)}
            </div>
          </div>

          <h2 style="font-size:17px;margin:0 0 12px 0;">Top recommandations</h2>
          <ul style="padding-left:20px;margin:0 0 24px 0;font-size:15px;line-height:1.5;">${recos}</ul>

          ${
            payload.pdf_url
              ? `<div style="text-align:center;margin:28px 0;">
                   <a href="${escapeHtml(payload.pdf_url)}" style="display:inline-block;padding:12px 28px;background:#818cf8;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Télécharger le PDF complet</a>
                 </div>`
              : ""
          }

          <p style="font-size:13px;color:#94a3b8;margin:24px 0 0 0;">
            Le rapport complet est joint à cet email (PDF + Markdown).
          </p>
        </td></tr>
        <tr><td style="background:#0f172a;padding:18px 32px;color:#94a3b8;font-size:12px;text-align:center;">
          Marketing Scanner — Digilo · audit.digilo.fr
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildText(payload: NotificationPayload): string {
  const recos = payload.top_recommendations
    .map((r, i) => `${i + 1}. ${r.title} (jusqu'à ${r.impact_estimate_max}€/mois)`)
    .join("\n");
  return [
    `Marketing Scanner — Digilo`,
    ``,
    `Audit terminé pour ${payload.business_name}`,
    `URL : ${payload.target_url}`,
    ``,
    `Score : ${payload.overall_score}/100 (Grade ${payload.grade})`,
    ``,
    `Top recommandations :`,
    recos,
    ``,
    payload.pdf_url ? `PDF : ${payload.pdf_url}` : "",
    ``,
    `— audit.digilo.fr`,
  ]
    .filter(Boolean)
    .join("\n");
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Build a multipart/mixed RFC 822 MIME message containing:
 *  - multipart/alternative (text + html)
 *  - PDF attachment
 *  - Markdown attachment (optional)
 */
function buildMime(args: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  pdfBuffer: Buffer;
  pdfFileName: string;
  reportMd: string;
  mdFileName: string;
}): Buffer {
  const altBoundary = `alt_${Math.random().toString(36).slice(2)}`;
  const mixedBoundary = `mix_${Math.random().toString(36).slice(2)}`;
  const CRLF = "\r\n";

  const headers = [
    `From: ${args.from}`,
    `To: ${args.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(args.subject, "utf8").toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
  ].join(CRLF);

  const altPart = [
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    args.text,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    args.html,
    ``,
    `--${altBoundary}--`,
  ].join(CRLF);

  const pdfPart = [
    `--${mixedBoundary}`,
    `Content-Type: application/pdf; name="${args.pdfFileName}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${args.pdfFileName}"`,
    ``,
    args.pdfBuffer.toString("base64").replace(/(.{76})/g, "$1\r\n"),
  ].join(CRLF);

  const mdPart = [
    `--${mixedBoundary}`,
    `Content-Type: text/markdown; charset="UTF-8"; name="${args.mdFileName}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${args.mdFileName}"`,
    ``,
    Buffer.from(args.reportMd, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n"),
  ].join(CRLF);

  const closing = `--${mixedBoundary}--`;

  const message =
    headers + CRLF + CRLF + altPart + CRLF + pdfPart + CRLF + mdPart + CRLF + closing;

  return Buffer.from(message, "utf8");
}

/**
 * Send the audit completion email with the PDF (and .md) attached.
 *
 * Best-effort: errors are logged and re-thrown only so that the dispatcher's
 * Promise.allSettled wrapper can record the failure. Caller MUST swallow.
 */
export async function sendAuditEmail(
  payload: NotificationPayload,
  pdfBuffer: Buffer,
  reportMd: string
): Promise<void> {
  const from = process.env.GMAIL_FROM || "didigum@gmail.com";
  const to = payload.recipient_email;
  if (!to) {
    console.warn("[gmail] no recipient_email on payload, skipping");
    return;
  }

  const auth = getOAuth2();
  const gmail = google.gmail({ version: "v1", auth });

  const date = new Date().toISOString().slice(0, 10);
  const slug = payload.business_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "audit";
  const pdfFileName = `audit-${slug}-${date}.pdf`;
  const mdFileName = `audit-${slug}-${date}.md`;
  const subject = `Audit Marketing — ${payload.business_name} (${payload.overall_score}/100, ${payload.grade})`;

  const mime = buildMime({
    from,
    to,
    subject,
    html: buildHtml(payload),
    text: buildText(payload),
    pdfBuffer,
    pdfFileName,
    reportMd,
    mdFileName,
  });

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: base64UrlEncode(mime) },
  });
}
