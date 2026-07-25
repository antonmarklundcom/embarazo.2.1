"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, wipeAllData, type AppMode } from "@/lib/db";
import { useProfile } from "@/lib/useProfile";
import { DEPARTMENTS } from "@/lib/departments";
import {
  getDueDate,
  lmpFromDueDate,
  getRawWeek,
  MAX_WEEK,
} from "@/lib/pregnancy";
import {
  isPinSet,
  setPin as savePin,
  clearPin,
  unlock,
  isUnlocked,
} from "@/lib/crypto";
import { exportBackup, backupFileName, importBackup } from "@/lib/backup";
import { PrivacyLine } from "@/components/PrivacyLine";
import { InstallCard } from "@/components/InstallCard";
import { AccountCard } from "@/components/AccountCard";

function toDateInput(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toISOString().slice(0, 10);
}

export default function AjustesPage() {
  const router = useRouter();
  const profile = useProfile();
  const [department, setDepartment] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // Editable pregnancy date (build spec §1).
  const [useDueDate, setUseDueDate] = useState(false);
  const [lmpInput, setLmpInput] = useState("");
  const [dueInput, setDueInput] = useState("");
  const [dateMsg, setDateMsg] = useState("");
  const [dateWarn, setDateWarn] = useState("");

  // Next prenatal appointment (build spec §4).
  const [apptInput, setApptInput] = useState("");
  const [apptMsg, setApptMsg] = useState("");

  const [pinExists, setPinExists] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  const [confirmWipe, setConfirmWipe] = useState(false);

  // App mode (build spec §3). Switching never deletes data.
  const [modeMsg, setModeMsg] = useState("");

  // Backup / restore (Phase 0 hardening — data never leaves the device).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState("");
  const [backupErr, setBackupErr] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<File | null>(null);

  // Persistent storage (Phase 0 hardening): ask the browser not to silently
  // evict IndexedDB under storage pressure, and show the resulting status.
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
    navigator.storage.persisted().then((already) => {
      if (already) {
        setPersisted(true);
        return;
      }
      navigator.storage.persist().then(setPersisted);
    });
  }, []);

  async function handleExport() {
    setBackupErr("");
    setBackupMsg("");
    try {
      const blob = await exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFileName();
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg("Copia descargada. Guardala en un lugar seguro.");
      setTimeout(() => setBackupMsg(""), 4000);
    } catch {
      setBackupErr("No pudimos generar la copia. Probá de nuevo.");
    }
  }

  function handlePickRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setConfirmRestoreFile(file);
  }

  async function handleRestore() {
    if (!confirmRestoreFile) return;
    setRestoring(true);
    setBackupErr("");
    setBackupMsg("");
    try {
      await importBackup(confirmRestoreFile);
      setConfirmRestoreFile(null);
      // Force a full reload so every screen re-reads the restored data.
      window.location.href = "/";
    } catch {
      setBackupErr(
        "No pudimos restaurar ese archivo. Verificá que sea una copia de seguridad de Mi Bebé.",
      );
      setRestoring(false);
    }
  }

  useEffect(() => {
    if (profile.department) setDepartment(profile.department);
  }, [profile.department]);

  useEffect(() => {
    if (profile.lmpDate) setLmpInput(toDateInput(profile.lmpDate));
    if (profile.dueDate) setDueInput(toDateInput(profile.dueDate));
  }, [profile.lmpDate, profile.dueDate]);

  useEffect(() => {
    setApptInput(toDateInput(profile.nextAppointment));
  }, [profile.nextAppointment]);

  const today = new Date().toISOString().slice(0, 10);

  async function savePregnancyDate() {
    setDateMsg("");
    setDateWarn("");
    const lmpDate = useDueDate
      ? dueInput
        ? lmpFromDueDate(new Date(`${dueInput}T00:00:00`).getTime())
        : NaN
      : lmpInput
        ? new Date(`${lmpInput}T00:00:00`).getTime()
        : NaN;

    if (Number.isNaN(lmpDate)) {
      setDateWarn("Elegí una fecha válida.");
      return;
    }
    if (lmpDate > Date.now()) {
      setDateWarn("La fecha de tu última regla no puede estar en el futuro.");
      return;
    }

    // If the date implies more than 42 weeks, warn but still allow saving.
    if (getRawWeek(lmpDate) > MAX_WEEK) {
      setDateWarn(
        "Según esta fecha, tu embarazo ya habría llegado a término. Revisá la fecha.",
      );
    }

    const rows = await db().pregnancy.toArray();
    const first = rows[0];
    if (first?.id) {
      await db().pregnancy.update(first.id, {
        lmpDate,
        dueDate: getDueDate(lmpDate),
      });
    } else {
      await db().pregnancy.add({
        lmpDate,
        dueDate: getDueDate(lmpDate),
        createdAt: Date.now(),
      });
    }
    setDateMsg("Fecha actualizada. Tu semana se recalculó.");
    setTimeout(() => setDateMsg(""), 3000);
  }

  async function persistAppointment(value: number | undefined) {
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (!first?.id) return;
    await db().profile.update(first.id, { nextAppointment: value });
    setApptMsg(value ? "Control guardado." : "Control quitado.");
    setTimeout(() => setApptMsg(""), 2500);
  }

  async function saveAppointment() {
    const value = apptInput
      ? new Date(`${apptInput}T00:00:00`).getTime()
      : undefined;
    await persistAppointment(value);
  }

  async function clearAppointment() {
    setApptInput("");
    await persistAppointment(undefined);
  }

  useEffect(() => {
    setPinExists(isPinSet());
  }, []);

  async function switchMode(next: AppMode) {
    if (next === profile.mode) return;
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (!first?.id) return;
    await db().profile.update(first.id, { mode: next });
    setModeMsg(
      next === "planeando"
        ? "Estás en modo Planeando. Tus datos se conservan."
        : "Estás en modo Embarazada. Tus datos se conservan.",
    );
    setTimeout(() => setModeMsg(""), 3500);
  }

  async function saveDepartment() {
    const row = await db().profile.toArray();
    const first = row[0];
    if (first?.id) {
      await db().profile.update(first.id, { department });
      setSavedMsg("Departamento actualizado.");
      setTimeout(() => setSavedMsg(""), 2500);
    }
  }

  async function handleSetPin() {
    if (pinInput.length < 4) {
      setPinMsg("El PIN debe tener al menos 4 dígitos.");
      return;
    }
    await savePin(pinInput);
    setPinExists(true);
    setPinInput("");
    setPinMsg("PIN activado. Tus notas se guardan cifradas.");
  }

  async function handleClearPin() {
    // Try to unlock first so we could decrypt notes if needed; for the MVP we
    // simply remove the PIN. Existing encrypted notes stay encrypted until
    // re-saved, which is acceptable and documented.
    if (!isUnlocked()) {
      const ok = await unlock(pinInput);
      if (!ok) {
        setPinMsg("PIN incorrecto.");
        return;
      }
    }
    clearPin();
    setPinExists(false);
    setPinInput("");
    setPinMsg("PIN desactivado.");
  }

  async function handleWipe() {
    await wipeAllData();
    clearPin();
    router.push("/");
    // Force a full reload so the first-run gate re-evaluates cleanly.
    if (typeof window !== "undefined") window.location.href = "/";
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Ajustes</h1>
        <PrivacyLine className="mt-1" />
      </header>

      {/* Account (A2) — renders nothing when accounts are not configured */}
      <AccountCard />

      {/* App mode (build spec §3) */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Modo de uso</h2>
        <p className="mt-1 text-sm text-muted">
          Cambiá entre seguir tu embarazo o planear/buscar embarazo. Cambiar de
          modo no borra ninguno de tus datos.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => switchMode("embarazada")}
            aria-pressed={profile.mode === "embarazada"}
            className={`min-h-[44px] rounded-tile border px-3 py-2.5 text-sm font-medium transition ${
              profile.mode === "embarazada"
                ? "border-petrol bg-petrol text-white"
                : "border-black/10 bg-cream text-ink"
            }`}
          >
            Estoy embarazada
          </button>
          <button
            type="button"
            onClick={() => switchMode("planeando")}
            aria-pressed={profile.mode === "planeando"}
            className={`min-h-[44px] rounded-tile border px-3 py-2.5 text-sm font-medium transition ${
              profile.mode === "planeando"
                ? "border-petrol bg-petrol text-white"
                : "border-black/10 bg-cream text-ink"
            }`}
          >
            Planeando / buscando
          </button>
        </div>
        {profile.mode === "embarazada" && !profile.hasPregnancy && (
          <p className="mt-2 text-sm text-terracotta">
            Para seguir tu embarazo, cargá tu fecha más abajo.
          </p>
        )}
        {modeMsg && <p className="mt-2 text-sm text-sage">{modeMsg}</p>}
      </section>

      {/* Department */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Tu departamento</h2>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 focus:border-petrol focus:outline-none"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={saveDepartment}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Guardar
        </button>
        {savedMsg && <p className="mt-2 text-sm text-sage">{savedMsg}</p>}
      </section>

      {/* Editable pregnancy date (build spec §1) — only in pregnancy mode */}
      {profile.mode === "embarazada" && (
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">
          Editar fecha de embarazo
        </h2>
        <p className="mt-1 text-sm text-muted">
          Si te equivocaste o te corrigieron la fecha, actualizala acá. Tu
          semana y trimestre se recalculan en toda la app.
        </p>

        <label className="mt-3 flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={useDueDate}
            onChange={(e) => setUseDueDate(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-black/20 accent-petrol"
          />
          <span>No sé mi última regla — usar fecha probable de parto</span>
        </label>

        {!useDueDate ? (
          <div className="mt-3">
            <label htmlFor="lmp-edit" className="block text-xs text-muted">
              Primer día de tu última menstruación
            </label>
            <input
              id="lmp-edit"
              type="date"
              value={lmpInput}
              max={today}
              onChange={(e) => setLmpInput(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
            />
          </div>
        ) : (
          <div className="mt-3">
            <label htmlFor="due-edit" className="block text-xs text-muted">
              Fecha probable de parto
            </label>
            <input
              id="due-edit"
              type="date"
              value={dueInput}
              onChange={(e) => setDueInput(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted">
              Calculamos tu última regla restando 280 días a esta fecha.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={savePregnancyDate}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Guardar fecha
        </button>
        {dateWarn && <p className="mt-2 text-sm text-terracotta">{dateWarn}</p>}
        {dateMsg && <p className="mt-2 text-sm text-sage">{dateMsg}</p>}
      </section>
      )}

      {/* Next prenatal appointment (build spec §4) — only in pregnancy mode */}
      {profile.mode === "embarazada" && (
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">
          Próximo control prenatal
        </h2>
        <p className="mt-1 text-sm text-muted">
          Anotá la fecha de tu próximo control y te lo recordamos en Inicio.
          Solo en este dispositivo, sin notificaciones.
        </p>
        <input
          type="date"
          value={apptInput}
          min={today}
          onChange={(e) => setApptInput(e.target.value)}
          className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={saveAppointment}
            className="min-h-[44px] flex-1 rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
          >
            Guardar
          </button>
          {apptInput && (
            <button
              type="button"
              onClick={clearAppointment}
              className="min-h-[44px] rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
            >
              Limpiar
            </button>
          )}
        </div>
        {apptMsg && <p className="mt-2 text-sm text-sage">{apptMsg}</p>}
      </section>
      )}

      {/* Optional PIN */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">PIN opcional</h2>
        <p className="mt-1 text-sm text-muted">
          Si activás un PIN, las notas de tu diario se guardan cifradas en este
          dispositivo. {pinExists ? "Tenés un PIN activo." : "No tenés PIN."}
        </p>
        <input
          type="password"
          inputMode="numeric"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
          placeholder={pinExists ? "Ingresá tu PIN para desactivarlo" : "Nuevo PIN (4+ dígitos)"}
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
        {pinMsg && <p className="mt-2 text-sm text-muted">{pinMsg}</p>}
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          El PIN protege las notas con cifrado del navegador. No es seguridad de
          grado bancario: depende de que tu teléfono también esté protegido.
        </p>
      </section>

      {/* Backup / restore */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Copia de seguridad</h2>
        <p className="mt-1 text-sm text-muted">
          Tus datos viven solo en este teléfono: si lo perdés, lo cambiás o
          borrás los datos del navegador, se pierden para siempre a menos que
          tengas una copia. Descargá un archivo con todos tus datos y guardalo
          en un lugar seguro (por ejemplo, envíatelo por WhatsApp o guardalo en
          Google Drive).
        </p>
        {persisted === false && (
          <p className="mt-2 text-sm text-terracotta">
            Tu navegador no garantizó guardado persistente para esta app. Hacer
            copias de seguridad periódicas es especialmente importante.
          </p>
        )}
        <button
          type="button"
          onClick={handleExport}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Descargar mis datos
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handlePickRestoreFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 min-h-[44px] w-full rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
        >
          Restaurar desde un archivo
        </button>

        {confirmRestoreFile && (
          <div className="mt-3 space-y-2 rounded-tile border border-terracotta/30 bg-terracotta/5 p-3">
            <p className="text-sm text-ink">
              Restaurar <strong>{confirmRestoreFile.name}</strong> reemplaza
              todos los datos actuales de este teléfono por los del archivo.
              Esta acción no se puede deshacer. ¿Confirmás?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoring}
                className="min-h-[44px] flex-1 rounded-tile bg-terracotta px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {restoring ? "Restaurando…" : "Sí, restaurar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRestoreFile(null)}
                disabled={restoring}
                className="min-h-[44px] flex-1 rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-petrol shadow-soft"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {backupMsg && <p className="mt-2 text-sm text-sage">{backupMsg}</p>}
        {backupErr && <p className="mt-2 text-sm text-terracotta">{backupErr}</p>}
      </section>

      {/* Install prompt (P1.1) — hides itself once installed/unavailable */}
      <InstallCard />

      {/* Privacy summary */}
      <section className="rounded-card border border-sage/30 bg-sage/5 p-4">
        <h2 className="text-base font-extrabold text-ink">Tu privacidad</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-ink">
          <li>• Podés usar la app entera sin crear una cuenta.</li>
          <li>
            • Tus datos se guardan primero en este dispositivo y funcionan sin
            internet. Si creás una cuenta, se copian para que puedas
            recuperarlos en otro teléfono.
          </li>
          <li>
            • Tus fotos de la panza y del carné{" "}
            <strong>nunca se suben</strong>, tengas cuenta o no.
          </li>
          <li>
            • Lo único que viaja al servidor es tu trimestre y tu departamento,
            para mostrarte recursos cercanos.
          </li>
          <li>• No usamos cookies de seguimiento ni rastreadores.</li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          <Link href="/privacidad" className="underline">
            Política de privacidad
          </Link>
          {" · "}
          <Link href="/terminos" className="underline">
            Términos de uso
          </Link>
        </p>
      </section>

      {/* Medical disclaimer */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Aviso médico</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Mi Bebé es una herramienta informativa y de acompañamiento. No reemplaza
          la atención de un profesional de la salud y no realiza diagnósticos.
          Ante cualquier duda o síntoma, contactá a tu sanatorio.
        </p>
      </section>

      {/* Danger zone */}
      <section className="rounded-card border border-terracotta/30 bg-terracotta/5 p-4">
        <h2 className="text-base font-medium text-terracotta">
          Borrar todos mis datos
        </h2>
        <p className="mt-1 text-sm text-muted">
          Esto borra de forma definitiva tu perfil, tu embarazo, el diario de
          síntomas y ánimo, las fotos, la fecha del próximo control, las
          pataditas, las contracciones, el peso, las checklists, tu calendario
          menstrual y el PIN. No se puede deshacer.
        </p>
        {!confirmWipe ? (
          <button
            type="button"
            onClick={() => setConfirmWipe(true)}
            className="mt-3 min-h-[44px] w-full rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-terracotta shadow-soft"
          >
            Borrar todos mis datos
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-extrabold text-ink">
              ¿Seguro? Esta acción es definitiva.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleWipe}
                className="min-h-[44px] flex-1 rounded-tile bg-terracotta px-4 py-2.5 text-sm font-medium text-white"
              >
                Sí, borrar todo
              </button>
              <button
                type="button"
                onClick={() => setConfirmWipe(false)}
                className="min-h-[44px] flex-1 rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-petrol shadow-soft"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
