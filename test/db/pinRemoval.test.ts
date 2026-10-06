import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { encryptNote, isPinSet, lock, setPin, unlock, decryptNote } from "@/lib/crypto";
import { removePinSafely } from "@/lib/journal/pinRemoval";

// F04 — removing the diary PIN must never leave a note unreadable.

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
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
  lock();
});

const T = Date.UTC(2026, 8, 1);

async function encryptedEntry(text: string, extra: Record<string, unknown> = {}) {
  const note = await encryptNote(text);
  const id = await db().journalEntries.add({
    week: 20,
    symptoms: [],
    note,
    noteEncrypted: true,
    createdAt: T,
    ...extra,
  } as never);
  return { id: id as number, note };
}

describe("removePinSafely", () => {
  it("decrypts every note (and kept conflict copies) before removing the key", async () => {
    await setPin("123456");
    const a = await encryptedEntry("primera nota ñandú 🍼");
    const b = await encryptedEntry("segunda");
    const conflictNote = await encryptNote("la versión que perdió");
    const conflictId = await db().conflicts.add({
      store: "journalEntries",
      recordId: "r-1",
      detectedAt: T,
      localUpdatedAt: T,
      remoteUpdatedAt: T + 1,
      localPayload: { note: conflictNote, noteEncrypted: true, week: 20 },
      resolved: 0,
    });
    await db().journalEntries.update(a.id, { dirty: 0 });
    lock();

    const outcome = await removePinSafely("123456");

    expect(outcome).toEqual({ ok: true, decrypted: 2 });
    expect(isPinSet()).toBe(false);
    const rowA = await db().journalEntries.get(a.id);
    expect(rowA?.note).toBe("primera nota ñandú 🍼");
    expect(rowA?.noteEncrypted).toBe(false);
    // A real change: it must reach the user's other devices.
    expect(rowA?.dirty).toBe(1);
    expect((await db().journalEntries.get(b.id))?.note).toBe("segunda");
    const conflict = await db().conflicts.get(conflictId as number);
    expect(conflict?.localPayload).toMatchObject({ note: "la versión que perdió", noteEncrypted: false });
  });

  it("refuses a wrong PIN and changes nothing", async () => {
    await setPin("123456");
    const a = await encryptedEntry("secreto");
    lock();

    expect(await removePinSafely("654321")).toEqual({ ok: false, reason: "wrong-pin" });
    expect(isPinSet()).toBe(true);
    expect((await db().journalEntries.get(a.id))?.note).toBe(a.note);
  });

  it("asks for the PIN even when the diary is already unlocked", async () => {
    await setPin("123456");
    await encryptedEntry("secreto");
    expect(await removePinSafely("000000")).toEqual({ ok: false, reason: "wrong-pin" });
    expect(isPinSet()).toBe(true);
  });

  it("keeps the PIN and every note when any note cannot be decrypted", async () => {
    await setPin("111111");
    const orphan = await encryptedEntry("escrita con otra clave");
    await setPin("123456"); // new salt: the first note is not openable with this key
    const good = await encryptedEntry("abrible");
    lock();

    expect(await removePinSafely("123456")).toEqual({ ok: false, reason: "decrypt-failed" });
    expect(isPinSet()).toBe(true);
    expect((await db().journalEntries.get(orphan.id))?.noteEncrypted).toBe(true);
    expect((await db().journalEntries.get(good.id))?.note).toBe(good.note);
    expect(await unlock("123456")).toBe(true);
    expect(await decryptNote(good.note)).toBe("abrible");
  });

  it("leaves a deleted note's tombstone untouched", async () => {
    await setPin("123456");
    const gone = await encryptedEntry("borrada", { deletedAt: T + 5, updatedAt: T + 5, dirty: 0 });
    lock();

    expect(await removePinSafely("123456")).toEqual({ ok: true, decrypted: 0 });
    const row = await db().journalEntries.get(gone.id);
    expect(row?.updatedAt).toBe(T + 5);
    expect(row?.dirty).toBe(0);
  });

  it("works with no notes at all", async () => {
    await setPin("123456");
    expect(await removePinSafely("123456")).toEqual({ ok: true, decrypted: 0 });
    expect(isPinSet()).toBe(false);
  });
});
