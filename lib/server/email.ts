import "server-only";

import { APP_NAME } from "@/lib/brand";

// Transactional email, via Resend's HTTP API.
//
// First outbound email in this codebase, so this file sets the precedent. Three
// decisions worth writing down:
//
//  1. **Plain `fetch`, no SDK.** Resend's official client is a thin wrapper over
//     this one endpoint; a dependency in `package.json` — reviewed, updated,
//     audited forever — is not worth one POST. Same reasoning as
//     `lib/server/aiBaby.ts` calling Gemini's REST endpoint directly.
//
//  2. **Absent by design.** With `RESEND_API_KEY` unset there is no mail
//     transport and this no-ops, exactly like `lib/server/db.ts` with no
//     `DATABASE_URL` and `SHEETS_WEBHOOK_URL` with no webhook. Nothing throws at
//     import time and nothing reads a secret until a send is actually
//     attempted. Callers branch on `isEmailConfigured()` when the *absence* of
//     mail changes what the user should be told.
//
//  3. **Awaited, not fire-and-forget.** The attribution ping in
//     `/api/v1/go/[id]` is fire-and-forget because the redirect is the feature
//     and the ping is bookkeeping. Here the email IS the feature: a password
//     reset whose mail silently failed is a user locked out being told to check
//     an inbox that will never receive anything. So a failed send throws, and
//     `requestPasswordReset` turns that into a visible "no pudimos enviar el
//     correo" rather than a false success.
//
// Nothing in this file logs the API key, the message body or the reset URL. The
// URL contains a live credential (the raw token), so it is passed through and
// never printed — see `error()` below, which deliberately reports only status.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * The envelope sender. Root domain, not the app subdomain: the app lives on
 * `app.embarazo.com.py` while mail is sent from `embarazo.com.py`, which is
 * where the SPF/DKIM/DMARC records are verified. Overridable by env so moving
 * domains is a deployment change and not a code change.
 */
const DEFAULT_FROM = "no-reply@embarazo.com.py";

function apiKey(): string | undefined {
  const key = process.env.RESEND_API_KEY?.trim();
  return key ? key : undefined;
}

function fromAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  return `${APP_NAME} <${configured || DEFAULT_FROM}>`;
}

/** True when an email could actually be delivered from this process. */
export function isEmailConfigured(): boolean {
  return apiKey() !== undefined;
}

interface Message {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * POST one message. Throws on any non-2xx so the caller can tell the user the
 * truth; the thrown message carries the HTTP status and nothing else — Resend's
 * error bodies echo request fields, and this request's fields include a live
 * reset URL that must not reach a log aggregator.
 */
async function send(message: Message): Promise<void> {
  const key = apiKey();
  // Absent by design: no transport configured, nothing to do, no complaint.
  // Callers that need to *tell* the user this check `isEmailConfigured()`.
  if (!key) return;

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      // Header, not query string: query strings land in access logs and proxy
      // caches, and this is a live credential.
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    // A mail API that has stopped answering must not hold a server action open
    // until the platform kills the request.
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Resend rejected the message (HTTP ${res.status}).`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The password-reset email. es-PY voseo, same voice as every screen in the app.
 *
 * Both parts are sent: a plain-text body because plenty of Paraguayan users
 * read mail in clients that never render HTML, and an HTML one with the link as
 * a real anchor. The URL appears in full in the text part on purpose — a user
 * who cannot click can still copy it.
 *
 * @throws when the message could not be handed to Resend. Silent (no-op) when
 *   no API key is configured.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const safeUrl = escapeHtml(resetUrl);
  await send({
    to,
    subject: `Restablecé tu contraseña de ${APP_NAME}`,
    text: [
      `Hola,`,
      ``,
      `Pediste cambiar la contraseña de tu cuenta de ${APP_NAME}. Abrí este enlace para elegir una nueva:`,
      ``,
      resetUrl,
      ``,
      `El enlace vence en 30 minutos y se puede usar una sola vez.`,
      ``,
      `Si no pediste esto, no hace falta que hagas nada: ignorá este correo y tu contraseña sigue igual.`,
      ``,
      `— ${APP_NAME}`,
    ].join("\n"),
    html: [
      `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.6;color:#22303c">`,
      `<p>Hola,</p>`,
      `<p>Pediste cambiar la contraseña de tu cuenta de ${escapeHtml(APP_NAME)}. Tocá el botón para elegir una nueva:</p>`,
      `<p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#1f6f78;color:#ffffff;font-weight:700;text-decoration:none">Elegir una nueva contraseña</a></p>`,
      `<p style="font-size:14px;color:#6b7b8a">O copiá este enlace: ${safeUrl}</p>`,
      `<p><strong>El enlace vence en 30 minutos</strong> y se puede usar una sola vez.</p>`,
      `<p>Si no pediste esto, no hace falta que hagas nada: ignorá este correo y tu contraseña sigue igual.</p>`,
      `<p>— ${escapeHtml(APP_NAME)}</p>`,
      `</div>`,
    ].join(""),
  });
}
