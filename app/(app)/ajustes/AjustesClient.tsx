"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { wipeAllData } from "@/lib/db";
import { clearOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { CompanionReminderSettings } from "@/components/CompanionReminderSettings";
import { PhotoBackupSettings } from "@/components/PhotoBackupSettings";
import { ThemeSheet } from "@/components/hero/ThemeSheet";
import { heroTheme } from "@/lib/hero/themes";
import { useHeroTheme } from "@/lib/hero/preferences";
import { companionViewOf, useSharedViews } from "@/lib/sharing/useSharedViews";
import { toDateInput } from "@/lib/appointments";
import { useProfile } from "@/lib/useProfile";
import {
  MIN_PIN_LENGTH,
  isPinSet,
  setPin as savePin,
  clearPin,
  unlock,
  isUnlocked,
} from "@/lib/crypto";
import { PushSettings } from "@/components/PushSettings";
import { PrivacyLine } from "@/components/PrivacyLine";
import { FamiliaSettings } from "@/components/FamiliaSettings";
import { LanguageSettings } from "@/components/LanguageSettings";
import { InstallCard } from "@/components/InstallCard";
import { InviteFriend } from "@/components/InviteFriend";

// W4 — one component per settings card, under `components/ajustes/**`. Each
// card owns the draft state, the seeding effect and the writer that only it
// uses; what more than one card needs — the profile, the companion view,
// today's date — is read once here and passed down. The cards that only apply
// in pregnancy mode take `mode` and return null themselves, rather than being
// wrapped in a conditional here, so their drafts survive a switch to
// "planeando" and back exactly as they did when every one of them was a
// `useState` in this file.
import { AppointmentSettings } from "@/components/ajustes/AppointmentSettings";
import { BabyNamesSettings } from "@/components/ajustes/BabyNamesSettings";
import { BackupSettings } from "@/components/ajustes/BackupSettings";
import { DangerZone } from "@/components/ajustes/DangerZone";
import { DepartmentSettings } from "@/components/ajustes/DepartmentSettings";
import { GestationSettings } from "@/components/ajustes/GestationSettings";
import { ModeSettings } from "@/components/ajustes/ModeSettings";
import {
  FaqLinkCard,
  PrivacyNotices,
} from "@/components/ajustes/PrivacyNotices";
import { PregnancyDateSettings } from "@/components/ajustes/PregnancyDateSettings";
import { RoleSettings } from "@/components/ajustes/RoleSettings";
import { SettingsGroup } from "@/components/ajustes/SettingsGroup";
import { SituationSettings } from "@/components/ajustes/SituationSettings";

// BUILD-PLAN A2 — the interactive half of /ajustes. The route's page.tsx is a
// server component now (it reads the session), so this is a client component it
// renders, with the server-rendered account block handed in as `account`.
export function AjustesClient({ account }: { account: React.ReactNode }) {
  const router = useRouter();
  const profile = useProfile();
  // K8. Fetched once here and passed down, rather than each component asking:
  // the push schedule is replaced wholesale on every publish, so the appointment
  // editor and the notification toggles all have to know about the companion
  // poke or they will drop it. Never cached (K2) — this is the live answer.
  const shared = useSharedViews();
  const companionView = companionViewOf(shared.views);
  const companionAppointmentAt = companionView?.snapshot?.nextAppointmentAt ?? null;

  const today = toDateInput(Date.now());

  // U11 — the way into U7's theme sheet from /ajustes, next to the language
  // toggle. Opens the same ThemeSheet the hero's ThemeChip already opens
  // (components/hero/ThemeChip.tsx); the sheet itself is the only place that
  // reads/writes lib/hero/preferences.ts, so no second storage mechanism is
  // added here — this row is just a second door into it.
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const currentTheme = useHeroTheme();

  // W4 — the PIN card is the one settings card that did NOT move into
  // `components/ajustes/**`. `lib/pinPolicy.test.ts` (K18) reads THIS file by
  // path and asserts that the floor is enforced from `MIN_PIN_LENGTH` rather
  // than a copied literal, and that the copy still says the notes are not
  // recoverable and why six digits are asked for. That guardrail is the point
  // of the test, so the card stays where the test looks until someone moves
  // the test's path deliberately — see docs/log/w4.md.
  const [pinExists, setPinExists] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  useEffect(() => {
    setPinExists(isPinSet());
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

      {/* K19-L1 — the language toggle sits directly under Cuenta, above every
          pregnancy setting, because a woman who cannot read this screen has to
          find it without reading it: first group, two buttons, each labelled in
          its own language. */}
      <SettingsGroup title="Idioma · Ñe'ẽ">
        <LanguageSettings />
      </SettingsGroup>

      {/* U11 — a second door into U7's theme sheet (the first is the ThemeChip
          on the hero card itself). Shows the currently chosen theme's label;
          tapping it opens the same sheet, which also holds the fruit-size
          toggle. */}
      <SettingsGroup title="Fondo de la semana">
        <section className="rounded-card bg-white p-4 shadow-soft">
          <button
            type="button"
            onClick={() => setThemeSheetOpen(true)}
            className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-sm font-extrabold text-ink">
                Fondo de la semana
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Elegí el fondo del bebé y si querés ver la comparación de
                tamaño con una fruta.
              </span>
            </span>
            <span className="shrink-0 text-xs font-bold text-petrol">
              {heroTheme(currentTheme).label} →
            </span>
          </button>
        </section>
        <ThemeSheet open={themeSheetOpen} onClose={() => setThemeSheetOpen(false)} />
      </SettingsGroup>

      {/* K7 — the Familia group. `/familia` shipped with E1 and was reachable
          from nowhere in the app; this is the settings half of the fix. */}
      <SettingsGroup title="Familia">
        <FamiliaSettings />
      </SettingsGroup>

      <SettingsGroup title="Embarazo">
        <ModeSettings mode={profile.mode} hasPregnancy={profile.hasPregnancy} />
        <RoleSettings role={profile.role} />
        <DepartmentSettings profileDepartment={profile.department} />
        <SituationSettings
          mode={profile.mode}
          role={profile.role}
          firstPregnancy={profile.firstPregnancy}
          careSetting={profile.careSetting}
          workSituation={profile.workSituation}
        />
        <PregnancyDateSettings
          mode={profile.mode}
          lmpDate={profile.lmpDate}
          dueDate={profile.dueDate}
          today={today}
        />
        <GestationSettings
          mode={profile.mode}
          gestationDays={profile.gestationDays}
          plannedDeliveryDate={profile.plannedDeliveryDate}
        />
        <BabyNamesSettings mode={profile.mode} babies={profile.babies} />
        <AppointmentSettings
          mode={profile.mode}
          nextAppointment={profile.nextAppointment}
          companionAppointmentAt={companionAppointmentAt}
          today={today}
        />
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
        <FaqLinkCard />

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

        <PrivacyNotices />
      </SettingsGroup>

      {/* E3: the growth surface that matters here — a WhatsApp message from
          somebody you trust, not a store search. Renders nothing when there is
          no app URL to send anyone to. */}
      <InviteFriend />

      <SettingsGroup title="Datos">
        <BackupSettings />

        {/* Install prompt (P1.1) — hides itself once installed/unavailable */}
        <InstallCard />

        <DangerZone onWipe={handleWipe} />
      </SettingsGroup>
    </div>
  );
}
