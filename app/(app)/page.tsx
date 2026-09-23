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
  CreateAccountNudge,
  InstallCard,
  InviteFriend,
  MoodCheckIn,
  Onboarding,
  PlaneandoHome,
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

import { hasOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { siteParamsToAnswers } from "@/lib/onboarding/siteParams";
import type { OnboardingAnswers } from "@/lib/onboarding/progress";
import { INVITE_CODE_PARAM } from "@/lib/sharing/inviteLink";

// SITE-PLAN-EMBARAZO-COM-PY.md §5.3 — params the marketing site's deep
// links may carry. Stripped from the URL once read (below), same as any
// one-time landing param.
const SITE_PARAM_NAMES = ["w", "fpp", "fum", "modo"];

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
import { WeekStrip } from "@/components/home/WeekStrip";

// "Hoy" screen — brand design 1a (docs/archive/REDESIGN-PLAN.md §2): week strip,
// photo hero with fallback, tip, mood check-in, herramientas grid, reading
// rail. Paraguay-specific cards (derechos, recursos, temporada) stay below.
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
  // (`?w=`, `?fpp=`, `?fum=`, `?modo=planeando`). Read once from `window`,
  // same reasoning as the invite code above (statically rendered route,
  // nothing above the fold needs it) — then dropped from the URL before
  // onboarding can write anything to storage, per the plan's requirement.
  const [siteAnswers, setSiteAnswers] = useState<
    Partial<OnboardingAnswers> | undefined
  >(undefined);
  useEffect(() => {
    const url = new URL(window.location.href);
    const patch = siteParamsToAnswers(url.search);
    if (patch) setSiteAnswers(patch);
    if (SITE_PARAM_NAMES.some((name) => url.searchParams.has(name))) {
      SITE_PARAM_NAMES.forEach((name) => url.searchParams.delete(name));
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
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
        : !profile.hasProfile || hasOnboardingDraft()
          ? "active"
          : "done",
    );
  }, [profile.loading, profile.hasProfile]);

  if (profile.loading || flow === "unknown") {
    return <HomeSkeleton />;
  }

  if (flow === "active") {
    return (
      <Onboarding
        onDone={() => setFlow("done")}
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
    <div className="space-y-4">
      <WeekStrip />

      {/* Semana nueva: on the day her week turns over (her own weekday,
          from her FUM) and the two after, until she closes it. */}
      <NewWeekCard
        week={week}
        daysIntoWeek={profile.completed?.days ?? 3}
        lmpDate={lmpDate}
        sizeComparison={info.sizeComparison}
      />

      {/* C1: circular week hero + progress ring + stats row (map #9, #10).
          Everything below this comment, down to the tool/reading rails, is
          the C2–C8 slot area — each of those tasks fills in one block here
          (weekly one-liner, size tabs, perspective switcher, obstetra card,
          article feed, popular-this-week, shortcuts+feedback) rather than
          rearranging this hero. */}
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

      {/* The daily habit, right under the week: today's tip and the one-tap
          check-in. They used to be the 8th and 9th cards, below everything
          about the week — the two things that change every day were the
          two nobody scrolled to. */}
      <DailyTipCard text={tip.text} />
      <MoodCheckIn role={profile.role} week={week} />

      {/* E2: share the week card (map #30). Drawn on the device; the image
          carries the week number and nothing else. */}
      <ShareCard week={week} label="Compartir mi semana" offerInvite />

      {/* C8: one-tap access to emergencia · carné · preguntas, and the
          feedback path (map #18, #19). */}
      <HomeShortcuts week={week} />

      {/* C2–C5: the cards that are about this week — one-liner, tamaños,
          perspectivas, la nota de la obstetra. */}
      <WeekContentRail week={week} role={profile.role} />

      {/* K2/K7: ánimos, "Tu familia" and the next control — the three cards
          `ownerView` gates. */}
      <HomeFamilySurfaces
        ownerView={ownerView}
        nextAppointment={profile.nextAppointment}
        companionAppointmentAt={
          companionViewOf(shared.views)?.snapshot?.nextAppointmentAt ?? null
        }
      />

      {/* Tool cards */}
      <HomeToolsGrid />

      {/* U11 — the "Recomendados" rail (replaces E4). Self-gates on
          useFlag("recomendados") and on having any items for this trimester,
          so it renders nothing until the flag is on — no condition needed
          here. Sits below the tools grid and above the article feed, per the
          U11 brief. */}
      <RecomendadosRail trimester={trimester} />

      {/* C6: guías that are actually about this week, with read time
          (map #15, #17). Replaces the old rail, whose three cards pointed at
          two destinations. */}
      <WeekArticleFeed week={week} answers={profile} />

      {/* C7: aggregate counts, no identity anywhere (map #16). Renders
          nothing when there is no data. */}
      <PopularThisWeek />

      {/* Derechos · recursos · temporada. */}
      <HomeParaguayCards trimester={trimester} />

      {/* A real, visible nudge to create an account, once there is local
          data actually worth protecting (lib/accountNudge.ts). Self-gates on
          no session + auth available + profile old enough — renders nothing
          otherwise. Sits with the other "you haven't done this yet" cards
          below. */}
      <CreateAccountNudge />

      {/* Install prompt (P1.1) — hides itself once installed/unavailable */}
      <InviteFriend />

      <InstallCard />

      {/* The "Lo que viene" roadmap card is gone from Hoy: a lone
          "Próximamente" tile read as unfinished on the screen she opens
          every day. The component stays for when there is something real
          to announce. */}
      <HomeFooter department={department} />
    </div>
  );
}
