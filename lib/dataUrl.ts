// Inline image bytes <-> Blob, without the network.
//
// A backup file carries every photo as a `data:` URL (FileReader's
// `readAsDataURL`), and the AI render comes back as base64. Both used to be
// turned back into a Blob with `fetch(dataUrl)`. The enforced
// Content-Security-Policy (`connect-src 'self' <storage>`, next.config.ts, V1)
// refuses that fetch, so from 2026-09-12 every backup holding even one photo
// failed to restore and told the user her file was not a backup.
//
// Decoding here needs no CSP source at all, and it narrows what a backup can
// contain: a photo field must be inline base64 image bytes. A string that is
// not a data URL — `https://…`, `blob:…` — is rejected, never fetched.

/** Upper bound for one restored photo. Generous: a `downscaleImage` fallback
 * can keep the original camera file, which is larger than an upload. */
export const MAX_INLINE_IMAGE_BYTES = 32 * 1024 * 1024;

export class InlineImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InlineImageError";
  }
}

const DATA_URL = /^data:([^;,]*)((?:;[^;,]*)*);base64,([\s\S]*)$/;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * The MIME types a photo field may carry. `image/*` covers what the camera and
 * `downscaleImage` produce (jpeg, and the original file when the canvas path is
 * unavailable); `application/octet-stream` is what `readAsDataURL` writes for a
 * Blob whose `type` was empty.
 */
export function isRestorableImageType(mime: string): boolean {
  return mime.startsWith("image/") || mime === "application/octet-stream";
}

function decodedLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** base64 (no prefix) → Blob of the given type. Throws on malformed input. */
export function base64ToBlob(
  base64: string,
  mime: string,
  maxBytes: number = MAX_INLINE_IMAGE_BYTES,
): Blob {
  const clean = base64.replace(/\s+/g, "");
  if (clean.length % 4 !== 0 || !BASE64.test(clean)) {
    throw new InlineImageError("base64 inválido");
  }
  if (decodedLength(clean) > maxBytes) {
    throw new InlineImageError("imagen demasiado grande");
  }
  const binary = atob(clean);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * A `data:<mime>;base64,<bytes>` string → Blob, locally.
 *
 * `accept` decides which MIME types are allowed (photos by default). A typeless
 * Blob was serialised as `application/octet-stream`; it comes back typeless, as
 * it went in.
 */
export function dataUrlToBlob(
  value: unknown,
  options: {
    accept?: (mime: string) => boolean;
    maxBytes?: number;
  } = {},
): Blob {
  const { accept = isRestorableImageType, maxBytes = MAX_INLINE_IMAGE_BYTES } =
    options;
  if (typeof value !== "string") {
    throw new InlineImageError("la foto no es un dato en línea");
  }
  const match = DATA_URL.exec(value);
  if (!match) throw new InlineImageError("la foto no es un dato en línea");
  const mime = (match[1] ?? "").trim().toLowerCase() || "application/octet-stream";
  if (!accept(mime)) throw new InlineImageError(`tipo no admitido: ${mime}`);
  const blobType = mime === "application/octet-stream" ? "" : mime;
  return base64ToBlob(match[3] ?? "", blobType, maxBytes);
}
