// K11 (G3) — what the home route does NOT have to download to render "Hoy".
//
// Everything below is `next/dynamic`, and the two groups are dynamic for
// different reasons:
//
// **Whole-screen alternatives.** `Onboarding`, `CompanionHome` and
// `PlaneandoHome` each replace the entire home screen for one kind of user, and
// each is dead weight for the other two. Onboarding in particular is the
// biggest of the three and is rendered exactly once in a user's life — paying
// for it in every First Load JS afterwards is the clearest waste on this route.
//
// **Below the fold.** The cards from `LocalResourcesBlock` down are past the
// first screenful on any phone this app targets. They are not less important;
// they are simply not what the user is looking at while the page paints, and
// on a 3G connection in Concepción the difference is the whole point of G3.
//
// `ssr: false` is not used anywhere here. These are prerendered into the static
// HTML as before — this changes when the *JavaScript* arrives, not whether the
// content does, so nothing below the fold turns into a blank space for a reader
// with a slow connection or no JS yet.
//
// W4: the declarations moved out of `app/(app)/page.tsx` into this module so
// the route file is layout order and nothing else. They are still evaluated
// once, at module scope, the first time the home route's chunk is imported —
// the same moment as before, producing the same chunks and the same component
// identities.

import dynamic from "next/dynamic";

export const Onboarding = dynamic(() =>
  import("@/components/Onboarding").then((m) => m.Onboarding),
);
export const CompanionHome = dynamic(() =>
  import("@/components/CompanionHome").then((m) => m.CompanionHome),
);
export const PlaneandoHome = dynamic(() =>
  import("@/components/PlaneandoHome").then((m) => m.PlaneandoHome),
);
// These three each load a whole seed file — limb sizes, perspectives,
// obstetra notes — to render one week's row out of it, and each validates it
// with zod on the way. That is ~17 kB of JSON plus the schema module, for
// content the reader meets after scrolling past the hero, the tip and the
// shortcuts.
export const SizeTabs = dynamic(() =>
  import("@/components/SizeTabs").then((m) => m.SizeTabs),
);
export const PerspectiveSwitcher = dynamic(() =>
  import("@/components/PerspectiveSwitcher").then((m) => m.PerspectiveSwitcher),
);
export const ObstetraCard = dynamic(() =>
  import("@/components/ObstetraCard").then((m) => m.ObstetraCard),
);
export const WeeklyLineCard = dynamic(() =>
  import("@/components/WeeklyLineCard").then((m) => m.WeeklyLineCard),
);
export const MedicalReviewByline = dynamic(() =>
  import("@/components/MedicalReviewByline").then((m) => m.MedicalReviewByline),
);
export const CheersCard = dynamic(() =>
  import("@/components/CheersCard").then((m) => m.CheersCard),
);
export const FamilyCard = dynamic(() =>
  import("@/components/FamilyCard").then((m) => m.FamilyCard),
);
export const NextAppointmentCard = dynamic(() =>
  import("@/components/NextAppointmentCard").then((m) => m.NextAppointmentCard),
);
export const MoodCheckIn = dynamic(() =>
  import("@/components/MoodCheckIn").then((m) => m.MoodCheckIn),
);
export const WeekArticleFeed = dynamic(() =>
  import("@/components/WeekArticleFeed").then((m) => m.WeekArticleFeed),
);
export const LocalResourcesBlock = dynamic(() =>
  import("@/components/LocalResourcesBlock").then((m) => m.LocalResourcesBlock),
);
export const PopularThisWeek = dynamic(() =>
  import("@/components/PopularThisWeek").then((m) => m.PopularThisWeek),
);
export const ShareCard = dynamic(() =>
  import("@/components/ShareCard").then((m) => m.ShareCard),
);
export const RoadmapSection = dynamic(() =>
  import("@/components/RoadmapSection").then((m) => m.RoadmapSection),
);
export const InstallCard = dynamic(() =>
  import("@/components/InstallCard").then((m) => m.InstallCard),
);
export const CreateAccountNudge = dynamic(() =>
  import("@/components/CreateAccountNudge").then((m) => m.CreateAccountNudge),
);
export const InviteFriend = dynamic(() =>
  import("@/components/InviteFriend").then((m) => m.InviteFriend),
);
