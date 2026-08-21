# Android / Google Play launch playbook

> **New in August 2026.** The build plan had no Android workstream at all — it
> assumed distribution by PWA install link only. The founder's stated goal is a
> Play Store listing first. This file is that missing phase, end to end.
>
> Everything here was checked against Google's current rules in August 2026.
> Play policy moves; re-check anything with a date on it before you act on it.
>
> **Amended by K5 (August 2026).** §3.1 was rewritten for the account-first
> launch: the app declares account data and health data honestly rather than
> protecting a "No data collected" badge, per §5 D2 of
> `docs/FABLE-PLAN-2026-08.md`. §3.3's deletion requirements are now
> unconditional, because accounts ship in v1.0.

---

## 0. What we are actually shipping

Mi Bebé is a Next.js PWA. It goes on Play as a **Trusted Web Activity (TWA)** —
an Android app whose entire UI is the live site, running in Chrome without
browser chrome. This is Google's officially supported path for PWAs, not a
loophole, and a TWA is exempt from the "no thin webview wrappers" rule *as long
as it behaves like an app*: works offline, installs, no visible URL bar.

Consequences worth understanding before you start:

- **The app is the website.** Deploying to Hostinger updates the Play app
  instantly, with no new release and no review. Only the wrapper (icon, name,
  permissions, target SDK) needs a Play release.
- **If the site is down, the app is down.** There is no bundled fallback beyond
  the service-worker cache. The offline shell already built (`app/offline/`,
  42 precached week pages) is what stands between a Hostinger outage and a
  one-star review.
- **The listing is judged on the live site.** Lighthouse, performance and the
  privacy policy URL all point at production.

---

## 1. The account decision — make this one first, it cannot be undone

$25, one time, one account, forever. But **which kind of account changes your
timeline by 3–6 weeks**, and you cannot convert a personal account to an
organization account later.

| | Personal account | Organization account |
|---|---|---|
| Cost | $25 | $25 |
| Needs a D-U-N-S number | no | **yes** (free from Dun & Bradstreet, allow 1–4 weeks) |
| Closed testing before production | **12 testers, opted in, 14 continuous days** | **exempt** — publish straight to production |
| Public developer name on the listing | your legal name | your company name |
| Best if | you have no company | you have (or will have) a legal entity |

The **12 testers × 14 days** rule applies to personal accounts created after
13 November 2023 — which yours would be. The 14-day clock only starts once your
closed-test release is approved *and* 12 testers are actually opted in, and
testers must stay opted in throughout. Finding 12 real people who install and
keep the app is the part that goes wrong, and it is not a formality: Google
reviews tester engagement.

**Recommendation: register as an organization**, using the legal entity you
already need for sponsor invoicing (`REVIEW-AND-LAUNCH-PLAN.md` §4.6). It costs
the same, it skips the 12-tester gate entirely, and the listing shows a company
name instead of a personal one — which matters for a health app. Request the
D-U-N-S number **today**, because it is the long pole: everything else can be
done in a week, that cannot.

If you go personal instead: it still works, just start the closed test the
moment you have anything installable, and run the friends-and-family round
*as* the closed test so the 14 days elapse in parallel with content work.

Either way you also complete **developer identity verification** (legal name,
address, phone, email — the address becomes publicly visible on the listing).

---

## 2. Technical: PWA → signed .aab

### 2.1 Prerequisites on the site, all already true

- HTTPS on a real domain — needed anyway.
- Valid manifest with `name`, `short_name`, `start_url`, `display: standalone`,
  `theme_color`, `background_color`, and 192 + 512 px icons — ✅ shipped,
  including a maskable 512 and two screenshots.
- A service worker with an offline fallback — ✅ Serwist, `app/offline/`.
- Good Lighthouse scores. Re-run against production before packaging.

### 2.2 Build the wrapper

Two paths; use the first one now and the second when you want it in CI.

1. **PWABuilder** (pwabuilder.com) — paste the production URL, download a zip
   with a `.apk` for side-load testing and a signed `.aab` for upload. No local
   toolchain. Fastest way to a first upload.
2. **Bubblewrap** (`npm i -g @bubblewrap/cli`) — the CLI PWABuilder runs
   underneath. Needs a JDK and the Android SDK. Use this once the wrapper needs
   maintaining, since it is scriptable and diffable.

Settings that matter for this app:

- **`targetSdkVersion` 36 (Android 16).** From **31 August 2026**, new apps and
  updates must target API 36 to be accepted. That deadline is days away — make
  sure whatever tool you use is current, and check the generated
  `build.gradle` rather than trusting the default.
- **`enableNotifications: true`** — bridges Web Push to Android's
  `POST_NOTIFICATIONS` runtime permission (required since Android 13). Without
  it, B5 push silently does nothing on modern phones. Set it now even though
  push ships later; changing it later needs a new release.
- `orientation: portrait`, `display: standalone`, theme/background colours from
  the manifest — already consistent.
- **Version code must increase on every upload.** Play rejects a re-upload of
  the same code, and it is the most common first-submission stumble.

### 2.3 Digital Asset Links — the step that goes wrong

Android only trusts the site as "yours" if this file is reachable at
`https://<your-domain>/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "py.com.tudominio.mibebe",
    "sha256_cert_fingerprints": [
      "UPLOAD_KEY_SHA256",
      "PLAY_APP_SIGNING_KEY_SHA256"
    ]
  }
}]
```

**The failure everyone hits:** they list only the upload key's fingerprint. Play
re-signs your app with its own key, so the *released* build's fingerprint is
different — and the app opens with a browser URL bar across the top, which
looks broken and is an instant credibility loss for a health app. List **both**.
Get the Play signing fingerprint from Play Console → *Test and release → Setup →
App integrity → App signing key certificate*, after your first upload.

Serving it from Next.js: put it at `public/.well-known/assetlinks.json`. Then
**verify it for real** after deploying — some hosts and static handlers drop
dot-directories:

```bash
curl -sS https://<your-domain>/.well-known/assetlinks.json
```

It must return the JSON with `Content-Type: application/json` and no redirect.
If it 404s, add a rewrite in `next.config.ts` to a route handler instead.
Google's own checker: `https://developers.google.com/digital-asset-links/tools/generator`.

Test the finished APK on a real phone before uploading: install it, open it,
and confirm **no URL bar**. That single check catches most packaging errors.

---

## 3. Play Console compliance surfaces

These are forms, not code, and each one blocks publishing.

### 3.1 Data safety form — declare it honestly

> **Rewritten by K5 (August 2026).** This section used to be called "protect the
> 'No data collected' answer" and told you which two parameters to strip to keep
> the badge. **That badge is gone, on purpose.** §5 D2 of
> `docs/FABLE-PLAN-2026-08.md` gave it up: the app has accounts, sync, family
> sharing and opt-in photo backup, so the honest answer is "yes, and here is
> what". Keep the opaque-payload architecture (ARCHITECTURE.md §4.3) — it is
> engineering, and it is what keeps the *contents* of that declaration small —
> but the badge no longer vetoes product decisions.
>
> The old advice is preserved below as "what J3 removed, and what stays
> removed", because two of those three removals were right for reasons that had
> nothing to do with the badge.

**A wrong "no" here is a policy strike, and health apps get looked at.** Answer
every row from this table, which is the app as it actually behaves.

| Data type | Collected? | Linked to identity? | Shared? | Purpose | Optional? |
|---|---|---|---|---|---|
| **Name** | Yes | Yes | No | Account management, app functionality | Yes — "seguir sin cuenta" |
| **Email address** | Yes | Yes | No | Account management | Yes — same |
| **User IDs** | Yes | Yes | No | Account management, app functionality | Yes — same |
| **Health info** | Yes | Yes | No | App functionality | Yes — same |
| **Photos** | Yes | Yes | No | App functionality | **Yes — separate opt-in**, off by default (K4) |
| **App interactions** | Yes | **No** | No | Analytics | No |
| **Approximate location** | **No** | — | — | — | — |
| **Contacts / SMS / call log / calendar** | **No** | — | — | — | — |
| **Financial info** | **No** | — | — | — | — |

Row by row, with the thing that makes each answer defensible:

- **Name · email · user id.** The minimum Google and Facebook will give
  (ARCHITECTURE.md §4.7). No friend lists, no other scopes, ever. Present only
  for a user who signed in; "seguir sin cuenta" collects none of it, which is
  what makes the **optional** column a yes rather than a technicality.
- **Health info — "linked to identity", and say so.** Synced records are keyed
  to a user id, and pretending otherwise because the payload is opaque would be
  a lie about the shape of the data rather than about its contents. What §4.3
  buys is real and worth stating in the *privacy policy* (not this form, which
  has no box for it): the server stores a typed envelope it never queries into
  and never indexes, so it does not learn which symptom, which week, or which
  note — even though it knows whose.
- **Photos — a second, separate opt-in.** K4's backup is off unless she turns
  it on, the bytes go to object storage via a short-lived presigned URL, and
  turning it off deletes the server copies. Declare it as optional, because it
  genuinely is.
- **App interactions — collected, NOT linked.** This is `/api/v1/stats`, and it
  is the one row where the architecture does the arguing for you: the table has
  no identity column at all (A1), no session is ever read, no IP is retained,
  and the finest timestamp is a calendar day. K5 put the pregnancy `week` back
  on this counter (§5 D2, §7) — declare it under this row, not under Health
  info, because the row is `(week, content_id, day, count)` with nothing to
  join it to. `lib/stats/contentStats.test.ts` asserts the whole POST shape, so
  this answer stays true by test rather than by memory.
- **Approximate location — still no**, and this is J3's win that survives. See
  below.

**What J3 removed, and what stays removed.** J3 stripped `department` from
`/api/v1/directory` and `/api/v1/placements`, `trimester` + `department` from
`/api/v1/go/[id]`'s attribution, and the `week` from `/api/v1/stats`. K5 put
back **only the last one**. The first three stay gone, and not for the badge:

- The directory and placement seeds are precached, tens of entries, filtered on
  the device in a millisecond. A parameterless route caches under **one key**
  for every user in the country, which is a better offline design than a
  per-department cache would ever be. That is worth more than the badge was.
- `/go`'s attribution is a fire-and-forget redirect to `wa.me`. Sending a
  sponsor a trimester tells them a health fact about whoever just tapped, which
  ARCHITECTURE.md §4.6 rules out independently of any Play form.

So: **"Approximate location: not collected" is still an honest answer**, and it
is the one row of this table that is honest by construction rather than by
policy.

### 3.1.1 The consequences that come with the honest answer

Declaring accounts and health data pulls in obligations the "No data collected"
version dodged. All of them are already built; this is the checklist that they
are still true at submission time.

- **§3.3's web deletion URL is now mandatory, not conditional.** Read it.
- **The privacy policy must match this table**, and be the lawyer's version —
  ARCHITECTURE.md §8 requires that before any account feature reaches real
  users, and a policy that contradicts the Data safety form is a rejection.
- **Consent for storing health data is collected explicitly at sign-up** (A4),
  not buried in a "by continuing you agree" line.
- **Re-do the Data safety form when K20 (curated Q&A) ships.** A user-submitted
  question is user-generated content, and it changes the IARC content rating in
  §3.4 as well.

### 3.2 Health apps declaration — mandatory

Play Console → *Policy → App content → Health apps*. Declare it as a
pregnancy/menstrual tracking wellness app, not a medical device, no diagnosis.
The `/privacidad` disclaimer language already says the right thing; reuse it.

Note the current Health & Fitness guidelines treat **menstrual cycle data as a
high-sensitivity category** — your `planeando` mode collects it, even though it
never leaves the phone. And there is an explicit prohibition on using sensitive
health data for employment or insurance eligibility, or for unauthorised social
sharing. None of that is a problem here; the E2 share card just has to keep
doing what it already promises — share the *week*, never the health details.

### 3.3 Account deletion — required, and it needs a *web* URL

> **K5 (August 2026): this is no longer conditional.** The app ships with
> accounts (§5 D1). Both items below are launch blockers.

Play requires **both**:

1. an in-app path to request deletion (planned as A5), **and**
2. a **publicly reachable web URL** where deletion can be requested **without
   installing the app or signing in** — submitted in the Data safety form.

The second one is the one people forget and get rejected for. A5 built the
in-app path (Ajustes → "Borrar mi cuenta", server rows + an offer to wipe the
device). **Both now exist.** `/borrar-cuenta` is live: a static, signed-out page
outside the `(app)` route group, with no client JavaScript, listing what
deletion removes and how to request it without installing anything. Submit that
URL in the Data safety form.

Two things about it are deliberate and should not be "fixed" later:

- **It has no form.** A box that takes an email address and deletes the account
  is an unauthenticated deletion endpoint — a way for anyone to erase somebody
  else's pregnancy by typing their address, and no rate limit fixes it because
  the request is indistinguishable from the real one. The page describes a
  human process; A5's authenticated path stays the only mechanism.
  `e2e/borrar-cuenta.spec.ts` asserts no form, input or textarea ever appears.
- **A deployment build fails without a contact channel.** `NEXT_PUBLIC_SUPPORT_EMAIL`
  or `NEXT_PUBLIC_BUSINESS_WHATSAPP` must be set to something real, or
  `lib/launchChecks.ts` refuses the build (§Z2's mechanism, second check). A
  page telling a woman to write to us, with no address under it, is worse than
  no page.

**Founder task:** decide which address receives these and make sure a human
reads it. The page promises a reply within 30 days.

### 3.4 The rest of the forms

- **Privacy policy URL** — must be live, public, and specifically about this
  app. `/privacidad` exists, but `DECISIONS.md` correctly flags it as a draft.
  Get the lawyer's version up *before* you submit; a placeholder policy is a
  rejection.
- **Content rating (IARC questionnaire)** — health/reference content, no user
  generated content, no gambling. Answer honestly; **re-do it when K20's
  curated Q&A ships** — a user-submitted question is user-generated content
  even when nothing publishes without admin approval.
- **Target audience** — adults. Do **not** select any child age band; that pulls
  you into the Families policy programme for no reason.
- **Ads declaration** — "contains ads" is about promotional content shown in the
  app, not just ad networks. Today: no. **The moment sponsored directory
  listings or the `Beneficios` tab go live with paying partners, the honest
  answer becomes yes** — plan for that, and label sponsored entries in-app
  (`SponsoredBadge` already exists).
- **Government apps / financial features / news** — all no.

---

## 4. Store listing assets you must produce

| Asset | Spec | Notes |
|---|---|---|
| App name | ≤ 30 chars | ASO matters — see below |
| Short description | ≤ 80 chars | The line people actually read |
| Full description | ≤ 4000 chars | es-PY, keyword-rich, honest |
| App icon | 512×512 PNG | The generated placeholder is not good enough to launch on |
| Feature graphic | 1024×500 PNG | Required. Shown at the top of the listing |
| Phone screenshots | ≥ 2, ideally 5–8 | `npm run gen:screenshots` gets you started, but framed/captioned ones convert far better |

**On the name:** "Mi Bebé" is generic and crowded on Play — you will not rank
for it. Something like **"Mi Bebé — Embarazo Paraguay"** puts the two words
people actually search (*embarazo*, *Paraguay*) in the indexed title. Check the
Play search results and the Paraguayan trademark register before committing;
the name is expensive to change after launch.

Short description worth beating: *"Tu embarazo semana a semana, hecho para
Paraguay. Funciona sin internet."* — offline is a genuine differentiator here
and belongs above the fold.

---

## 5. Order of operations

1. **Decide personal vs organization. Request the D-U-N-S number if
   organization.** ← do this first, everything else waits on it
2. Register the developer account, pay the $25, complete identity verification.
3. Deploy the real site to the real domain (`NEXT_PUBLIC_APP_URL`), with a real
   `NEXT_PUBLIC_MEDICAL_REVIEWER` — the build refuses to ship without it.
4. Publish the lawyer-reviewed `/privacidad` and `/terminos`.
5. Package the TWA, upload to **internal testing** (up to 100 testers, no review
   wait) — this is your friends-and-family round.
6. Fix the assetlinks fingerprints, confirm no URL bar on a real phone.
7. Complete Data safety, Health apps declaration, content rating, target
   audience, ads declaration.
8. If personal account: closed testing, 12 testers, 14 days. If organization:
   skip to 9.
9. Submit to production. **Budget days to weeks for the first review** — new
   accounts and health apps both get more scrutiny than the average.
10. Then keep shipping: the site updates without a Play release.

---

## 6. Getting the first users — Play is not the channel

A new listing in a market the size of Paraguay gets close to zero organic Play
search traffic. The listing's job is **credibility** ("it's a real app, it's on
the Play Store") and a link you can paste. The actual distribution is:

- **WhatsApp.** Groups of embarazadas, groups of mamás, family groups. The E2
  share card and E3 invite (`Invitá a una amiga`) are the growth engine and are
  worth building before launch, not after.
- **Your medical reviewer's own patients.** The highest-trust channel you will
  ever have. A printed QR in the consultorio beats any ad.
- **Obstetras, consultorios, sanatorios, farmacias** in Asunción and Central —
  the same people you are calling for directory consent. Every one of those
  calls is also a distribution conversation.
- **Facebook groups** for Paraguayan mothers, which are still where this
  audience lives, plus Instagram for the visual weeks.
- **Prenatal classes and charlas** — `REVIEW-AND-LAUNCH-PLAN.md` §4.7 is right
  that hosting your own charla with the reviewer is both content and marketing.

**Keep the PWA install path alive alongside Play.** It is already built
(`/conoce`, `InstallCard`), it is one tap with no store round-trip, it costs
nothing to maintain since it is the same site, and for a low-data audience it
is a smaller download than an APK. Play and PWA are not either/or here.

**iOS later:** a TWA has no iOS equivalent. iPhone users get the PWA
"Agregar a inicio" path today; a real App Store listing would need a separate
wrapper (Capacitor) and Apple's review, which is a bigger project. Android-first
is the right call for this market.
