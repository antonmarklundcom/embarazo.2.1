"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/useProfile";
import {
  formatCompletedGestation,
  formatWeekPlusDay,
  getDaysRemaining,
  getDaysSinceLMP,
  getProgressFraction,
} from "@/lib/pregnancy";
import { getWeek } from "@/lib/weeks";
import { getDailyTip } from "@/lib/dailyTips";
import { departmentName } from "@/lib/departments";
import { primaryBabyName } from "@/lib/babies";
import { babyAtWeekLabel as roleBabyAtWeekLabel } from "@/lib/roleCopy";
import type { BabyIdentity, Role } from "@/lib/db";

// B1 (role-aware "Tu bebé"/"El bebé") and B2 (nickname, e.g. "Silvia") each
// shipped a `babyAtWeekLabel`. Combined here rather than in either library:
// a nickname always wins when one is set, and the role-aware phrasing is
// the fallback otherwise — neither library needs to know about the other.
function babyAtWeekLabel(babies: BabyIdentity[], role: Role, week: number): string {
  const name = primaryBabyName(babies);
  return name ? `${name} a las ${week} semanas` : roleBabyAtWeekLabel(role, week);
}
import { Onboarding } from "@/components/Onboarding";
import { hasOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { INVITE_CODE_PARAM } from "@/lib/sharing/inviteLink";
import { CompanionHome } from "@/components/CompanionHome";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { CheersCard } from "@/components/CheersCard";
import {
  companionViewOf,
  ownerViewOf,
  useSharedViews,
} from "@/lib/sharing/useSharedViews";
import { PlaneandoHome } from "@/components/PlaneandoHome";
import { LocalResourcesBlock } from "@/components/LocalResourcesBlock";
import { NextAppointmentCard } from "@/components/NextAppointmentCard";
import { WeeklyLineCard } from "@/components/WeeklyLineCard";
import { SizeTabs } from "@/components/SizeTabs";
import { PerspectiveSwitcher } from "@/components/PerspectiveSwitcher";
import { ObstetraCard } from "@/components/ObstetraCard";
import { WeekArticleFeed } from "@/components/WeekArticleFeed";
import { PopularThisWeek } from "@/components/PopularThisWeek";
import { HomeShortcuts } from "@/components/HomeShortcuts";
import { ShareCard } from "@/components/ShareCard";
import { RoadmapSection } from "@/components/RoadmapSection";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import { PrivacyLine } from "@/components/PrivacyLine";
import { InstallCard } from "@/components/InstallCard";
// D1: one icon set, shared with the herramientas grid so the two cannot drift.
import { ToolIcon, type ToolIconName } from "@/components/ToolIcon";
import { InviteFriend } from "@/components/InviteFriend";
import { FamilyCard } from "@/components/FamilyCard";

// "Hoy" screen — Mi Bebé design 1a (docs/REDESIGN-PLAN.md §2): week strip,
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
    return <Onboarding onDone={() => setFlow("done")} initialCode={inviteCode} />;
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

  return (
    <div className="space-y-4">
      <WeekStrip />

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
        babies={profile.babies}
        role={profile.role}
      />

      {/* E2: share the week card (map #30). Drawn on the device; the image
          carries the week number and nothing else. Sits directly under the
          hero, which is the card it shares. */}
      <ShareCard week={week} label="Compartir mi semana" offerInvite />

      {/* C8: one-tap access to emergencia · carné · preguntas, and the
          feedback path (map #18, #19). */}
      <HomeShortcuts week={week} />

      {/* C2: the weekly one-liner (map #11). Renders nothing for a week with
          no line yet. */}
      <WeeklyLineCard week={week} />

      {/* C3: size comparison tabs (map #12) — tamaño / pie / mano. */}
      <SizeTabs week={week} />

      {/* C4: same week, three entrances (map #13). Opens on the user's own
          role; nothing is hidden by role. */}
      <PerspectiveSwitcher week={week} role={profile.role} />

      {/* C5: one bylined note per week (map #14). Renders only when a real
          medical reviewer is configured — the byline IS the gate. */}
      <ObstetraCard week={week} />

      {/* K2: ánimos her pareja and her familia sent. Renders nothing at all
          when nobody has — an empty "todavía nadie te mandó ánimo" box is a
          small unkindness this screen can simply not commit. */}
      <CheersCard cheers={ownerView?.cheers ?? []} />

      {/* K7 — "Tu familia". `/familia` shipped with E1 and was linked from
          nowhere; this card and the Ajustes group are the two taps the plan
          asks for.

          It renders only for a user the server knows about: `ownerView` is
          non-null exactly when there is an account, a database and a pregnancy
          row. A signed-out, local-only user gets <InviteFriend> lower down
          instead — inviting somebody to *the app* is the thing they can
          actually do, and rendering a family invite they cannot complete is
          the bug §7 flags on /familia itself. */}
      {ownerView && (
        <FamilyCard members={ownerView.members ?? []} />
      )}

      {/* K7 (§7) — the control, editable here, with days-to-go and K8's RSVP.
          This replaced both the shortcut tile that navigated to /ajustes and
          <AppointmentBanner>, which was a second card saying the same things
          (and linking to /ajustes as well). See NextAppointmentCard's comment:
          urgency is now a tone on this card. */}
      <NextAppointmentCard
        appointmentAt={profile.nextAppointment}
        guests={ownerView?.members ?? []}
        companionAppointmentAt={
          companionViewOf(shared.views)?.snapshot?.nextAppointmentAt ?? null
        }
      />

      {/* Daily tip */}
      <section className="rounded-card border border-line bg-white p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tip de hoy
        </p>
        <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">
          {tip.text}
        </p>
      </section>

      {/* K9-F6: the check-in records on tap now, and carries the streak. */}
      <MoodCheckIn role={profile.role} week={week} />

      {/* Tool cards */}
      <section aria-labelledby="herramientas" className="space-y-2.5 pt-1">
        <h2
          id="herramientas"
          className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
        >
          Herramientas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <ToolCard href="/herramientas/pataditas" title="Pataditas" subtitle="Contá movimientos" icon="feet" />
          <ToolCard href="/herramientas/contracciones" title="Contracciones" subtitle="Cronometrá" icon="timer" />
          <ToolCard href="/herramientas/peso" title="Peso" subtitle="Seguí tu progreso" icon="scale" />
          <ToolCard href="/herramientas/fotos" title="Fotos" subtitle="Diario de tu panza" icon="camera" />
          <ToolCard href="/herramientas/comer" title="¿Puedo comer...?" subtitle="Buscá un alimento" icon="food" />
        </div>
      </section>

      {/* C6: guías that are actually about this week, with read time
          (map #15, #17). Replaces the old rail, whose three cards pointed at
          two destinations. */}
      <WeekArticleFeed week={week} answers={profile} />

      {/* C7: aggregate counts, no identity anywhere (map #16). Renders
          nothing when there is no data. */}
      <PopularThisWeek />

      {/* Rights & benefits navigator */}
      <Link
        href="/derechos"
        className="block rounded-card border border-line bg-white p-4 transition active:scale-[0.99]"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          ¿Qué te corresponde?
        </p>
        <h3 className="mt-1 text-base font-extrabold text-ink">
          Tus derechos y beneficios en Paraguay
        </h3>
        <p className="mt-1 text-sm font-semibold text-muted">
          Licencia de maternidad con tus fechas, subsidio de IPS, gratuidad en
          Salud Pública y más, según tu situación.
        </p>
      </Link>

      {/* Local resources (placements) */}
      <LocalResourcesBlock trimester={trimester} />

      {/* Seasonal info card */}
      <Link
        href="/guias/dengue-zika-chikungunya-embarazo"
        className="block rounded-card bg-pastel-salvia p-4 transition active:scale-[0.99]"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          De temporada
        </p>
        <h3 className="mt-1 text-base font-extrabold text-ink">
          Cuidate del dengue en el embarazo
        </h3>
        <p className="mt-1 text-sm font-semibold text-ink/70">
          Con el calor y la lluvia, prevenir el mosquito es parte de tu cuidado.
        </p>
      </Link>

      {/* Install prompt (P1.1) — hides itself once installed/unavailable */}
      <InviteFriend />

      <InstallCard />

      {/* Roadmap placeholders (build spec §8) */}
      <RoadmapSection />

      <div className="flex items-center justify-between pt-2">
        <MedicalReviewByline />
        <span className="text-xs text-muted">{departmentName(department)}</span>
      </div>
      <PrivacyLine />
    </div>
  );
}

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

function WeekStrip() {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // Monday-start index
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx);
  return (
    <div className="grid grid-cols-7 gap-1" aria-hidden>
      {DAY_LETTERS.map((letter, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const isToday = i === todayIdx;
        return (
          <div key={i} className="text-center">
            <div
              className={`text-[10px] font-bold tracking-[1px] ${
                isToday ? "font-black text-terracotta" : "text-muted/70"
              }`}
            >
              {isToday ? "HOY" : letter}
            </div>
            <div
              className={`mt-1 rounded-full py-1.5 text-sm ${
                isToday
                  ? "bg-terracotta font-black text-white"
                  : "font-bold text-muted"
              }`}
            >
              {d.getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// C1: circular hero with a progress ring, replacing the old flat banner
// card. The ring shows gestation progress (0 at LMP, full circle at the due
// date, clamped so an overdue pregnancy doesn't overshoot). Below it, the
// three-stat row (semana · días transcurridos · faltan) feature map #10
// asks for explicitly, rather than leaving those numbers implicit in prose.
const RING_SIZE = 168;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function WeekHero({
  week,
  weekPlusDay,
  trimester,
  completedLabel,
  sizeComparison,
  progress,
  daysElapsed,
  daysLeft,
  babies,
  role,
}: {
  week: number;
  weekPlusDay: string;
  trimester: number;
  completedLabel: string | null;
  sizeComparison: string;
  /** 0..1 fraction of gestation completed. */
  progress: number;
  daysElapsed: number;
  daysLeft: number;
  babies: BabyIdentity[];
  role: Role;
}) {
  // Weekly render lives at /assets/semanas/bebe-<week>.webp when the founder
  // has added it (REDESIGN-PLAN.md §4); until then show the arena fallback.
  const [imgError, setImgError] = useState(false);
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="rounded-card bg-white p-5 text-center shadow-soft">
      <Link
        href={`/semana/${week}`}
        aria-label={`Semana ${week}, detalles`}
        className="relative mx-auto block transition active:scale-[0.97]"
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="#EFE7DA"
            strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="#C96342"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div
          className="absolute overflow-hidden rounded-full bg-pastel-arena"
          style={{ inset: RING_STROKE + 6 }}
        >
          {imgError ? (
            <div className="flex h-full items-center justify-center">
              <span className="text-5xl font-black leading-none text-white">
                {week}
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/assets/semanas/bebe-${week}.webp`}
              alt={babyAtWeekLabel(babies, role, week)}
              className="block h-full w-full object-cover"
              style={{ objectPosition: "center 18%" }}
              onError={() => setImgError(true)}
            />
          )}
        </div>
      </Link>

      {/* B3: `week+day` is the default display, in carné notation ("24+3").
          It is labelled "SEMANAS", not "SEMANA N", on purpose — the app has
          two week numberings and this used to conflate them. `weekPlusDay`
          counts COMPLETED weeks (carné convention); `week` is the friendly
          1-based number the 42 `/semana/[n]` pages use, and it is one higher.
          Rendering "SEMANA 24+3" next to a link to /semana/25 showed the user
          two different weeks for the same day. See DECISIONS.md "B3". */}
      <p className="mt-3 text-[11px] font-extrabold tracking-[1.6px] text-petrol">
        {weekPlusDay} SEMANAS · {trimester}.º TRIMESTRE
      </p>
      <p className="mt-1 text-xl font-black text-ink">
        {completedLabel ?? `Semana ${week}`}
      </p>
      <p className="mt-0.5 text-xs font-bold text-muted">
        Del tamaño de {sizeComparison}
      </p>

      {/* Three-stat row (feature map #10): semana · días transcurridos · faltan. */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3.5">
        <HeroStat value={String(week)} label="Semana" />
        <HeroStat value={String(daysElapsed)} label="Días pasados" />
        <HeroStat value={String(daysLeft)} label="Faltan" />
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-black text-ink">{value}</p>
      <p className="text-[11px] font-semibold text-muted">{label}</p>
    </div>
  );
}


function ToolCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: ToolIconName;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-card border border-line bg-white p-3.5 transition active:scale-[0.98]"
    >
      <ToolIcon name={icon} />
      <div className="min-w-0">
        <p className="text-[15px] font-extrabold text-ink">{title}</p>
        <p className="truncate text-xs font-semibold text-muted">{subtitle}</p>
      </div>
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-full animate-pulse rounded-tile bg-black/5" />
      <div className="h-[340px] animate-pulse rounded-card bg-black/5" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-tile bg-black/5" />
        ))}
      </div>
    </div>
  );
}

/**
 * K9-F5 — pregnancy mode, no pregnancy.
 *
 * Two people land here and they need opposite things. A companion has no dates
 * of his own and never will: what he is missing is the connection, so he is
 * pointed at Familia and at his code. A mamá in this state has lost or never
 * finished her own dates, and what she needs is the field that sets them.
 *
 * `loading` matters because for a companion this is usually a half-second gap
 * before the shared view lands, and telling him his invitation did not work
 * while it is still in flight would be wrong more often than right.
 */
function NoPregnancyYet({ role, loading }: { role: Role; loading: boolean }) {
  if (loading) return <HomeSkeleton />;

  const companion = role !== "mama";
  return (
    <div className="space-y-4 py-6">
      <section className="rounded-card border border-line bg-white p-5">
        <h1 className="text-xl font-black text-ink">
          {companion ? "Todavía no te conectamos" : "Falta tu fecha"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {companion
            ? "Para seguir un embarazo desde acá necesitás el código que te pasaron, o que quien te invitó vuelva a mandártelo. Si ya lo usaste, puede que estés sin internet en este momento."
            : "Guardamos tu perfil pero no la fecha de tu embarazo. Poniéndola volvés a ver tu semana, tu fecha probable de parto y todo lo demás."}
        </p>
        <Link
          href={companion ? "/familia" : "/ajustes"}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-tile bg-petrol px-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
        >
          {companion ? "Ir a Familia" : "Poner mi fecha"}
        </Link>
      </section>
      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-base font-extrabold text-ink">Mientras tanto</h2>
        <p className="mt-1 text-sm text-muted">
          Las guías, el directorio y las herramientas funcionan igual.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/guias"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-tile bg-cream text-sm font-extrabold text-petrol"
          >
            Guías
          </Link>
          <Link
            href="/herramientas"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-tile bg-cream text-sm font-extrabold text-petrol"
          >
            Herramientas
          </Link>
        </div>
      </section>
    </div>
  );
}
