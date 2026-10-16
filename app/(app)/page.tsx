"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/lib/useProfile";

// W4 — this route is now the data loading, the branch between the four home
// screens, and the layout order. Every block it renders lives under
// `components/home/**`; the `next/dynamic` declarations that used to sit at the
// top of this file (K11/G3) live in `components/home/dynamicSections`, with the
// reasoning for each group.
import {
  CompanionHome,
  InstallCard,
  InviteFriend,
  MoodCheckIn,
  NextAppointmentCard,
  Onboarding,
  PlaneandoHome,
  WeeklyLineCard,
  PopularThisWeek,
  ShareCard,
  WeekArticleFeed,
} from "@/components/home/dynamicSections";

import {
  formatCompletedGestation,
  formatWeekPlusDay,
  getDaysRemaining,
  getDueDate,
  getDaysSinceLMP,
  getProgressFraction,
} from "@/lib/pregnancy";
import { getWeek } from "@/lib/weeks";
import { getDailyTip } from "@/lib/dailyTips";
import { isSelfCentered } from "@/lib/roleCopy";

import { hasOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { siteParamsToAnswers, withoutSiteParams } from "@/lib/onboarding/siteParams";
import type { OnboardingAnswers } from "@/lib/onboarding/progress";
import { INVITE_CODE_PARAM } from "@/lib/sharing/inviteLink";

import {
  companionViewOf,
  ownerViewOf,
  useSharedViews,
} from "@/lib/sharing/useSharedViews";

import { HomeShortcuts } from "@/components/HomeShortcuts";
import { DailyTipCard } from "@/components/home/DailyTipCard";
import { HomeFamilySurfaces } from "@/components/home/HomeFamilySurfaces";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeParaguayCards } from "@/components/home/HomeParaguayCards";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";
import { HomeToolsGrid } from "@/components/home/HomeToolsGrid";
import { NoPregnancyYet } from "@/components/home/NoPregnancyYet";
import { RecomendadosRail } from "@/components/RecomendadosRail";
import { WeekContentRail } from "@/components/home/WeekContentRail";
import { WeekHero } from "@/components/home/WeekHero";
import { NewWeekCard } from "@/components/home/NewWeekCard";
import { BirthCard } from "@/components/baby/BirthCard";
import { completeHandoff, readHandoff, rememberHandoff } from "@/lib/auth/access.client";
import { BabyHome } from "@/components/baby/BabyHome";
import { WeekStrip } from "@/components/home/WeekStrip";
import { flush as flushFunnel, markOnboarded } from "@/lib/stats/funnel.client";

// "Hoy" screen — brand design 1a (docs/archive/REDESIGN-PLAN.md §2): week strip,
// photo hero with fallback, tip, mood check-in, herramientas grid, reading
// rail. Paraguay-specific cards (derechos, recursos, temporada) stay below.
/**
 * Growth plan item 11 — the name(s) she gave the baby, for the share card's
 * "Con el apodo" box: "Mateo", or "Ana y Sofía" for twins. `null` when unnamed.
 */
function shareNickname(babies: { name?: string }[] | undefined): string | null {
  const names = (babies ?? []).map((baby) => baby.name?.trim()).filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(" y ") : null;
}

export default function InicioPage() {
  const profile = useProfile();
  // K9-F5 — a code from the WhatsApp invitation link, when the app was opened
  // on one. Read from `window` in an effect rather than through
  // `useSearchParams`, which would drag this statically rendered route into a
  // Suspense boundary for a value nothing above the fold depends on.
  const [inviteCode, setInviteCode] = useState<string | undefined>(undefined);
  useEffect(() => {
    const found = new URLSearchParams(window.location.search).get(
      INVITE_CODE_PARAM,
    );
    if (found) setInviteCode(found.toUpperCase());
  }, []);

  // SITE-PLAN-EMBARAZO-COM-PY.md §5.3 — the marketing site's CTA deep link
  // (`?w=`, `?fpp=`, `?fum=`, `?modo=planeando`, and since F12 the same keys
  // in the `#` fragment — lib/onboarding/siteParams.ts). Read once from `window`,
  // same reasoning as the invite code above (statically rendered route,
  // nothing above the fold needs it) — then dropped from the URL before
  // onboarding can write anything to storage, per the plan's requirement.
  const [siteAnswers, setSiteAnswers] = useState<
    Partial<OnboardingAnswers> | undefined
  >(undefined);
  useEffect(() => {
    const saved = readHandoff();
    const patch = siteParamsToAnswers(window.location.search, Date.now(), window.location.hash) ?? saved?.patch;
    if (patch) {
      rememberHandoff(saved?.returnTo);
      setSiteAnswers(patch);
    }
    const cleaned = withoutSiteParams(window.location.href);
    if (cleaned !== null) window.history.replaceState({}, "", cleaned);
  }, []);
  // K1: onboarding now writes the profile row *before* its last steps (the
  // account, the baby's name, the invite), so "has a profile" stopped being the
  // same question as "has finished onboarding" — and a gate that asked the old
  // question would throw the user out onto Hoy halfway through the flow.
  //
  // So the decision is made once, when the first IndexedDB read lands, and then
  // it sticks: onboarding ends when onboarding says it has ended. A draft in
  // localStorage is what makes a user who is mid-flow — including one who is
  // coming back from Google's redirect — resume instead of starting over.
  const [flow, setFlow] = useState<"unknown" | "active" | "done">("unknown");
  // K2. A signed-out or local-only user gets `views: []` from a fetch that
  // fails, which is the right answer for them: no memberships, nothing to
  // render. Nothing here blocks the page — the owner's own screen is built from
  // Dexie and never waits on the network.
  const shared = useSharedViews();

  useEffect(() => {
    if (profile.loading) return;
    setFlow((current) =>
      // "done" is final: only the flow itself ends the flow. Everything else is
      // re-derived, so a profile arriving from sync on a second device (A3)
      // closes the first-run gate the moment it lands, exactly as it did before
      // K1 — that device has no draft, so it was never mid-flow.
      current === "done"
        ? "done"
        : !profile.hasPersonalSetup || hasOnboardingDraft()
          ? "active"
          : "done",
    );
  }, [profile.loading, profile.hasPersonalSetup]);

  useEffect(() => {
    if (flow === "done") completeHandoff();
  }, [flow]);

  if (profile.loading || flow === "unknown") {
    return <HomeSkeleton />;
  }

  if (flow === "active") {
    return (
      <Onboarding
        onDone={() => {
          // Growth plan item 17: onboarding finished, counted once per device.
          markOnboarded();
          void flushFunnel();
          setFlow("done");
          completeHandoff();
        }}
        initialCode={inviteCode}
        initialSiteAnswers={siteAnswers}
      />
    );
  }

  // K2 — a companion's home screen is the pregnancy they are accompanying.
  //
  // The condition is deliberately narrow: a live NON-owner membership **and** a
  // user who told B1's role question that they are not the pregnant one. A mamá
  // who also follows her sister's pregnancy keeps her own home screen and
  // reaches her sister's from `/familia`; a papá who accepted an invite gets the
  // screen the invitation promised. The owner's published week also beats a
  // companion's locally typed guess at the same dates, which is the other half
  // of why this branch wins rather than sitting below the fold.
  const companionView = companionViewOf(shared.views);
  if (companionView && profile.role !== "mama") {
    return (
      <CompanionHome view={companionView} onChanged={() => void shared.reload()} />
    );
  }

  // Pre-pregnancy "planeando / buscando" mode shows its own dashboard.
  if (profile.mode === "planeando") {
    return <PlaneandoHome />;
  }

  // K9-F5 — a profile in pregnancy mode with no pregnancy on it.
  //
  // Everything below this line reads `profile.week!`, and that assertion used
  // to hold because the only way to get a profile was to walk through the LMP
  // step. The invited flow removed that guarantee on purpose: a companion is
  // never asked for a date, so his device has a real profile and no pregnancy
  // row, and until the shared view arrives from the server there is nothing to
  // render a week from. Offline, or with a revoked membership, it never
  // arrives.
  //
  // So this is not a defensive branch — it is the screen for a state the app
  // now creates deliberately, and it says something different to each of the
  // two people who can reach it.
  if (!profile.hasPregnancy) {
    return <NoPregnancyYet role={profile.role} loading={shared.loading} />;
  }

  // K7/K2: the owner's server-side view, read once. Null for a signed-out or
  // local-only user, which is what gates the family surfaces below.
  const ownerView = ownerViewOf(shared.views);

  const week = profile.week!;
  const trimester = profile.trimester!;
  const department = profile.department!;

  // Growth plan item 9 (G2): once she has said the baby was born, Hoy is about
  // the baby. The mood check-in (and its Línea 155 card), the tools and the
  // footer stay; the pregnancy week, its tip and its reading do not lead any
  // more. Every pregnancy screen is still one tap away in Herramientas.
  if (profile.birthDate !== undefined) {
    return (
      <div className="space-y-8 sm:space-y-10">
        <BabyHome birthDate={profile.birthDate} />
        <MoodCheckIn role={profile.role} week={week} />
        <HomeToolsGrid />
        <HomeFooter department={department} />
      </div>
    );
  }
  const info = getWeek(week);
  const tip = getDailyTip(week, trimester);
  const completedLabel = profile.completed
    ? formatCompletedGestation(profile.completed)
    : null;
  // B3: week+day ("24+3") is the default compact display, matching the
  // carné perinatal convention — falls back to the plain week if there's no
  // completed-gestation data yet (shouldn't happen once hasPregnancy, but
  // keeps this defensive rather than asserting non-null).
  const weekPlusDay = profile.completed ? formatWeekPlusDay(profile.completed) : String(week);

  const lmpDate = profile.lmpDate!;
  const gestationDays = profile.gestationDays;
  const daysElapsed = getDaysSinceLMP(lmpDate);
  const daysLeft = getDaysRemaining(lmpDate, Date.now(), gestationDays);
  const progress = getProgressFraction(lmpDate, Date.now(), gestationDays);
  const dueDateLabel = new Date(getDueDate(lmpDate, gestationDays)).toLocaleDateString(
    "es-PY",
    { day: "numeric", month: "short" },
  );

  return (
    <div className="space-y-9 sm:space-y-12">
      <section aria-label="Tu semana" className="space-y-5">
        <WeekStrip />
        <WeekHero
          week={week}
          weekPlusDay={weekPlusDay}
          trimester={trimester}
          completedLabel={completedLabel}
          sizeComparison={info.sizeComparison}
          progress={progress}
          daysElapsed={daysElapsed}
          daysLeft={daysLeft}
          dueDateLabel={dueDateLabel}
          babies={profile.babies}
          role={profile.role}
        />
        <NextAppointmentCard
          appointmentAt={profile.nextAppointment}
          guests={ownerView?.members ?? []}
          companionAppointmentAt={companionViewOf(shared.views)?.snapshot?.nextAppointmentAt ?? null}
        />
        <NewWeekCard
          week={week}
          daysIntoWeek={profile.completed?.days ?? 3}
          lmpDate={lmpDate}
          sizeComparison={info.sizeComparison}
        />
        <BirthCard week={week} lmpDate={lmpDate} birthDate={profile.birthDate} />
      </section>

      <section aria-labelledby="hoy-para-vos" className="space-y-5">
        <h2 id="hoy-para-vos" className="text-xl font-extrabold tracking-tight text-ink">
          Un momento para vos
        </h2>
        <WeeklyLineCard week={week} />
        <DailyTipCard text={tip.text} tipId={tip.id} />
        <MoodCheckIn role={profile.role} week={week} />
      </section>

      <section aria-label="Para conocer tu semana" className="space-y-7">
        <WeekContentRail week={week} role={profile.role} withLine={false} />
        <WeekArticleFeed week={week} answers={profile} />
        <PopularThisWeek />
      </section>

      <section aria-label="Tus herramientas" className="space-y-6">
        <HomeShortcuts week={week} />
        <HomeToolsGrid />
      </section>

      <section aria-label="Acompañada en esta etapa" className="space-y-5">
        <HomeFamilySurfaces
          showAppointment={false}
          ownerView={ownerView}
          nextAppointment={profile.nextAppointment}
          companionAppointmentAt={
            companionViewOf(shared.views)?.snapshot?.nextAppointmentAt ?? null
          }
        />
        <ShareCard
          week={week}
          label="Compartir mi semana"
          offerInvite
          offerPartner={isSelfCentered(profile.role)}
          nickname={shareNickname(profile.babies)}
        />
      </section>

      <section aria-label="Recursos para vos" className="space-y-5">
        <RecomendadosRail trimester={trimester} />
        <HomeParaguayCards trimester={trimester} />
      </section>

      <div className="space-y-5">
        <InviteFriend />
        <InstallCard />
      </div>
      <HomeFooter department={department} />
    </div>
  );
}