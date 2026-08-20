"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useProfile } from "@/lib/useProfile";
import { formatCompletedGestation } from "@/lib/pregnancy";
import {
  ALARM_HEADING,
  ALARM_SIGNS,
  CALL_SCRIPT_STEPS,
  EMERGENCY_INTRO,
  EMERGENCY_NUMBERS,
  GO_NOW_LINE,
} from "@/lib/emergency";
import { Bilingual } from "@/components/Bilingual";
import { useT } from "@/lib/i18n/useLocale";
import { waLink } from "@/lib/whatsapp";

// Emergency mode: everything works offline and all contacts are local-only.
export default function EmergenciaPage() {
  const profile = useProfile();
  const t = useT();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          {t("emergency.title")}
        </h1>
        <Bilingual as="p" className="mt-1 text-sm text-muted" text={EMERGENCY_INTRO} />
      </header>

      {/* National numbers — big tap targets */}
      <section className="space-y-3">
        {EMERGENCY_NUMBERS.map((n) => (
          <a
            key={n.number}
            href={`tel:${n.number}`}
            className="flex items-center justify-between rounded-card bg-terracotta p-5 text-white shadow-soft transition active:scale-[0.99]"
          >
            <div>
              <p className="text-2xl font-black">{n.number}</p>
              <p className="text-sm text-white/90">{n.name}</p>
              <Bilingual
                as="p"
                className="text-xs text-white/70"
                gnClassName="mt-0.5 block italic text-white/60"
                text={n.detail}
              />
            </div>
            <PhoneIcon />
          </a>
        ))}
      </section>

      {/* Personal contacts (local-only, editable) */}
      <ContactCard
        title={t("emergency.yourHospital")}
        hint={t("emergency.yourHospitalHint")}
        nameKey="sanatorioName"
        phoneKey="sanatorioPhone"
      />
      <ContactCard
        title={t("emergency.yourContact")}
        hint={t("emergency.yourContactHint")}
        nameKey="emergencyContactName"
        phoneKey="emergencyContactPhone"
      />

      {/* What to say */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">
          {t("emergency.whenYouCall")}
        </h2>
        {profile.hasPregnancy && profile.completed && (
          <p className="mt-2 rounded-tile bg-sage/10 p-3 text-sm text-ink">
            &ldquo;Estoy embarazada de{" "}
            <strong>{formatCompletedGestation(profile.completed)}</strong>
            .&rdquo;
          </p>
        )}
        <ClinicalLine />
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-ink/90">
          {CALL_SCRIPT_STEPS.map((step) => (
            <li key={step.es}>
              <Bilingual text={step} />
            </li>
          ))}
        </ol>
      </section>

      {/* Alarm signs */}
      <section className="rounded-card border border-terracotta/20 bg-terracotta/5 p-4">
        <Bilingual
          as="div"
          className="text-base font-extrabold text-ink"
          gnClassName="mt-0.5 block text-sm font-bold italic text-ink/70"
          text={ALARM_HEADING}
        />
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-ink/90">
          {ALARM_SIGNS.map((s) => (
            <li key={s.id} className="flex gap-2">
              <span className="text-terracotta" aria-hidden>
                •
              </span>
              <Bilingual text={s.text} />
            </li>
          ))}
        </ul>
        <Bilingual
          as="p"
          className="mt-3 rounded-tile bg-terracotta/10 p-3 text-sm font-semibold leading-relaxed text-ink"
          text={GO_NOW_LINE}
        />
        <Link
          href="/guias/senales-de-alarma-embarazo"
          className="mt-3 inline-block text-sm font-medium text-petrol underline"
        >
          {t("emergency.readFullGuide")}
        </Link>
      </section>

      <p className="text-xs leading-relaxed text-muted">
        {t("emergency.disclaimer")}
      </p>
    </div>
  );
}

type ContactField =
  | "sanatorioName"
  | "sanatorioPhone"
  | "emergencyContactName"
  | "emergencyContactPhone";

function ContactCard({
  title,
  hint,
  nameKey,
  phoneKey,
}: {
  title: string;
  hint: string;
  nameKey: ContactField;
  phoneKey: ContactField;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const t = useT();

  // Live-read the saved contact straight from the local profile row.
  const row = useLiveQuery(async () => {
    const rows = await db().profile.toArray();
    return rows[0] ?? null;
  }, []);
  const savedName = (row?.[nameKey] as string | undefined) ?? "";
  const savedPhone = (row?.[phoneKey] as string | undefined) ?? "";

  async function save() {
    if (!row?.id) return;
    const changes: Partial<Record<ContactField, string>> = {
      [nameKey]: name.trim(),
      [phoneKey]: phone.trim(),
    };
    await db().profile.update(row.id, changes);
    setEditing(false);
  }

  if (!editing && savedPhone) {
    const digits = savedPhone.replace(/[^\d+]/g, "");
    return (
      <section className="rounded-card bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-ink">{title}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {savedName || t("emergency.noName")} · {savedPhone}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setName(savedName);
              setPhone(savedPhone);
              setEditing(true);
            }}
            className="text-xs text-petrol underline"
          >
            {t("action.edit")}
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <a
            href={`tel:${digits}`}
            className="flex-1 rounded-tile bg-petrol py-2.5 text-center text-sm font-medium text-white transition active:scale-[0.98]"
          >
            {t("emergency.callNow")}
          </a>
          <a
            href={waLink(savedPhone, "Necesito ayuda, es una emergencia.")}
            className="flex-1 rounded-tile bg-whatsapp py-2.5 text-center text-sm font-medium text-white transition active:scale-[0.98]"
          >
            {t("emergency.whatsapp")}
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">{title}</h2>
      <p className="mt-0.5 text-sm text-muted">{hint}</p>
      <div className="mt-3 space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (ej. Sanatorio San Roque)"
          className="w-full rounded-tile border border-black/10 bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-petrol focus:outline-none"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono (ej. +595 981 000 000)"
          className="w-full rounded-tile border border-black/10 bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-petrol focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!phone.trim() || !row?.id}
            className="flex-1 rounded-tile bg-petrol py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {t("action.save")}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-tile px-4 py-2.5 text-sm text-muted"
            >
              {t("action.cancel")}
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          Se guarda solo en tu teléfono, como todos tus datos.
        </p>
      </div>
    </section>
  );
}

// Blood type / allergies saved in the carné perinatal tool, if any.
function ClinicalLine() {
  const clinical = useLiveQuery(async () => {
    const rows = await db().clinical.toArray();
    return rows[0] ?? null;
  }, []);
  if (!clinical?.bloodType && !clinical?.allergies) return null;
  return (
    <p className="mt-2 rounded-tile bg-sage/10 p-3 text-sm text-ink">
      {clinical.bloodType && (
        <>
          Grupo sanguíneo: <strong>{clinical.bloodType}</strong>
        </>
      )}
      {clinical.bloodType && clinical.allergies && " · "}
      {clinical.allergies && (
        <>
          Alergias: <strong>{clinical.allergies}</strong>
        </>
      )}
    </p>
  );
}

function PhoneIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"
        stroke="white"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
