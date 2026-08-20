"use client";

import type { Role } from "@/lib/db";
import { ROLE_ONBOARDING_COPY, ROLE_ORDER } from "@/lib/roleCopy";

import { BackButton, ChoiceCard } from "./controls";

/**
 * "¿Cómo te describís vos?" (B1).
 *
 * `invited` only changes the sentence underneath. The role list is the same
 * one — a mamá can be invited too (a sister following her sister), and hiding
 * "mamá" from somebody holding a code would make that impossible to say.
 */
export function RoleStep({
  invited,
  onChoose,
  onBack,
}: {
  invited: boolean;
  onChoose: (role: Role) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="px-1 text-sm font-extrabold text-ink">
        ¿Cómo te describís vos?
      </p>
      {ROLE_ORDER.map((r) => (
        <ChoiceCard
          key={r}
          title={ROLE_ONBOARDING_COPY[r].title}
          desc={ROLE_ONBOARDING_COPY[r].desc}
          onClick={() => onChoose(r)}
        />
      ))}
      <p className="px-1 text-xs text-muted">
        {invited
          ? "Con esto sabemos si la app te muestra tu propio embarazo o el de la persona que te invitó. Podés cambiarlo cuando quieras desde Ajustes."
          : "Esto ajusta cómo te habla la app. Podés cambiarlo cuando quieras desde Ajustes."}
      </p>
      <BackButton onClick={onBack} />
    </div>
  );
}
