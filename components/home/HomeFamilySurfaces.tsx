// W4: the three family surfaces of "Hoy" — ánimos, "Tu familia", and the next
// appointment — moved verbatim out of `app/(app)/page.tsx`. They are one group
// because they are gated by one thing: `ownerView`, the owner's server-side
// view, which is non-null exactly when there is an account, a database and a
// pregnancy row.
//
// Returns a fragment, so all three stay direct children of the page's
// `space-y-4` stack and keep their spacing. Every card is the same
// `next/dynamic` component from `dynamicSections` as before.

import type { SharedView } from "@/lib/sharing/client";

import {
  CheersCard,
  FamilyCard,
  NextAppointmentCard,
} from "./dynamicSections";

export function HomeFamilySurfaces({
  ownerView,
  nextAppointment,
  companionAppointmentAt,
}: {
  ownerView: SharedView | null;
  nextAppointment: number | undefined;
  companionAppointmentAt: number | null;
}) {
  return (
    <>
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
        appointmentAt={nextAppointment}
        guests={ownerView?.members ?? []}
        companionAppointmentAt={companionAppointmentAt}
      />
    </>
  );
}
