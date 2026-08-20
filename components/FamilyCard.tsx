"use client";

import Link from "next/link";

import type { MemberRole } from "@/lib/sharing/fields";

// BUILD-PLAN K7 — "Tu familia" on the home screen.
//
// `/familia` has been built, tested and merged since E1 and was linked from
// **nowhere**: not the nav, not Hoy, not onboarding, not Ajustes. The Fable
// review's sharpest line is about this exact card — "a shipped feature linked
// from nowhere is a bug" — and the family invite is supposed to be the growth
// engine, so it is not a small one.
//
// Three states, and the empty one is the important one. A card that says
// "nadie todavía" and stops is a small reproach on a home screen; this one
// answers the question the emptiness raises ("¿y cómo invito?") in the same
// breath, because an empty state on the growth surface is the invitation.
//
// **Roles, never names.** E1 shares no names between members and K8 did not
// start; the avatars here are role initials on pastel tokens. That is not a
// design shortcut standing in for real avatars — there is no name on the
// client to render, by construction (`SharedView["members"]` carries
// `userId`, `role`, `createdAt`, `accompanyingAt`, and nothing else).

const ROLE_LABEL: Record<Exclude<MemberRole, "owner">, string> = {
  partner: "Tu pareja",
  family: "Familia",
};

const ROLE_TONE: Record<Exclude<MemberRole, "owner">, string> = {
  partner: "bg-pastel-rosa",
  family: "bg-pastel-celeste",
};

export interface FamilyMember {
  userId: string;
  role: MemberRole;
}

export function FamilyCard({ members }: { members: FamilyMember[] }) {
  const companions = members.filter((member) => member.role !== "owner");

  return (
    // aria-label rather than aria-labelledby: the heading below changes with
    // the state ("Compartí tu embarazo" / "3 personas siguen tu embarazo"), so
    // labelling by it would give this landmark a name that moves.
    <section
      aria-label="Tu familia"
      className="rounded-card border border-line bg-white p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
            Tu familia
          </p>
          <h3 className="mt-1 text-base font-extrabold text-ink">
            {companions.length === 0
              ? "Compartí tu embarazo"
              : companions.length === 1
                ? "Una persona sigue tu embarazo"
                : `${companions.length} personas siguen tu embarazo`}
          </h3>
        </div>
        <Link
          href="/familia"
          className="shrink-0 rounded-full bg-cream px-3 py-2 text-[13px] font-extrabold text-petrol transition active:scale-[0.98]"
        >
          {companions.length === 0 ? "Invitá" : "Ver"}
        </Link>
      </div>

      {companions.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Invitá a tu pareja o a tu familia y van a ver tu semana, tu fecha
          probable de parto y tu próximo control. Nada más: tus notas, tus
          síntomas y tus fotos siguen siendo tuyas.
        </p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap items-center gap-2">
            {companions.map((member) => {
              const role = member.role as Exclude<MemberRole, "owner">;
              return (
                <li
                  key={member.userId}
                  className={`flex items-center gap-2 rounded-full ${ROLE_TONE[role]} py-1 pl-1 pr-3`}
                >
                  <span
                    aria-hidden
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-xs font-black text-ink"
                  >
                    {ROLE_LABEL[role].charAt(0)}
                  </span>
                  <span className="text-xs font-extrabold text-ink">
                    {ROLE_LABEL[role]}
                  </span>
                </li>
              );
            })}
          </ul>
          <Link
            href="/familia"
            className="mt-3 inline-block text-[13px] font-extrabold text-terracotta"
          >
            Invitar a alguien más
          </Link>
        </>
      )}
    </section>
  );
}
