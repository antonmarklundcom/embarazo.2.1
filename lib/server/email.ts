import "server-only";
import { APP_NAME } from "@/lib/brand";

// Awaited transactional delivery over HTTPS, with no SDK or client secrets.
// Unset EMAIL_PROVIDER preserves Resend. Cloudflare is an explicit alternative;
// failures never trigger a second-provider retry that could duplicate mail.
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "no-reply@embarazo.com.py";
type MailConfig = { provider: "resend"; key: string; from: string }
  | { provider: "cloudflare"; key: string; from: string; accountId: string };

function mailConfig(): MailConfig | null {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase() || "resend";
  if (provider === "resend") {
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key || /[\r\n]/.test(key)) return null;
    const address = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
    return { provider, key, from: APP_NAME + " <" + address + ">" };
  }
  if (provider !== "cloudflare") return null;
  const key = process.env.CLOUDFLARE_EMAIL_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID?.trim();
  const from = process.env.CLOUDFLARE_EMAIL_FROM?.trim() || DEFAULT_FROM;
  // Account id is a path component. Reject malformed ids rather than sending a
  // credential to a surprising endpoint. Cloudflare expects a plain sender.
  if (!key || /[\r\n]/.test(key) || !accountId || !/^[a-f0-9]{32}$/i.test(accountId)
    || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)) return null;
  return { provider, key, from, accountId };
}

/** Transport is configured; domain entitlement/delivery still requires live verification. */
export function isEmailConfigured(): boolean { return mailConfig() !== null; }
interface Message { to: string; subject: string; text: string; html: string; }

function recipientIn(value: unknown, recipient: string): boolean {
  return Array.isArray(value) && value.some(address => typeof address === "string"
    && address.trim().toLowerCase() === recipient.trim().toLowerCase());
}

/** HTTP 200 can contain a permanent bounce; only this recipient's success counts. */
function cloudflareAccepted(body: unknown, recipient: string): boolean {
  if (!body || typeof body !== "object") return false;
  const response = body as Record<string, unknown>;
  if (response.success !== true || !Array.isArray(response.errors) || response.errors.length > 0) return false;
  if (!response.result || typeof response.result !== "object") return false;
  const result = response.result as Record<string, unknown>;
  if (![result.delivered,result.queued,result.permanent_bounces].every(Array.isArray)) return false;
  return !recipientIn(result.permanent_bounces, recipient)
    && (recipientIn(result.delivered, recipient) || recipientIn(result.queued, recipient));
}

async function send(message: Message): Promise<void> {
  const config = mailConfig();
  // Callers handle absence through isEmailConfigured(); preserve the old no-op.
  if (!config) return;
  const endpoint = config.provider === "resend" ? RESEND_ENDPOINT
    : "https://api.cloudflare.com/client/v4/accounts/" + config.accountId + "/email/sending/send";
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: "Bearer " + config.key, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, to: config.provider === "resend" ? [message.to] : message.to,
        subject: message.subject, text: message.text, html: message.html }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Neither thrown network errors nor provider bodies reach logs: they can
    // echo the reset credential, email address, message, or bearer token.
    throw new Error("Email transport unavailable.");
  }
  if (!response.ok) throw new Error("Email provider rejected the message (HTTP " + response.status + ").");
  if (config.provider === "cloudflare") {
    let body: unknown;
    try { body = await response.json(); }
    catch { throw new Error("Email provider returned an invalid delivery response."); }
    if (!cloudflareAccepted(body,message.to)) throw new Error("Email provider did not accept delivery.");
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
 * @throws when the message could not be handed to the configured provider. Silent (no-op) when
 *   no valid transport is configured.
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

/**
 * The email-confirmation email, sent once right after an email + password
 * account is created. Same voice and same two-part body as the reset mail
 * above.
 *
 * The copy is careful about one thing: confirming is **not** a condition for
 * using the app. `authorize()` in `lib/server/auth.ts` does not check
 * `emailVerified`, on purpose (every account created before this feature
 * shipped has a null there forever), so a mail that said "confirmá para poder
 * entrar" would be a lie that also scares people. It says what is true: the
 * account already works, and confirming is what lets us reach her if she ever
 * forgets her password.
 *
 * @throws when the message could not be handed to the configured provider. Silent (no-op) when
 *   no valid transport is configured.
 */
export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
): Promise<void> {
  const safeUrl = escapeHtml(verifyUrl);
  await send({
    to,
    subject: `Confirmá tu correo de ${APP_NAME}`,
    text: [
      `Hola,`,
      ``,
      `Creaste tu cuenta de ${APP_NAME} con este correo. Abrí este enlace para confirmarlo:`,
      ``,
      verifyUrl,
      ``,
      `El enlace vence en 24 horas y se puede usar una sola vez.`,
      ``,
      `Tu cuenta ya funciona igual: confirmar el correo es lo que nos deja ayudarte a entrar si algún día olvidás tu contraseña.`,
      ``,
      `Si no creaste ninguna cuenta, ignorá este correo.`,
      ``,
      `— ${APP_NAME}`,
    ].join("\n"),
    html: [
      `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.6;color:#22303c">`,
      `<p>Hola,</p>`,
      `<p>Creaste tu cuenta de ${escapeHtml(APP_NAME)} con este correo. Tocá el botón para confirmarlo:</p>`,
      `<p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#1f6f78;color:#ffffff;font-weight:700;text-decoration:none">Confirmar mi correo</a></p>`,
      `<p style="font-size:14px;color:#6b7b8a">O copiá este enlace: ${safeUrl}</p>`,
      `<p><strong>El enlace vence en 24 horas</strong> y se puede usar una sola vez.</p>`,
      `<p>Tu cuenta ya funciona igual: confirmar el correo es lo que nos deja ayudarte a entrar si algún día olvidás tu contraseña.</p>`,
      `<p>Si no creaste ninguna cuenta, ignorá este correo.</p>`,
      `<p>— ${escapeHtml(APP_NAME)}</p>`,
      `</div>`,
    ].join(""),
  });
}
