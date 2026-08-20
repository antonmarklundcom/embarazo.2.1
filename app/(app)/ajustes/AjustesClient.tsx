"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, wipeAllData, type AppMode, type BabyIdentity, type Role } from "@/lib/db";
import { clearOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { CompanionReminderSettings } from "@/components/CompanionReminderSettings";
import { PhotoBackupSettings } from "@/components/PhotoBackupSettings";
import { companionViewOf, useSharedViews } from "@/lib/sharing/useSharedViews";
import {
  combineDateTime,
  toDateInput as appointmentDateInput,
  toTimeInput,
} from "@/lib/appointments";
import { ROLE_ONBOARDING_COPY, ROLE_ORDER } from "@/lib/roleCopy";
import { useProfile } from "@/lib/useProfile";
import { DEPARTMENTS } from "@/lib/departments";
import {
  getDueDate,
  lmpFromDueDate,
  getRawWeek,
  MAX_WEEK,
  GESTATION_DAYS,
} from "@/lib/pregnancy";
import {
  MIN_PIN_LENGTH,
  isPinSet,
  setPin as savePin,
  clearPin,
  unlock,
  isUnlocked,
} from "@/lib/crypto";
import { exportBackup, backupFileName, importBackup } from "@/lib/backup";
import { PushSettings } from "@/components/PushSettings";
import { saveNextAppointment } from "@/lib/appointments.client";
import { syncNow } from "@/lib/sync/client";
import { PrivacyLine } from "@/components/PrivacyLine";
import { FamiliaSettings } from "@/components/FamiliaSettings";
import { InstallCard } from "@/components/InstallCard";
import { InviteFriend } from "@/components/InviteFriend";

function toDateInput(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toISOString().slice(0, 10);
}

// B4: groups the growing settings list into labeled sections (cuenta ·
// bebé · embarazo · notificaciones · privacidad · datos) instead of one
// long flat list. A group with no content today (bebé, notificaciones —
// nothing to show until B2/B5 land) simply isn't rendered rather than
// showing an empty header; future tasks that add content there should wrap
// it in <SettingsGroup title="Bebé"> / "Notificaciones" alongside these.
function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// BUILD-PLAN A2 — the interactive half of /ajustes. The route's page.tsx is a
// server component now (it reads the session), so this is a client component it
// renders, with the server-rendered account block handed in as `account`.
export function AjustesClient({ account }: { account: React.ReactNode }) {
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
  /** K8 — optional hour of the control. Blank means "date only". */
  const [apptTimeInput, setApptTimeInput] = useState("");
  // K8. Fetched once here and passed down, rather than each component asking:
  // the push schedule is replaced wholesale on every publish, so the appointment
  // editor and the notification toggles all have to know about the companion
  // poke or they will drop it. Never cached (K2) — this is the live answer.
  const shared = useSharedViews();
  const companionView = companionViewOf(shared.views);
  const companionAppointmentAt = companionView?.snapshot?.nextAppointmentAt ?? null;
  const [apptMsg, setApptMsg] = useState("");

  const [pinExists, setPinExists] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  const [confirmWipe, setConfirmWipe] = useState(false);

  // App mode (build spec §3). Switching never deletes data.
  const [modeMsg, setModeMsg] = useState("");

  // Adjustable pregnancy length + planned delivery date (B3).
  const [gestationInput, setGestationInput] = useState(String(GESTATION_DAYS));
  const [gestationMsg, setGestationMsg] = useState("");
  const [plannedInput, setPlannedInput] = useState("");
  const [plannedMsg, setPlannedMsg] = useState("");

  // Baby identity / twins (B2). Local editable copy of profile.babies names.
  const [babyNames, setBabyNames] = useState<string[]>([""]);
  const [babyMsg, setBabyMsg] = useState("");

  // Relationship role (B1). Editable, per feature map #1's "editable later".
  const [roleMsg, setRoleMsg] = useState("");

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
      // A5: "Descargar mis datos" must include synced data. The device is the
      // source of truth, but a record written on another phone lives only on
      // the server until it is pulled — so pull first, then export. This is a
      // no-op (and silent) without an account, which is the common case.
      await syncNow();
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
      // Same reasoning as handleWipe: the restored file is the truth about this
      // device now, and a leftover onboarding draft is not part of it.
      clearOnboardingDraft();
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
    if (profile.babies.length > 0) {
      setBabyNames(profile.babies.map((b) => b.name ?? ""));
    }
  }, [profile.babies]);

  useEffect(() => {
    if (profile.lmpDate) setLmpInput(toDateInput(profile.lmpDate));
    if (profile.dueDate) setDueInput(toDateInput(profile.dueDate));
  }, [profile.lmpDate, profile.dueDate]);

  useEffect(() => {
    if (profile.gestationDays) setGestationInput(String(profile.gestationDays));
  }, [profile.gestationDays]);

  useEffect(() => {
    setPlannedInput(toDateInput(profile.plannedDeliveryDate));
  }, [profile.plannedDeliveryDate]);

  useEffect(() => {
    setApptInput(appointmentDateInput(profile.nextAppointment));
    setApptTimeInput(toTimeInput(profile.nextAppointment));
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

  async function saveGestationLength() {
    setGestationMsg("");
    const days = Number(gestationInput);
    if (!Number.isFinite(days) || days < 140 || days > 320) {
      setGestationMsg("Ingresá una duración válida (entre 140 y 320 días).");
      return;
    }
    const rows = await db().pregnancy.toArray();
    const first = rows[0];
    if (!first?.id) return;
    await db().pregnancy.update(first.id, {
      gestationDays: days,
      dueDate: getDueDate(first.lmpDate, days),
    });
    setGestationMsg("Duración actualizada. Tu fecha probable de parto se recalculó.");
    setTimeout(() => setGestationMsg(""), 3500);
  }

  async function savePlannedDeliveryDate() {
    const rows = await db().pregnancy.toArray();
    const first = rows[0];
    if (!first?.id) return;
    const value = plannedInput
      ? new Date(`${plannedInput}T00:00:00`).getTime()
      : undefined;
    await db().pregnancy.update(first.id, { plannedDeliveryDate: value });
    setPlannedMsg(value ? "Fecha planificada guardada." : "Fecha planificada quitada.");
    setTimeout(() => setPlannedMsg(""), 2500);
  }

  async function persistAppointment(value: number | undefined) {
    // K7: the write, the push re-schedule and the snapshot republish moved into
    // `lib/appointments/save.ts`, which the home screen's inline editor now
    // shares. Two editors for one field is two chances to forget one of the
    // three — see that file's comment for what each is for.
    await saveNextAppointment(value, companionAppointmentAt);
    setApptMsg(value ? "Control guardado." : "Control quitado.");
    setTimeout(() => setApptMsg(""), 2500);
  }

  async function saveAppointment() {
    // K8: date + optional time, combined into the one stored number. Local
    // midnight is the "no time given" convention (lib/appointments.ts).
    await persistAppointment(combineDateTime(apptInput, apptTimeInput));
  }

  async function clearAppointment() {
    setApptInput("");
    setApptTimeInput("");
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

  async function saveBabyNames() {
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (!first?.id) return;
    const babies: BabyIdentity[] = babyNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name) => ({ name }));
    await db().profile.update(first.id, { babies });
    setBabyMsg("Guardado.");
    setTimeout(() => setBabyMsg(""), 2500);
  }

  function addBabyNameField() {
    setBabyNames((names) => [...names, ""]);
  }

  function removeBabyNameField(index: number) {
    setBabyNames((names) => names.filter((_, i) => i !== index));
  }

  async function switchRole(next: Role) {
    if (next === profile.role) return;
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (!first?.id) return;
    await db().profile.update(first.id, { role: next });
    setRoleMsg(`Guardado: ${ROLE_ONBOARDING_COPY[next].title}.`);
    setTimeout(() => setRoleMsg(""), 3500);
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
    // K1: a draft that says "the profile is already saved" would resume the
    // user into an onboarding whose remaining steps write no profile at all.
    clearOnboardingDraft();
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

      {/* Account block (A2). Server-rendered upstream: this file never sees a
          session, a token or lib/server/*. */}
      <SettingsGroup title="Cuenta">
        {account}
      </SettingsGroup>

      {/* K7 — the Familia group. `/familia` shipped with E1 and was reachable
          from nowhere in the app; this is the settings half of the fix. */}
      <SettingsGroup title="Familia">
        <FamiliaSettings />
      </SettingsGroup>

      <SettingsGroup title="Embarazo">
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

      {/* Relationship role (B1) */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">¿Cómo te describís vos?</h2>
        <p className="mt-1 text-sm text-muted">
          Ajusta cómo te habla la app. No cambia tus datos.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ROLE_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => switchRole(r)}
              aria-pressed={profile.role === r}
              className={`min-h-[44px] rounded-tile border px-3 py-2.5 text-sm font-medium transition ${
                profile.role === r
                  ? "border-petrol bg-petrol text-white"
                  : "border-black/10 bg-cream text-ink"
              }`}
            >
              {ROLE_ONBOARDING_COPY[r].title}
            </button>
          ))}
        </div>
        {roleMsg && <p className="mt-2 text-sm text-sage">{roleMsg}</p>}
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

      {/* Pregnancy settings: adjustable length + planned delivery date (B3) */}
      {profile.mode === "embarazada" && (
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Duración del embarazo</h2>
        <p className="mt-1 text-sm text-muted">
          Por defecto usamos 280 días (40 semanas). Ajustala si tu médico/a te
          indicó una duración distinta.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={140}
            max={320}
            value={gestationInput}
            onChange={(e) => setGestationInput(e.target.value)}
            className="min-h-[44px] w-24 rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
          />
          <span className="text-sm text-muted">días</span>
        </div>
        <button
          type="button"
          onClick={saveGestationLength}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Guardar duración
        </button>
        {gestationMsg && <p className="mt-2 text-sm text-sage">{gestationMsg}</p>}

        <h2 className="mt-5 text-base font-extrabold text-ink">
          Fecha de parto planificada
        </h2>
        <p className="mt-1 text-sm text-muted">
          Si tenés una cesárea programada u otra fecha planificada, distinta a
          la fecha probable de parto estimada.
        </p>
        <input
          type="date"
          value={plannedInput}
          onChange={(e) => setPlannedInput(e.target.value)}
          className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
        />
        <button
          type="button"
          onClick={savePlannedDeliveryDate}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Guardar fecha planificada
        </button>
        {plannedMsg && <p className="mt-2 text-sm text-sage">{plannedMsg}</p>}
      </section>
      )}

      {/* Baby identity / twins (B2) — only in pregnancy mode */}
      {profile.mode === "embarazada" && (
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Nombre de tu bebé</h2>
        <p className="mt-1 text-sm text-muted">
          Lo usamos para personalizar la app. Si son mellizos o más, agregá un
          nombre por cada uno.
        </p>
        <div className="mt-3 space-y-2">
          {babyNames.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setBabyNames((names) =>
                    names.map((n, j) => (j === i ? e.target.value : n)),
                  )
                }
                placeholder={i === 0 ? "Ej: Silvia" : `Bebé ${i + 1}`}
                className="min-h-[44px] flex-1 rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
              />
              {babyNames.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBabyNameField(i)}
                  aria-label={`Quitar nombre ${i + 1}`}
                  className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile border border-black/10 text-muted"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addBabyNameField}
          className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
        >
          + Agregar otro bebé (mellizos)
        </button>
        <button
          type="button"
          onClick={saveBabyNames}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Guardar
        </button>
        {babyMsg && <p className="mt-2 text-sm text-sage">{babyMsg}</p>}
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
        <div className="mt-3 flex gap-2">
          <input
            id="appt-date"
            type="date"
            value={apptInput}
            min={today}
            onChange={(e) => setApptInput(e.target.value)}
            className="min-h-[44px] flex-1 rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
          />
          {/* K8: optional, and optional in the honest sense — leaving it blank
              stores a date-only control and every sentence the app writes drops
              the hour rather than inventing 00:00. */}
          <input
            id="appt-time"
            type="time"
            aria-label="Hora del control (opcional)"
            value={apptTimeInput}
            onChange={(e) => setApptTimeInput(e.target.value)}
            className="min-h-[44px] w-[7.5rem] rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={saveAppointment}
            // Five buttons on this screen say "Guardar". Naming this one is an
            // accessibility fix as much as a test hook: "Guardar" alone tells a
            // screen-reader user nothing about which of them they are on.
            aria-label="Guardar el control"
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
      </SettingsGroup>

      {/* B5. B4 left "Notificaciones" unrendered until this landed; this is
          the section it was holding open. PushSettings owns its own heading
          rather than sitting inside <SettingsGroup>, because it renders
          nothing at all in a deployment with no VAPID keys — and a group
          wrapper would leave an empty "NOTIFICACIONES" header behind, which is
          the exact thing B4's comment warns against. */}
      <PushSettings
        groupTitle="Notificaciones"
        companionAppointmentAt={companionAppointmentAt}
      />

      {/* K8: only rendered when this device is accompanying somebody. */}
      <CompanionReminderSettings view={companionView} />

      {/* K4: renders nothing when the deployment has no photo storage or the
          user has no account — an opt-in for something that cannot happen is a
          broken switch, not a choice. */}
      <PhotoBackupSettings groupTitle="Tus fotos" />

      <SettingsGroup title="Privacidad">
      {/* E6: the trust questions, one tap from where somebody is already
          thinking about their data. */}
      <Link
        href="/preguntas"
        className="block rounded-card bg-white p-4 shadow-soft transition active:scale-[0.99]"
      >
        <h2 className="text-base font-extrabold text-ink">Preguntas frecuentes</h2>
        <p className="mt-1 text-sm text-muted">
          Quién ve tus datos, qué pasa si borrás la app, si hace falta una
          cuenta.
        </p>
      </Link>
      {/* Optional PIN */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">PIN opcional</h2>
        <p className="mt-1 text-sm text-muted">
          Si activás un PIN, las notas de tu diario se cifran en este teléfono
          antes de guardarse. Se sincronizan cifradas: ni nosotros podemos
          leerlas. {pinExists ? "Tenés un PIN activo." : "No tenés PIN."}
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

      {/* Privacy summary */}
      <section className="rounded-card border border-sage/30 bg-sage/5 p-4">
        <h2 className="text-base font-extrabold text-ink">Tu privacidad</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-ink">
          <li>
            • Podés usar Mi Bebé sin cuenta. Si no creás una, no tenemos tu
            correo ni tu nombre.
          </li>
          <li>
            • Sin cuenta, tus datos de salud se guardan solo en este
            dispositivo.
          </li>
          <li>
            • Tus registros de síntomas y ánimo, tus fotos de la panza, tu
            calendario menstrual y la fecha de tu próximo control quedan
            guardados solo en tu teléfono.
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
      </SettingsGroup>

      {/* E3: the growth surface that matters here — a WhatsApp message from
          somebody you trust, not a store search. Renders nothing when there is
          no app URL to send anyone to. */}
      <InviteFriend />

      <SettingsGroup title="Datos">
      {/* Backup / restore */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Copia de seguridad</h2>
        <p className="mt-1 text-sm text-muted">
          Sin cuenta, tus datos viven solo en este teléfono: si lo perdés, lo
          cambiás o borrás los datos del navegador, se pierden para siempre a
          menos que tengas una copia. Descargá un archivo con todos tus datos y
          guardalo en un lugar seguro (por ejemplo, envíatelo por WhatsApp o
          guardalo en Google Drive). Si tenés cuenta, la copia incluye también
          lo que hayas cargado desde otros aparatos.
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
      </SettingsGroup>
    </div>
  );
}
