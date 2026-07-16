"use client";

import Link from "next/link";
import { useState } from "react";
import { useProfile } from "@/lib/useProfile";
import { formatCompletedGestation } from "@/lib/pregnancy";
import { getWeek } from "@/lib/weeks";
import { getDailyTip } from "@/lib/dailyTips";
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
  const department = profile.department!;
  const info = getWeek(week);
  const tip = getDailyTip(week, trimester);
  const completedLabel = profile.completed
    ? formatCompletedGestation(profile.completed)
    : null;

  return (
    <div className="space-y-4">
      <WeekStrip />

      {/* Hero week card */}
      <HeroCard
        week={week}
        trimester={trimester}
        completedLabel={completedLabel}
        sizeComparison={info.sizeComparison}
      />

      {/* Next prenatal appointment reminder (in-app only) */}
      <AppointmentBanner date={profile.nextAppointment} />

      {/* Daily tip */}
      <section className="rounded-card border border-line bg-white p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tip de hoy
        </p>
        <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">
          {tip.text}
        </p>
      </section>

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
            title={`Tu bebé a las ${week} semanas`}
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

function HeroCard({
  week,
  trimester,
  completedLabel,
  sizeComparison,
}: {
  week: number;
  trimester: number;
  completedLabel: string | null;
  sizeComparison: string;
}) {
  // Weekly render lives at /assets/semanas/bebe-<week>.webp when the founder
  // has added it (REDESIGN-PLAN.md §4); until then show the arena fallback.
  const [imgError, setImgError] = useState(false);
  return (
    <Link
      href={`/semana/${week}`}
      className="relative block overflow-hidden rounded-card bg-pastel-arena shadow-soft transition active:scale-[0.99]"
    >
      {imgError ? (
        <div className="flex h-[220px] items-center justify-center">
          <span className="text-[110px] font-black leading-none text-white">
            {week}
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/semanas/bebe-${week}.webp`}
          alt={`Tu bebé a las ${week} semanas`}
          className="block h-[260px] w-full object-cover"
          style={{ objectPosition: "center 18%" }}
          onError={() => setImgError(true)}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(50,46,41,0) 46%, rgba(50,46,41,0.55) 100%)",
        }}
      />
      <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold tracking-[1.6px] text-[#FBE9D8]">
            SEMANA {week} · {trimester}.º TRIMESTRE
          </p>
          <p className="mt-1 text-2xl font-black text-white">
            {completedLabel ?? `Semana ${week}`}
          </p>
          <p className="mt-0.5 text-xs font-bold text-white/85">
            Del tamaño de {sizeComparison}
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-white px-4 py-2 text-[13px] font-extrabold text-ink">
          Detalles
        </span>
      </div>
    </Link>
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
