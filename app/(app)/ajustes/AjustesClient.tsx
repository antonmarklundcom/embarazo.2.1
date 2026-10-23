"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { wipeSignedOutDevice } from "@/lib/sync/deviceWipe";
import { CompanionReminderSettings } from "@/components/CompanionReminderSettings";
import { PhotoBackupSettings } from "@/components/PhotoBackupSettings";
import { ThemeSheet } from "@/components/hero/ThemeSheet";
import { heroTheme } from "@/lib/hero/themes";
import { useHeroTheme } from "@/lib/hero/preferences";
import { companionViewOf, useSharedViews } from "@/lib/sharing/useSharedViews";
import { toDateInput } from "@/lib/appointments";
import { useProfile } from "@/lib/useProfile";
import { useGuarani } from "@/lib/i18n/useLocale";
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
import { BirthSettings } from "@/components/ajustes/BirthSettings";
import { DangerZone } from "@/components/ajustes/DangerZone";
import { DepartmentSettings } from "@/components/ajustes/DepartmentSettings";
import { GestationSettings } from "@/components/ajustes/GestationSettings";
import { ModeSettings } from "@/components/ajustes/ModeSettings";
import { PinSettings } from "@/components/ajustes/PinSettings";
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
  const profile = useProfile();
  // K8. Fetched once here and passed down, rather than each component asking:
  // the push schedule is replaced wholesale on every publish, so the appointment
  // editor and the notification toggles all have to know about the companion
  // poke or they will drop it. Never cached (K2) — this is the live answer.
  const shared = useSharedViews();
  const companionView = companionViewOf(shared.views);
  const companionAppointmentAt = companionView?.snapshot?.nextAppointmentAt ?? null;

  const today = toDateInput(profile.now);
  const guarani = useGuarani();

  // U11 — the way into U7's theme sheet from /ajustes, next to the language
  // toggle. Opens the same ThemeSheet the hero's ThemeChip already opens
  // (components/hero/ThemeChip.tsx); the sheet itself is the only place that
  // reads/writes lib/hero/preferences.ts, so no second storage mechanism is
  // added here — this row is just a second door into it.
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const currentTheme = useHeroTheme();

  async function handleWipe() {
    await wipeSignedOutDevice(() => signOut({ redirect: false }));
    // A signed-out first-run gate cannot restore the account's cloud copy.
    if (typeof window !== "undefined") window.location.href = "/cuenta";
  }

  // Wait for the first on-device read before mounting editable drafts.
  if (profile.loading) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-black tracking-tight text-ink">Ajustes</h1>
          <PrivacyLine className="mt-1" />
        </header>
        <p role="status" className="text-sm text-muted">Cargando tus ajustes…</p>
      </div>
    );
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
      {/* Growth plan item 20b: only once the `guarani` flag is on. */}
      {guarani && (
        <SettingsGroup title="Idioma · Ñe'ẽ">
          <LanguageSettings />
        </SettingsGroup>
      )}

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
          gestationDays={profile.gestationDays}
          today={today}
        />
        <GestationSettings
          mode={profile.mode}
          gestationDays={profile.gestationDays}
          plannedDeliveryDate={profile.plannedDeliveryDate}
        />
        <BirthSettings
          mode={profile.mode}
          lmpDate={profile.lmpDate}
          birthDate={profile.birthDate}
          birthRecordedAt={profile.birthRecordedAt}
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

        <PinSettings />

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
