import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPin,
  decryptNote,
  encryptNote,
  exportPinMaterial,
  importPinMaterial,
  isPinSet,
  isUnlocked,
  lock,
  setPin,
  unlock,
} from "./crypto";

// The module reads `localStorage` and `window` directly (it only ever runs in
// the browser). Vitest runs in node, so stand both up here rather than pulling
// in jsdom for two globals.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

beforeEach(() => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
  });
  lock();
});

describe("PIN lifecycle", () => {
  it("sets, locks and unlocks with the right PIN", async () => {
    expect(isPinSet()).toBe(false);
    await setPin("1234");
    expect(isPinSet()).toBe(true);
    expect(isUnlocked()).toBe(true);

    lock();
    expect(isUnlocked()).toBe(false);
    expect(await unlock("1234")).toBe(true);
    expect(isUnlocked()).toBe(true);
  });

  it("rejects a wrong PIN without unlocking", async () => {
    await setPin("1234");
    lock();
    expect(await unlock("9999")).toBe(false);
    expect(isUnlocked()).toBe(false);
  });

  it("clearPin removes the stored material", async () => {
    await setPin("1234");
    clearPin();
    expect(isPinSet()).toBe(false);
    expect(exportPinMaterial()).toBeNull();
  });
});

describe("note encryption", () => {
  it("round-trips ASCII", async () => {
    await setPin("1234");
    const note = "Control prenatal el lunes";
    expect(await decryptNote(await encryptNote(note))).toBe(note);
  });

  // The bug this file exists for: the old helper wrote `charCodeAt` bytes,
  // truncating every code point above U+00FF, and `decryptNote` read them back
  // as UTF-8. Every accent, ñ and emoji came back as a replacement character —
  // silent corruption of Spanish notes, which is nearly all of them.
  it("round-trips accents, ñ, ¡¿ and emoji", async () => {
    await setPin("1234");
    const note =
      "Hoy tuve náuseas y dolor de cabeza 😊 ¡mucho! El niño se movió mucho — ¿será normal?";
    const restored = await decryptNote(await encryptNote(note));
    expect(restored).toBe(note);
    expect(restored).not.toContain("�");
  });

  it("round-trips a long note without blowing the base64 encoder", async () => {
    await setPin("1234");
    const note = "á".repeat(50_000);
    expect(await decryptNote(await encryptNote(note))).toBe(note);
  });

  it("refuses to encrypt or decrypt while locked", async () => {
    await setPin("1234");
    const payload = await encryptNote("hola");
    lock();
    await expect(encryptNote("hola")).rejects.toThrow("locked");
    await expect(decryptNote(payload)).rejects.toThrow("locked");
  });

  it("accepts a PIN with non-ASCII characters", async () => {
    await setPin("contraseñá");
    lock();
    expect(await unlock("contraseñá")).toBe(true);
  });
});

describe("PIN material export/import (backup v2)", () => {
  // The second half of the same failure: notes are in IndexedDB, key material
  // is in localStorage. A backup that carries only the first restores
  // ciphertext nobody can ever open.
  it("lets a note encrypted on one device be read after restore on another", async () => {
    await setPin("4321");
    const note = "Presión 12/8, todo bien 🙂";
    const payload = await encryptNote(note);
    const material = exportPinMaterial();
    expect(material).not.toBeNull();

    // A different device: fresh storage, no PIN, no session key.
    localStorage.clear();
    lock();
    expect(isPinSet()).toBe(false);

    importPinMaterial(material);
    expect(isPinSet()).toBe(true);
    expect(await unlock("4321")).toBe(true);
    expect(await decryptNote(payload)).toBe(note);
  });

  it("importing null clears the PIN and locks the session", async () => {
    await setPin("1234");
    importPinMaterial(null);
    expect(isPinSet()).toBe(false);
    expect(isUnlocked()).toBe(false);
  });

  it("returns null when no PIN is set", () => {
    expect(exportPinMaterial()).toBeNull();
  });
});
