import { useEffect, useState } from "react";

import {
  MIN_PIN_LENGTH,
  isPinSet,
  setPin as savePin,
} from "@/lib/crypto";
import { encryptedNoteCount, removePinSafely } from "@/lib/journal/pinRemoval";

// W4: the optional PIN card (K18), moved verbatim out of AjustesClient with its
// draft state, the effect that reads whether a PIN exists and the two handlers
// only it uses. It stayed in the shell only so `lib/pinPolicy.test.ts` could
// read that file by path; the test now reads this one.
export function PinSettings() {
  const [pinExists, setPinExists] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  const [encryptedNotes, setEncryptedNotes] = useState(0);

  useEffect(() => {
    setPinExists(isPinSet());
    void encryptedNoteCount().then(setEncryptedNotes);
  }, []);

  async function handleSetPin() {
    // K18 — six digits, not four. The encrypted note is not only on this
    // phone any more; it syncs, so the ciphertext is somewhere it can be
    // attacked offline (see MIN_PIN_LENGTH in lib/crypto.ts).
    if (pinInput.length < MIN_PIN_LENGTH) {
      setPinMsg(`El PIN tiene que tener al menos ${MIN_PIN_LENGTH} dígitos.`);
      return;
    }
    await savePin(pinInput);
    setPinExists(true);
    setPinInput("");
    setPinMsg("PIN activado. Tus notas se guardan cifradas.");
  }

  async function handleClearPin() {
    // F04: removing the key material without decrypting first made every
    // encrypted note unreadable forever. `removePinSafely` decrypts and
    // rewrites all of them, and only then removes the PIN; on any failure the
    // PIN and the notes stay exactly as they were.
    const outcome = await removePinSafely(pinInput);
    if (!outcome.ok) {
      setPinMsg(
        outcome.reason === "wrong-pin"
          ? "PIN incorrecto."
          : outcome.reason === "changed"
            ? "Tus notas cambiaron mientras desactivábamos el PIN. Probá de nuevo."
            : "No pudimos abrir todas tus notas con este PIN, así que lo dejamos activo. Tus notas no cambiaron.",
      );
      return;
    }
    setPinExists(false);
    setPinInput("");
    setEncryptedNotes(0);
    setPinMsg(
      outcome.decrypted > 0
        ? `PIN desactivado. ${outcome.decrypted === 1 ? "Tu nota quedó" : `Tus ${outcome.decrypted} notas quedaron`} sin cifrar.`
        : "PIN desactivado.",
    );
  }

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">PIN opcional</h2>
      <p className="mt-1 text-sm text-muted">
        Si activás un PIN, el texto de las notas de tu diario se cifra en
        este teléfono antes de guardarse. Ese texto cifrado no se sube al
        servidor: queda en este teléfono y en las copias de seguridad que
        descargues. El resto de cada entrada (semana, ánimo, síntomas) se
        respalda como siempre si tenés cuenta.{" "}
        {pinExists ? "Tenés un PIN activo." : "No tenés PIN."}
      </p>
      <input
        type="password"
        inputMode="numeric"
        value={pinInput}
        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
        placeholder={
          pinExists
            ? "Ingresá tu PIN para desactivarlo"
            : `Nuevo PIN (${MIN_PIN_LENGTH}+ dígitos)`
        }
        className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 focus:border-petrol focus:outline-none"
      />
      {!pinExists ? (
        <button
          type="button"
          onClick={handleSetPin}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Activar PIN
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClearPin}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
        >
          Desactivar PIN
        </button>
      )}
      {pinExists && encryptedNotes > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Si lo desactivás, primero desciframos tus notas en este teléfono y
          quedan como texto normal. Con cuenta, desde ese momento se
          respaldan como el resto de tus registros.
        </p>
      )}
      {pinMsg && <p className="mt-2 text-sm text-muted">{pinMsg}</p>}
      {/* K18 — what it protects against, said plainly. The old line ("no es
          seguridad de grado bancario") was honest about the tone and vague
          about the thing that matters: the ciphertext leaves the phone, so
          the PIN's length is what stands between a leaked table and a
          readable diary. A user choosing a number deserves to know that. */}
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        El PIN no se guarda en ningún lado: de él se deriva la clave, cada
        vez. Por eso, si lo olvidás, esas notas no se recuperan — ni por
        nosotros. Y por eso pedimos {MIN_PIN_LENGTH} dígitos: un número corto
        se puede adivinar probando todas las combinaciones. No reemplaza el
        bloqueo de pantalla de tu teléfono.
      </p>
    </section>
  );
}
