# Android / Google Play launch playbook

> **New in August 2026.** The build plan had no Android workstream at all — it
> assumed distribution by PWA install link only. The founder's stated goal is a
> Play Store listing first. This file is that missing phase, end to end.
>
> Everything here was checked against Google's current rules in August 2026.
> Play policy moves; re-check anything with a date on it before you act on it.

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

### 3.1 Data safety form — protect the "No data collected" answer

Right now the app can plausibly answer **"No data collected"**, which is rare
and is a visible badge on the listing. Two things stand between you and it,
both fixable:

- **`department` sent to `/api/v1/directory` and `/api/v1/placements`.** A
  department is a coarse region, and Play's form has an "Approximate location"
  category. Cleanest fix: the directory seed is already precached — filter by
  department **on the client** and stop sending it. Then there is nothing to
  declare.
- **`/api/v1/go/[id]` attribution** (only if `SHEETS_WEBHOOK_URL` is set) sends
  id + trimester + department fire-and-forget. Same call: either drop the
  parameters to the id alone, or declare it.

If you keep either, declare honestly — *collected, not linked to the user, not
shared, app functionality*. A wrong "no" here is a policy strike, and health
apps get looked at.

**When accounts ship (Phase A), this answer changes to "health data, linked to
identity"** and drags the deletion requirements in §3.3 with it. That is one of
the reasons `OPUS-REVIEW-2026-08.md` §4.1 argues for launching first.

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

### 3.3 Account deletion — only when accounts exist, and it needs a *web* URL

If the app ever lets a user create an account, Play requires **both**:

1. an in-app path to request deletion (planned as A5), **and**
2. a **publicly reachable web URL** where deletion can be requested **without
   installing the app or signing in** — submitted in the Data safety form.

The second one is the one people forget and get rejected for. When Phase A
lands, ship a `/borrar-cuenta` page with it.

### 3.4 The rest of the forms

- **Privacy policy URL** — must be live, public, and specifically about this
  app. `/privacidad` exists, but `DECISIONS.md` correctly flags it as a draft.
  Get the lawyer's version up *before* you submit; a placeholder policy is a
  rejection.
- **Content rating (IARC questionnaire)** — health/reference content, no user
  generated content, no gambling. Answer honestly; re-do it if you ever add a
  community feature.
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
