import type { NotificationPayload } from "@/types";

/**
 * POST a NotificationPayload to the n8n webhook that fans out to WhatsApp.
 *
 * Best-effort: 10s timeout, no retry, never throws.
 * Non-2xx responses are logged but do not propagate.
 */
export async function sendWhatsAppNotification(
  payload: NotificationPayload
): Promise<void> {
  const baseUrl = process.env.N8N_BASE_URL;
  const path = process.env.N8N_WEBHOOK_PATH;

  if (!baseUrl || !path) {
    console.warn(
      "[whatsapp-n8n] N8N_BASE_URL or N8N_WEBHOOK_PATH missing, skipping"
    );
    return;
  }

  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(
        `[whatsapp-n8n] webhook returned ${res.status}: ${txt.slice(0, 200)}`
      );
    }
  } catch (err) {
    console.warn(
      `[whatsapp-n8n] webhook call failed: ${(err as Error).message}`
    );
  } finally {
    clearTimeout(timer);
  }
}
