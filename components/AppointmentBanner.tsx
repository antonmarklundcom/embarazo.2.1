"use client";

import Link from "next/link";

import { formatAppointment, isAccompanying } from "@/lib/appointments";
import type { MemberRole } from "@/lib/sharing/fields";

// In-app reminder for the next prenatal control (build spec §4). NO push:
// purely informational, shown only near the date or once it has passed.
//
// K8 adds the answer to "¿quién me acompaña?" — by role, never by name. E1
// never shared names between members and K8 does not start; "te acompaña tu
// pareja" is the whole sentence, and it is the sentence she actually wants.
const DAY = 86_400_000;

const ACCOMPANIST_LABEL: Record<Exclude<MemberRole, "owner">, string> = {
  partner: "tu pareja",
  family: "alguien de tu familia",
};

export interface AccompanyingMember {
  role: MemberRole;
  accompanyingAt: number | null;
}

function companionLine(
  members: AccompanyingMember[] | undefined,
  date: number,
): string | null {
  const coming = (members ?? [])
    .filter((member) => member.role !== "owner")
    .filter((member) => isAccompanying(member.accompanyingAt, date));
  if (coming.length === 0) return null;

  // Deduplicated by role: two family members coming is still "alguien de tu
  // familia" plus "tu pareja", not a list of anonymous ids.
  const labels = [
    ...new Set(
      coming.map(
        (member) =>
          ACCOMPANIST_LABEL[member.role as Exclude<MemberRole, "owner">],
      ),
    ),
  ];
  return `Te acompaña ${labels.join(" y ")}.`;
}

export function AppointmentBanner({
  date,
  members,
}: {
  date?: number;
  /** K8 — the owner's guest list, used only to say who is coming. */
  members?: AccompanyingMember[];
}) {
  if (!date) return null;

  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const isPast = date < startOfToday;
  const daysAway = Math.ceil((date - now) / DAY);

  // Only surface within 3 days, or once past.
  if (!isPast && daysAway > 3) return null;

  if (isPast) {
    return (
      <Link
        href="/ajustes"
        className="block rounded-card border border-terracotta/30 bg-terracotta/5 p-4 transition active:scale-[0.99]"
      >
        <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-terracotta">
          Control prenatal
        </p>
        <p className="mt-1 text-sm text-ink">
          Tu control era el {formatAppointment(date)}. ¿Ya fuiste? Actualizá la fecha del
          próximo en Ajustes.
        </p>
      </Link>
    );
  }

  return (
    <Link
      href="/ajustes"
      className="block rounded-card border border-petrol/20 bg-petrol/5 p-4 transition active:scale-[0.99]"
    >
      <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-petrol">
        Próximo control
      </p>
      <p className="mt-1 text-sm text-ink">
        Tu próximo control es el {formatAppointment(date)} — no te olvides.
      </p>
      {companionLine(members, date) && (
        <p className="mt-1 text-sm font-extrabold text-petrol">
          {companionLine(members, date)}
        </p>
      )}
    </Link>
  );
}
