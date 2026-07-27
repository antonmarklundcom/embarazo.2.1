"use client";

import Link from "next/link";
import { useState } from "react";
import { babyLabel, useProfile } from "@/lib/useProfile";
import { formatCompletedGestation } from "@/lib/pregnancy";
import { getWeek } from "@/lib/weeks";
import { getDailyTip } from "@/lib/dailyTips";
import { WEEK_NOTES, weekNote } from "@/lib/content";
import { getDaysSinceLMP } from "@/lib/pregnancy";
import { WeekProgress } from "@/components/home/WeekProgress";
import { SizeCard } from "@/components/home/SizeCard";
import { WeekArticles } from "@/components/home/WeekArticles";
import { Shortcuts } from "@/components/home/Shortcuts";
import { FeedbackCard } from "@/components/home/FeedbackCard";
import { departmentName } from "@/lib/departments";
import { Onboarding } from "@/components/Onboarding";
import { PlaneandoHome } from "@/components/PlaneandoHome";
import { LocalResourcesBlock } from "@/components/LocalResourcesBlock";
import { AppointmentBanner } from "@/components/AppointmentBanner";
import { RoadmapSection } from "@/components/RoadmapSection";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import { PrivacyLine } from "@/components/PrivacyLine";
import { InstallCard } from "@/components/InstallCard";

// "Hoy" screen — Mi Bebé design 1a (docs/REDESIGN-PLAN.md §2): week strip,
// photo hero with fallback, tip, mood check-in, herramientas grid, reading
// rail. Paraguay-specific cards (derechos, recursos, temporada) stay below.
export default function InicioPage() {
  const profile = useProfile();
  // Bump to force a re-read right after onboarding saves (useLiveQuery also
  // reacts, but this avoids any flash).
  const [, setNonce] = useState(0);

  if (profile.loading) {
    return <HomeSkeleton />;
  }

  if (!profile.hasProfile) {
    return <Onboarding onDone={() => setNonce((n) => n + 1)} />;
  }

  // Pre-pregnancy "planeando / buscando" mode shows its own dashboard.
  if (profile.mode === "planeando") {
    return <PlaneandoHome />;
  }

  const week = profile.week!;
  const trimester = profile.trimester!;
  // B2: the baby's nickname, or "tu bebé". Every caller interpolates
  // unconditionally — no screen branches on whether a nickname exists.
  const baby = babyLabel(profile.babyName);
  const department = profile.department!;
  const info = getWeek(week);
  const tip = getDailyTip(week, trimester);
  const completedLabel = profile.completed
    ? formatCompletedGestation(profile.completed)
    : null;
  // C2: the one concrete "what is happening now" line for this week, when the
  // content exists. Falls back to the daily tip, which is always present.
  const note = weekNote(week);
  const measures = WEEK_NOTES.get(week) ?? {};
  const daysSince = profile.lmpDate ? getDaysSinceLMP(profile.lmpDate) : 0;

  return (
    <div className="space-y-4">
      <WeekStrip />

      {/* C1: circular hero + the three numbers people want */}
      <WeekProgress
        week={week}
        daysSince={daysSince}
        daysRemaining={profile.daysRemaining ?? 0}
        baby={baby}
      />

      {/* C2: one concrete sentence about this week */}
      {note && (
        <p className="px-1 text-center text-[15px] font-semibold leading-relaxed text-ink">
          {note}
        </p>
      )}
      {completedLabel && (
        <p className="-mt-2 text-center text-xs text-muted">{completedLabel}</p>
      )}

      {/* C8: quick actions */}
      <Shortcuts />

      {/* Next prenatal appointment reminder (in-app only) */}
      <AppointmentBanner date={profile.nextAppointment} />

      {/* C3: size comparison, with tabs once we have foot/hand measurements */}
      <SizeCard info={info} measures={measures} baby={baby} />

      {/* Daily tip */}
      <section className="rounded-card border border-line bg-white p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tip de hoy
        </p>
        <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">
          {tip.text}
        </p>
      </section>

      {/* C5/C6: articles tied to this week, with read time */}
      <WeekArticles week={week} />

      {/* C8: feedback, once the user has actually used the app */}
      <FeedbackCard />

      {/* Daily mood check-in */}
      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-ink">
            ¿Cómo te sentís hoy?
          </h3>
          <Link
            href="/herramientas/sintomas"
            className="text-[13px] font-extrabold text-terracotta"
          >
            Registrar
          </Link>
        </div>
        <div className="mt-3.5 flex gap-2.5">
          <MoodButton tone="bg-pastel-rosa" mouth="M8.5 15.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5" />
          <MoodButton tone="bg-pastel-arena" mouth="M9 15.5h6" />
          <MoodButton tone="bg-pastel-celeste" mouth="M8.5 16.5c1-1 2.2-1.5 3.5-1.5s2.5.5 3.5 1.5" />
          <MoodButton tone="bg-pastel-lavanda" mouth="M8.5 16c1-1 2.2-1.5 3.5-1.5s2.5.5 3.5 1.5" />
        </div>
      </section>

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
        </div>
      </section>

      {/* Reading rail */}
      <section aria-labelledby="para-leer" className="space-y-2.5 pt-1">
        <h2
          id="para-leer"
          className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
        >
          Para leer hoy
        </h2>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          <ReadCard
            href={`/semana/${week}`}
            tone="bg-pastel-arena"
            title={`${baby === "tu bebé" ? "Tu bebé" : baby} a las ${week} semanas`}
          />
          <ReadCard
            href="/guias"
            tone="bg-pastel-rosa"
            title="Cambios en tu cuerpo esta semana"
          />
          <ReadCard
            href="/guias"
            tone="bg-pastel-celeste"
            title="Guías para leer con calma"
          />
        </div>
      </section>

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
      <LocalResourcesBlock trimester={trimester} department={department} week={week} />

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


function MoodButton({ tone, mouth }: { tone: string; mouth: string }) {
  return (
    <Link
      href="/herramientas/sintomas"
      aria-label="Registrar cómo te sentís"
      className={`flex h-[46px] flex-1 items-center justify-center rounded-xl ${tone} transition active:scale-95`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#322E29"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d={mouth} />
        <circle cx="9" cy="10" r="0.6" fill="#322E29" />
        <circle cx="15" cy="10" r="0.6" fill="#322E29" />
      </svg>
    </Link>
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
  icon: "feet" | "timer" | "scale" | "camera";
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

function ToolIcon({ name }: { name: "feet" | "timer" | "scale" | "camera" }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#322E29",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "feet":
      return (
        <svg {...common}>
          <path d="M10 17c-2 1.5-4.5 1.2-5.5-.5C3.4 14.7 4.5 12 7 10.5S12.6 9 13.5 10.8C14.5 12.5 12 15.5 10 17Z" />
          <circle cx="16.5" cy="6.5" r="2" />
          <circle cx="20" cy="11" r="1.2" />
        </svg>
      );
    case "timer":
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2.5" />
          <path d="M10 2h4" />
        </svg>
      );
    case "scale":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M8.5 8.5c1-1.3 2.1-2 3.5-2s2.5.7 3.5 2l-2.3 2.3a1.7 1.7 0 0 1-2.4 0Z" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M4 8h16M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M9 4h6l1 4H8Z" />
          <circle cx="12" cy="14" r="2.4" />
        </svg>
      );
  }
}

function ReadCard({
  href,
  tone,
  title,
}: {
  href: string;
  tone: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-[200px] shrink-0 flex-col justify-end rounded-card ${tone} p-3.5 transition active:scale-[0.98]`}
      style={{ minHeight: 120 }}
    >
      <p className="text-sm font-extrabold leading-snug text-ink">{title}</p>
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-full animate-pulse rounded-tile bg-black/5" />
      <div className="h-[260px] animate-pulse rounded-card bg-black/5" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-tile bg-black/5" />
        ))}
      </div>
    </div>
  );
}
