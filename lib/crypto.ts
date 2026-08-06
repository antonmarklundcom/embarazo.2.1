// Optional app PIN → key derivation for encrypting journal notes at rest.
// Build spec §5: be honest — this relies on per-origin isolation + device
// encryption. We do NOT claim hardware-keystore/SQLCipher-grade security.
//
// The PIN derives an AES-GCM key via PBKDF2 (WebCrypto). We persist only the
// salt and a verifier (never the PIN itself). The derived key lives in memory
// for the session.

const PIN_SALT_KEY = "mibebe.pin.salt";
const PIN_VERIFIER_KEY = "mibebe.pin.verifier";
const PBKDF2_ITERATIONS = 150_000;

let sessionKey: CryptoKey | null = null;

// WebCrypto's lib.dom types want `BufferSource` backed by a plain ArrayBuffer.
// These helpers keep the byte buffers in that exact shape so casts aren't needed.
function bytes(n: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(n));
}
function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(bytes(n));
}

/**
 * Text → UTF-8 bytes. Everything we encrypt is human text in es-PY, so this
 * MUST be a real UTF-8 encode: a naive `charCodeAt` loop truncates every code
 * point above U+00FF and produces bytes that `TextDecoder` (UTF-8) then reads
 * back as replacement characters — i.e. silent corruption of any note
 * containing á, é, í, ó, ú, ñ, ¡, ¿ or an emoji. In Spanish that is most notes.
 */
function utf8Bytes(s: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(s);
  const out = bytes(encoded.length);
  out.set(encoded);
  return out;
}

/** Raw bytes ↔ base64. `latinBytes` is only safe for base64/binary strings,
 * whose chars are all ≤ U+00FF by construction. */
function latinBytes(s: string): Uint8Array<ArrayBuffer> {
  const out = bytes(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function toB64(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  // Chunked so a long note cannot blow the argument limit of `String.fromCharCode`.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < view.length; i += CHUNK) {
    binary += String.fromCharCode(...view.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
function fromB64(s: string): Uint8Array<ArrayBuffer> {
  return latinBytes(atob(s));
}

async function deriveKey(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    utf8Bytes(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function isPinSet(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(PIN_VERIFIER_KEY);
}

export function isUnlocked(): boolean {
  return sessionKey !== null;
}

/** Create a PIN: derive key, store salt + an encrypted verifier token. */
export async function setPin(pin: string): Promise<void> {
  const salt = randomBytes(16);
  const key = await deriveKey(pin, salt);
  const iv = randomBytes(12);
  const verifier = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    utf8Bytes("mibebe-verifier"),
  );
  localStorage.setItem(PIN_SALT_KEY, toB64(salt.buffer));
  localStorage.setItem(
    PIN_VERIFIER_KEY,
    `${toB64(iv.buffer)}:${toB64(verifier)}`,
  );
  sessionKey = key;
}

/** Verify a PIN and unlock the session. Returns false on wrong PIN. */
export async function unlock(pin: string): Promise<boolean> {
  const saltB64 = localStorage.getItem(PIN_SALT_KEY);
  const verifier = localStorage.getItem(PIN_VERIFIER_KEY);
  if (!saltB64 || !verifier) return false;
  const [ivB64, dataB64] = verifier.split(":");
  if (!ivB64 || !dataB64) return false;
  try {
    const key = await deriveKey(pin, fromB64(saltB64));
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(ivB64) },
      key,
      fromB64(dataB64),
    );
    if (new TextDecoder().decode(plain) !== "mibebe-verifier") return false;
    sessionKey = key;
    return true;
  } catch {
    return false;
  }
}

export function lock(): void {
  sessionKey = null;
}

/** Remove the PIN entirely (notes should be decrypted by the caller first). */
export function clearPin(): void {
  localStorage.removeItem(PIN_SALT_KEY);
  localStorage.removeItem(PIN_VERIFIER_KEY);
  sessionKey = null;
}

/**
 * The PIN material that must travel with a backup.
 *
 * Encrypted notes live in IndexedDB, but the salt + verifier that make them
 * readable live in localStorage — which `exportBackup()` does not touch. Left
 * as it was, restoring a backup onto a new phone produced permanently
 * unreadable notes: the ciphertext was there, the key material was not.
 *
 * This is NOT the PIN. Without the PIN, the salt is useless: it only lets the
 * same PIN derive the same key again, exactly as it does on the original
 * device. Whoever holds the backup file already holds the ciphertext.
 */
export interface PinMaterial {
  salt: string;
  verifier: string;
}

export function exportPinMaterial(): PinMaterial | null {
  if (typeof window === "undefined") return null;
  const salt = localStorage.getItem(PIN_SALT_KEY);
  const verifier = localStorage.getItem(PIN_VERIFIER_KEY);
  if (!salt || !verifier) return null;
  return { salt, verifier };
}

/**
 * Install PIN material from a restored backup, replacing whatever this device
 * had. `null` clears it — a backup taken without a PIN restores an app without
 * a PIN, so the restored (plaintext) notes stay readable.
 */
export function importPinMaterial(material: PinMaterial | null): void {
  sessionKey = null;
  if (!material?.salt || !material?.verifier) {
    localStorage.removeItem(PIN_SALT_KEY);
    localStorage.removeItem(PIN_VERIFIER_KEY);
    return;
  }
  localStorage.setItem(PIN_SALT_KEY, material.salt);
  localStorage.setItem(PIN_VERIFIER_KEY, material.verifier);
}

export async function encryptNote(plaintext: string): Promise<string> {
  if (!sessionKey) throw new Error("locked");
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sessionKey,
    utf8Bytes(plaintext),
  );
  return `${toB64(iv.buffer)}:${toB64(data)}`;
}

export async function decryptNote(payload: string): Promise<string> {
  if (!sessionKey) throw new Error("locked");
  const [ivB64, dataB64] = payload.split(":");
  if (!ivB64 || !dataB64) return "";
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) },
    sessionKey,
    fromB64(dataB64),
  );
  return new TextDecoder().decode(plain);
}
