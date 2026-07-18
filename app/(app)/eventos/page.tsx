"use client";

import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/lib/useProfile";
import { DEPARTMENTS, departmentName } from "@/lib/departments";
import { EVENTS } from "@/lib/seed/events";
import type { EventItem, EventType } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";
import { SponsoredBadge } from "@/components/SponsoredBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";

const TYPE_LABELS: Record<EventType, string> = {
  charla: "Charla",
  taller: "Taller",
  feria: "Feria",
  clase: "Clase",
  encuentro: "Encuentro",
};

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventosPage() {
  const profile = useProfile();
  const [department, setDepartment] = useState("");

  // Default to stored department once it loads; "" = all departments.
  useEffect(() => {
    if (profile.department) setDepartment(profile.department);
  }, [profile.department]);

  const now = Date.now();
  const events = useMemo(() => {
    const filtered = department
      ? EVENTS.filter((e) => e.department === department)
      : EVENTS;
    return [...filtered].sort((a, b) => a.date - b.date);
  }, [department]);

  const upcoming = events.filter((e) => e.date >= now);
  const past = events.filter((e) => e.date < now);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Eventos</h1>
        <p className="text-sm text-muted">
          Charlas, talleres y encuentros para embarazadas y mamás.
        </p>
      </header>

      <select
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        aria-label="Departamento"
        className="min-h-[44px] w-full rounded-tile border border-black/10 bg-white px-3 text-sm focus:border-petrol focus:outline-none"
      >
        <option value="">Todos los departamentos</option>
        {DEPARTMENTS.map((d) => (
          <option key={d.slug} value={d.slug}>
            {d.name}
          </option>
        ))}
      </select>

      {upcoming.length === 0 && (
        <div className="rounded-card bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-muted">
            No hay eventos próximos
            {department ? ` en ${departmentName(department)}` : ""}. Probá con
            otro departamento.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {upcoming.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>

      {past.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-medium text-muted">Eventos pasados</h2>
          {past.map((e) => (
            <EventCard key={e.id} event={e} past />
          ))}
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Los eventos son seleccionados por el equipo de Mi Bebé y pueden incluir
        propuestas patrocinadas, siempre señaladas como “Patrocinado”. La
        información es referencial.
      </p>
    </div>
  );
}

function EventCard({ event, past = false }: { event: EventItem; past?: boolean }) {
  const wa = event.whatsappNumber
    ? waLink(
        event.whatsappNumber,
        `Hola! Vi el evento "${event.title}" en Mi Bebé y quisiera más información.`,
      )
    : null;

  return (
    <article
      className={`rounded-card bg-white p-4 shadow-soft ${past ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-block rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium text-petrol">
            {TYPE_LABELS[event.type]}
          </span>
          <h2 className="mt-1.5 text-base font-extrabold text-ink">{event.title}</h2>
        </div>
        {event.isSponsored && <SponsoredBadge />}
      </div>

      <p className="mt-1 text-sm capitalize text-terracotta">
        {fmtDateTime(event.date)}
      </p>
      <p className="text-sm text-muted">
        {event.venue ? `${event.venue} · ` : ""}
        {event.city}, {departmentName(event.department)}
      </p>
      <p className="mt-2 text-sm text-ink">{event.description}</p>
      <p className="mt-1 text-xs text-muted">Organiza: {event.organizer}</p>

      {!past && (wa || event.mapsUrl) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {wa && <WhatsAppButton href={wa} label="Consultar" />}
          {event.mapsUrl && (
            <a
              href={event.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
            >
              Cómo llegar
            </a>
          )}
        </div>
      )}
    </article>
  );
}
