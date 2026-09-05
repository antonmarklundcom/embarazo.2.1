# Launch checklist — the one ordered list

Written 2026-08-26, after the dependency-migration batch closed the last
unblocked code item.

This exists because the launch path was spread across four documents —
`HANDOFF-2026-08-21.md` §3, `MVP-AND-MONETISATION.md` §2.1,
`ANDROID-LAUNCH.md` §1 and §5, and `DECISIONS.md` — and none of them is
ordered by *what to do next*. Those remain the reference for **why**; this is
the running order.

**The state it starts from: there is no unblocked code work left in v1.** Every
item below is a founder task, an external party, or a decision only you can
make. That is not a gap in the plan — it is the plan, and the code got there
first.

> **2026-09-05 — founder decision, see `DECISIONS.md` "PR-19/PR-20".** The
> plan below assumed Play Store distribution and a signed-off medical
> reviewer were on the v1 critical path. They no longer are:
>
> - **v1 launches as a PWA on the open web**, not through Play. Everything in
>   §5 ("the Play sequence") and §2.1/§2.2 (D-U-N-S, developer identity
>   verification, TWA packaging) becomes a **post-launch upgrade**, not a
>   blocker — see `DECISIONS.md` for why nothing needs migrating when it
>   ships later.
> - **§2.2 (reviewer) is no longer a hard blocker.** The build no longer
>   refuses without `NEXT_PUBLIC_MEDICAL_REVIEWER` — see "disclaimer model"
>   in `DECISIONS.md`. Recruiting a real reviewer is still valuable (it's
>   still your best distribution channel, and it's what unlocks the
>   obstetra-card/food-safety content, which stay gated), just not something
>   v1 waits on.
> - **§2.4 (lawyer review) is no longer a blocker either** — `/privacidad`
>   and `/terminos` ship AI-drafted, with a visible note that they have not
>   had a lawyer's review yet. That is a risk the founder accepted directly.
> - **§2.5 (directory) and the video gallery (§4) stay non-blocking** exactly
>   as designed — the publication gate hides unfinished entries, and the
>   video tile now shows locked with a "Pronto" badge instead of vanishing.
>
> The line below is kept for history; read it as "if you also want the Play
> Store", not as "before you can launch."

## 0. The one-line summary

> **Request the D-U-N-S number and call a gineco-obstetra today.** Everything
> else on this list can be done in a week. Those two cannot, and everything
> waits behind them.
>
> *(2026-09-05: neither blocks the v1 web launch — see the note above.)*

---

## 1. Decisions that cannot be undone — make these first

| # | Decision | Why it is irreversible | Reference |
|---|---|---|---|
| 1.1 | **Play account: organization or personal** | A personal account **cannot** be converted to an organization account later. Organization needs a D-U-N-S number (free, **1–4 weeks**) but is **exempt from the 12-testers × 14-days gate**. Personal is instant but adds 3–6 weeks before you can reach production. | `ANDROID-LAUNCH.md` §1 |
| 1.2 | **The app name** | Expensive to change after launch, and it is the indexed title. "Mi Bebé" alone is generic and crowded — you will not rank for it. `Mi Bebé — Embarazo Paraguay` puts the two words people search in the title. Check Play results **and** the Paraguayan trademark register before committing. | `ANDROID-LAUNCH.md` §4 |
| 1.3 | **Ship Guaraní reviewed-pending, or gate it** | The 78 Guaraní phrases are live in `main` today, hand-written and flagged pending review. If review will take longer than launch, decide deliberately — do not let it default. | `DECISIONS.md` D6 |

> **Recommendation on 1.1: register as an organization**, using the legal
> entity you already need for sponsor invoicing. Same $25, skips the 12-tester
> gate entirely, and the listing shows a company name rather than your personal
> legal name — which matters for a health app. **Request the D-U-N-S number
> today**; it is the long pole and nothing else on this list is.

---

## 2. Start this week — these have clocks that run without you

Run all of these **in parallel**. None depends on another.

- [ ] **2.1 — D-U-N-S number** (1–4 weeks) — only if organization. Free, from
      Dun & Bradstreet. Blocks §1.1, which blocks everything downstream.
- [ ] **2.2 — Gineco-obstetra reviewer** (weeks) — no longer a build blocker
      (`DECISIONS.md` "disclaimer model"), but still worth doing: it's your
      single best distribution channel (their patients are your first users,
      a printed QR in the consultorio beats any ad), and it's what unlocks
      the obstetra-card weekly notes and the food-safety lookup, which stay
      hidden until a real name is on them.
- [ ] **2.3 — Meta business verification** (longest lead of all) — only
      needed if you turn Facebook Login on later. Not part of v1 (it stays
      off, `AUTH_FACEBOOK_ENABLED` unset).
- [ ] **2.4 — Lawyer: privacy policy + terms** (1–2 weeks) — only required
      before a **Play Store** listing, which requires a live, lawyer-safe
      policy URL. Not required for the v1 web launch, which ships these
      AI-drafted and clearly marked as such. Have them also check the legal
      figures in `lib/derechos.ts` whenever this happens.
- [ ] **2.5 — Directory listings: 15–30 real, consented** (2–4 weeks of calls) —
      Asunción + Central. **15 real beats 50 invented**; the publication gate
      hides the rest automatically — the directory simply shows fewer entries
      until these calls happen, which does not block v1.

---

## 3. This week, and each takes hours not weeks

- [ ] **3.1 — Set a monitored deletion-request address.** One env var:
      `NEXT_PUBLIC_SUPPORT_EMAIL` (or rely on `NEXT_PUBLIC_BUSINESS_WHATSAPP`
      if that number is genuinely answered). **A deployment build refuses
      without one** — deliberately, because `/borrar-cuenta` tells a woman to
      write about deleting her health data, and a page with no address under it
      is worse than no page. This is the smallest thing standing between you
      and a deploy.
      - Whoever reads that inbox needs one rule: **only act on a request from
        the same email address the account was created with.** That is the only
        proof of ownership the app has.
- [ ] **3.2 — Hand `docs/GUARANI-REVIEW.md` to a native speaker** (days).
      Already generated — 78 phrases, one table per surface, ordered so the
      nine alarm signs come first and menu labels last. **Give them the sheet,
      not the source.** Tell them explicitly it is *jopara*, the everyday spoken
      mix, not academic Guaraní, and that loanwords people actually say
      ("checklist", "WhatsApp", "internet") were left alone **on purpose** — or
      they will "correct" it into something no user recognises. Regenerate with
      `npm run gen:guarani-review` after applying corrections; a test fails if
      it drifts.
- [ ] **3.3 — Re-do the IARC content rating.** ⚠️ **This changes a form you may
      have already filled in.** PR-7 (K20) means the app now carries
      **user-generated content**, and answering the old way would be a false
      declaration. The honest version is an easy conversation: nothing a user
      writes is public until an administrator approves it, there is no
      user-to-user messaging, published Q&A carries no author or identifying
      data, and there is a moderation queue with an audit trail. Review the
      **Data safety** declaration alongside it — `communityQuestions` is
      user-written text stored against an account, which is a new row on that
      table.
- [ ] **3.4 — Health apps declaration.** Pregnancy/menstrual **wellness** app —
      not a medical device, no diagnosis. Reuse the `/privacidad` disclaimer
      language. Note that menstrual data is a high-sensitivity category even
      though it never leaves the phone.

---

## 4. Content — start now, finishes slowly

- [ ] **4.1 — Weekly hero renders** into
      `public/assets/semanas/bebe-<week>.webp`. This is **also your LCP fix**:
      home LCP is 3.4 s today because the hero renders a fallback block. PR-8's
      `CacheFirst` rule starts working the day they land.
      `/admin/contenido` counts how many of the 42 are missing.
- [ ] **4.2 — Events and placements** — same publication gate, same argument as
      the directory.
- [ ] **4.3 — Store listing assets** (`ANDROID-LAUNCH.md` §4):
      - [ ] App icon 512×512 — **the generated placeholder is not good enough to
            launch on**
      - [ ] Feature graphic 1024×500 — required
      - [ ] 5–8 phone screenshots — `npm run gen:screenshots` starts you off,
            but framed and captioned ones convert far better
      - [ ] Short description ≤80 chars. Worth beating: *"Tu embarazo semana a
            semana, hecho para Paraguay. Funciona sin internet."* — offline is a
            real differentiator here and belongs above the fold

> **~20% of the nav renders empty states today.** PR-3's K18 copy turned those
> into honest sourcing surfaces rather than broken-looking screens, so this is
> not a blocker — but `/admin/contenido` is the checklist, and it tells you per
> collection whether what is hidden is waiting on **real data** or on **the
> reviewer's signature**. Those are two different people to call.

---

## 5. Then, in this order — the Play sequence (post-launch upgrade, not v1)

**v1 ships as a PWA on the open web without any of this** — "Agregar a la
pantalla de inicio" from a browser, no Play Console account needed. Come
back to this section when you decide to add a Play Store listing; nothing
below blocks the web launch, and nothing here needs re-doing later — same
app, same accounts, same database.

Each step genuinely waits on the one before it (`ANDROID-LAUNCH.md` §5).

1. [ ] Account decision made, D-U-N-S in hand if organization (§1.1)
2. [ ] Register developer account, pay $25, complete **developer identity
       verification** — note the address becomes publicly visible on the listing
3. [ ] Deploy to the real domain with `NEXT_PUBLIC_APP_URL` set (a real
       `NEXT_PUBLIC_MEDICAL_REVIEWER` is optional — see the 2026-09-05 note above)
4. [ ] Publish lawyer-reviewed `/privacidad` and `/terminos`
5. [ ] Package the TWA, upload to **internal testing** (up to 100 testers, no
       review wait) — this is your friends-and-family round
6. [ ] Fix assetlinks fingerprints; **confirm no URL bar on a real phone** —
       §2.3 calls this the step that goes wrong
7. [ ] Complete Data safety, Health apps, content rating, target audience, ads
8. [ ] **If personal account:** closed test, 12 testers, 14 continuous days.
       Google reviews tester *engagement* — this is not a formality.
       **If organization:** skip
9. [ ] Submit to production. **Budget days-to-weeks for the first review** — new
       accounts and health apps both get more scrutiny than average
10. [ ] Keep shipping: the site updates without a Play release

---

## 6. Decisions the code is now waiting on you for

These came out of recent work and have no code answer.

- [ ] **6.1 — Tailwind 4's browser floor.** PR-15 moved to Tailwind 4, which
      hard-requires **Chrome 111+ / Safari 16.4+ / Firefox 128+** and has no
      compatibility mode. Mi Bebé is a TWA, so the UI renders in whatever Chrome
      is on the user's phone, and the audience is mid-range Android on
      Paraguayan mobile data. Chrome 111 is March 2023 and Android's Chrome
      auto-updates, so this should be effectively everyone — but where it is
      not, the failure is custom properties and `oklab()` colours **not
      resolving at all**, not a slightly-off shade. Check the Play Console
      device/Android-version breakdown once you have one.
- [ ] **6.2 — Who answers the Q&A queue, and how fast.** K20 shipped a queue
      with no SLA. `/admin/preguntas` flags anything waiting 3+ days. **A queue
      nobody drains is worse than no queue.**
- [ ] **6.3 — K17: one app or two** for postpartum. Distribution strategy, not
      architecture. The technical recommendation is one app with a third
      `AppMode` and data carrying over at birth (`DECISIONS.md` D7).
- [ ] **6.4 — Measure performance on a real phone.** PR-8's Lighthouse numbers
      (perf 91, a11y 96, best practices 96, SEO 100) come from a container
      against localhost. That is a **regression signal, not a field
      measurement**. The real one is a mid-range Android on Paraguayan mobile
      data, against the deployed site — and per §6.1, it should now also mean
      *the oldest phone worth supporting*.

---

## 7. Known, not blocking

Written down so nobody rediscovers them at a bad moment.

- **`scripts/*.mts` are not typechecked.** `tsconfig.json` includes `**/*.ts`,
  which does not match `.mts`, so all four `.mts` files sit outside `tsc`.
  Extending `include` surfaces **two real type errors** in
  `scripts/gen-guarani-review.mts` — `.gn` read off a union whose members do
  not all carry it (the two cheers that ship without Guaraní on purpose). A
  latent bug in the generator that produces the reviewer's sheet. **Small,
  worth doing, not on the launch path.** (`DECISIONS.md` PR-16.)
- **Three dependency majors remain blocked upstream**, none forceable: Next
  15→16 and eslint 9→10 both wait on `next-auth` v5 leaving beta; TypeScript
  5→7 waits on `@typescript-eslint` supporting the native Go-port compiler,
  which is a **different clock**. One `next-auth` release unblocks the first
  two as a single combined task. (`DECISIONS.md` PR-16.)
- **e2e flake shape.** `net::ERR_ABORTED` when navigating to a `NetworkOnly`
  route around an offline transition, or under parallel load. If a spec fails
  that way, check whether it is racing a Dexie write or a service-worker route
  before assuming the code is broken.
- **CI is label-gated.** A push to a PR branch runs nothing. Validate in
  session, push once clean, then apply `run-ci` — and **re-apply it (remove,
  add) after any follow-up push**, or CI will not re-run.
- **Auto-merge is disabled** on the repository, so every PR needs a manual
  merge after green.

---

## 8. Distribution — Play is not the channel

Worth reading before launch day, because the listing's job is smaller than it
looks. A new listing in a market the size of Paraguay gets close to **zero
organic Play search traffic**. The listing buys *credibility* ("it's a real
app, it's on the Play Store") and a link you can paste. The actual distribution
is:

- **WhatsApp** — groups of embarazadas, groups of mamás, family groups. The E2
  share card and E3 invite are the growth engine, and they are already built.
- **Your medical reviewer's own patients** — the highest-trust channel you will
  ever have.
- **The obstetras, consultorios, sanatorios and farmacias you are already
  calling** for directory consent (§2.5). Every one of those calls is also a
  distribution conversation.
- **Facebook groups** for Paraguayan mothers, plus Instagram for the visual
  weeks.
- **Prenatal charlas**, ideally hosted with your reviewer — content and
  marketing in one.

**Keep the PWA install path alive alongside Play.** It is already built
(`/conoce`, `InstallCard`), it is one tap with no store round-trip, it costs
nothing extra since it is the same site, and for a low-data audience it is a
smaller download than an APK. Play and PWA are not either/or here.
