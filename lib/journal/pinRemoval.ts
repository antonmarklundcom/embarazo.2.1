import { db, type ConflictRow, type JournalEntry } from "@/lib/db";
import { clearPin, decryptNote, unlock } from "@/lib/crypto";

// F04 — turning the diary PIN off without destroying the diary.
//
// The key that opens an encrypted note is derived from the PIN plus a salt that
// lives only in this browser's localStorage. `clearPin()` deletes the salt, so
// once it has run, every note still encrypted is unreadable forever — setting
// the same PIN again draws a new salt and derives a different key. Removing the
// PIN used to call `clearPin()` straight after unlocking and report success.
//
// The order here is the whole fix:
//
//   1. unlock (the PIN is checked against the stored verifier);
//   2. decrypt EVERY encrypted note, and every losing copy kept in `conflicts`,
//      into memory — any failure stops here with the PIN and the notes intact;
//   3. write the plaintext in one Dexie transaction, refusing if a note changed
//      since step 2;
//   4. only after that commits, remove the key material.
//
// Step 2 cannot happen inside the transaction: WebCrypto promises are not
// Dexie promises, and awaiting one would let IndexedDB commit the transaction
// early. Hence the compare-and-write in step 3.
//
// What the user must be told (Ajustes says it before the button): a decrypted
// note is an ordinary record. Encrypted bodies are withheld from sync
// (`WITHHELD_NOTE`, lib/sync/merge.ts); plaintext ones are not, so with an
// account they are backed up like the rest of the diary from now on.

export type RemovePinOutcome =
  | { ok: true; decrypted: number }
  | { ok: false; reason: "wrong-pin" | "decrypt-failed" | "changed" };

class NoteChanged extends Error {}

function encryptedPayload(
  payload: ConflictRow["localPayload"],
): payload is Record<string, unknown> & { note: string } {
  return (
    payload !== null &&
    payload.noteEncrypted === true &&
    typeof payload.note === "string"
  );
}

export async function removePinSafely(pin: string): Promise<RemovePinOutcome> {
  // Always asked for, even when the diary is already unlocked: this turns
  // private text into ordinary records, so the person holding the phone has
  // to prove it is theirs to turn.
  if (!(await unlock(pin))) {
    return { ok: false, reason: "wrong-pin" };
  }

  // Tombstones are left alone: a deleted note is never shown and its body
  // never syncs (`toPayload` sends no payload for a deleted record), so there
  // is nothing to recover and no reason to make it readable.
  const entries = (await db().journalEntries.toArray()).filter(
    (row): row is JournalEntry & { id: number } =>
      row.noteEncrypted === true && row.id !== undefined && !row.deletedAt,
  );
  const conflicts = (await db().conflicts.toArray()).filter(
    (row): row is ConflictRow & { id: number } =>
      row.store === "journalEntries" &&
      row.id !== undefined &&
      encryptedPayload(row.localPayload),
  );

  const plainEntries = new Map<number, string>();
  const plainConflicts = new Map<number, string>();
  try {
    for (const row of entries) {
      plainEntries.set(row.id, await decryptNote(row.note));
    }
    for (const row of conflicts) {
      plainConflicts.set(row.id, await decryptNote(row.localPayload!.note as string));
    }
  } catch {
    return { ok: false, reason: "decrypt-failed" };
  }

  try {
    await db().transaction("rw", db().journalEntries, db().conflicts, async () => {
      for (const row of entries) {
        const current = await db().journalEntries.get(row.id);
        if (!current || current.note !== row.note || current.noteEncrypted !== true) {
          throw new NoteChanged();
        }
        // A real change of the note's form: the stamping hook marks it dirty
        // with a fresh `updatedAt`, which is what lets the readable body reach
        // the user's other devices.
        await db().journalEntries.update(row.id, {
          note: plainEntries.get(row.id) ?? "",
          noteEncrypted: false,
        });
      }
      for (const row of conflicts) {
        const current = await db().conflicts.get(row.id);
        if (!current || current.localPayload?.note !== row.localPayload?.note) {
          throw new NoteChanged();
        }
        await db().conflicts.update(row.id, {
          localPayload: {
            ...current.localPayload,
            note: plainConflicts.get(row.id) ?? "",
            noteEncrypted: false,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof NoteChanged) return { ok: false, reason: "changed" };
    throw error;
  }

  clearPin();
  return { ok: true, decrypted: entries.length };
}

/** How many notes on this device are encrypted right now (for the PIN card). */
export async function encryptedNoteCount(): Promise<number> {
  try {
    return (await db().journalEntries.toArray()).filter(
      (row) => row.noteEncrypted === true && !row.deletedAt,
    ).length;
  } catch {
    return 0;
  }
}
