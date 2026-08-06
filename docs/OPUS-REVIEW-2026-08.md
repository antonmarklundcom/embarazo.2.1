# Independent review — August 2026

> Requested by the founder: *"check the plan, see if it looks good or if we
> should modify it, and tell me what's left to have a working application I can
> publish on Android."*
>
> This file is a **review and a set of recommendations**, not a decision. Where
> it disagrees with a founder decision already recorded in
> `docs/FEATURE-MAP.md` or `DECISIONS.md`, that decision still stands until the
> founder changes it. Two things in §3 are bugs, not opinions, and were fixed
> in the same commit as this file.

---

## 1. State of the repo, verified not assumed

Everything below was run on this branch, not taken from the docs:

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm test` | **101 tests, all pass** (10 files) |
| `npm run build` | passes; 42 week pages + 8 guías prerendered, 107 kB shared JS |
| CI | lint + unit + build + Playwright e2e, all wired |

The engineering is genuinely good, and unusually disciplined for a pre-launch
app: server-only boundaries enforced by the build, zod whitelists on every API
param with tests, placeholder data gated by a deep string scan rather than a
field list, a build-time check that refuses to ship a fake medical byline. The
documentation is better than most funded startups have.

**The honest summary is unchanged from the July review: the code is
launch-quality, the data is not, and now the plan is the thing at risk.**

---

## 2. The core problem with the plan: it is sequenced for the wrong goal

`docs/BUILD-PLAN.md` is sequenced to reach **feature parity with Preggers**.
It should be sequenced to reach **the first 100 Paraguayan mothers on an
Android phone**. Those are different targets and they order the work
differently.

The current "friends-and-family" sequence is:

> Z1 · Z2 · A1 · A2 · A3 · A4 · A5 · A7 · B1 · B2 · B3 · B5 · C1–C8 · D1 · D4 · E2 · E3

That is 20 tasks, five of them **L** or **M**-heavy (sync engine, push, admin
panel, the whole home screen), *before* a single real user sees the app. On a
solo build that is months. Meanwhile the things that actually block launch —
a medical reviewer, 30–50 consented directory listings, a lawyer's read of
`lib/derechos.ts`, a native Guaraní review — are **not code**, have **external
lead times measured in weeks**, and are not started.

The risk is not that the plan is wrong. It is that the app is excellent and
never ships.

### Recommendation: split the plan into "launch" and "after launch"

**Launch path (what the first users need):**

- Real content: reviewer, directory, videos, events, legal figures, Guaraní.
- **Phase J — Android/Play packaging** (new; see `docs/ANDROID-LAUNCH.md`).
- C1 · C2 · C3 (week hero, one-liner, size tabs) — this is the ten-second
  judgment and it is cheap.
- **D3 food lookup** — promoted. See §4.
- E2 share card, E3 invite — WhatsApp is the distribution channel in Paraguay.
- G1 content ops (validated JSON) — do it *before* the content push, as the
  plan already says.
- B5 push, **built without accounts** — see §5.

**After the first release:** A2–A7 (accounts, sync, admin), Phase F (AI baby),
Phase I, D2, D5, D6, E1, E4, E5, Phase H.

Nothing is deleted. The ordering changes, and the ordering is the whole
argument.

---

## 3. Two live bugs found, and fixed in this commit

These are not roadmap items. They break the app's single core promise — *your
data is safe on your phone* — today, in shipped code.

### 3.1 Encrypted journal notes were silently corrupted by Spanish

`lib/crypto.ts` encoded plaintext with a `charCodeAt` loop, which truncates
every code point above U+00FF. `decryptNote()` then read those bytes back as
UTF-8. Round-tripping a real note:

```
in:  "Hoy tuve náuseas y dolor de cabeza 😊 ¡mucho! niño"
out: "Hoy tuve n�useas y dolor de cabeza =\n �mucho! ni�o"
```

Every accent, every `ñ`, every `¡`/`¿`, every emoji — destroyed, unrecoverably,
the moment a user set a PIN. In an es-PY app that is most notes, and the
corruption is silent: nothing throws, the note just comes back wrong. Fixed by
encoding with `TextEncoder` (matching the `TextDecoder` on the way out), plus a
chunked base64 encoder so a long note cannot blow the argument limit.

### 3.2 A restored backup could never open its own encrypted notes

`exportBackup()` writes every Dexie table. The PIN salt and verifier live in
`localStorage`, which it did not touch. So restoring a backup onto a new phone
— **the exact scenario backup exists for** — produced ciphertext with the key
material left behind on the dead phone. Permanently unreadable, with no error
message.

Fixed: backup format v2 carries the salt + verifier (never the PIN), and
restore installs them. v1 files still load. Note this hole would have followed
the app into Phase A: A3 syncs the `journal` store, and synced encrypted notes
would have been just as unreadable on the second device.

Both are covered by `lib/crypto.test.ts` (11 tests), including the accented and
emoji round-trip and a cross-device restore.

---

## 4. Seven changes I would make to the plan

### 4.1 Take accounts off the critical path (biggest single lever)

Founder decision 3 says accounts are wanted. Fine — the question here is only
**when**, and the answer should be *after the first Play release*, not before.

What the accounts pivot buys, item by item:

| Claimed benefit | Actually requires accounts? |
|---|---|
| Automatic backup / new-phone restore | **No** — export/import exists and now works correctly (§3.2). Improve it with a reminder nudge. |
| Real push reminders | **No.** See §4.2. |
| Family sharing with roles | **Yes.** The only one. |
| Aggregate content stats | **No** — `contentStats` is designed with no identity column. |

What it costs: the sync engine (**L**), OAuth provisioning per provider, a
lawyer-reviewed policy rewrite, an explicit consent flow, working account
deletion, and an admin panel (A7) that exists *only because accounts exist*.

And one cost the plan does not mention at all, which matters specifically
because the target is Google Play:

> **Play's Data safety form.** Today this app can honestly declare
> **"No data collected"** — a rare, visible badge on the store listing and a
> real marketing asset for a pregnancy app. The moment sync ships, the listing
> must declare collection of **health data linked to the user's identity**,
> plus a Health apps declaration, plus an in-app *and* publicly-reachable web
> account-deletion path. That is a heavier review, a slower first approval, and
> a worse listing — bought before a single user has asked for multi-device.

Recommendation: keep A1 (schema, done, harmless). Defer A2/A3/A5/A6/A7 to
post-launch. Family sharing (E1) is the feature worth turning them on for, and
it can wait until people are actually using the app.

### 4.2 Build push **without** accounts — it is the biggest retention lever

A Web Push subscription is an anonymous endpoint. It needs no user id, no
email, no OAuth. `push_subscriptions` already exists; drop `userId` to
nullable and it works standalone.

A design worth stealing from the app's own privacy instincts: **push a
contentless tickle, compose the text on the device.** The server sends
`{category: "recordatorio"}` and nothing else; the service worker wakes, reads
IndexedDB, and renders *"Mañana tenés control prenatal a las 9:00"* locally.
The server stores only `{endpoint, fireAt, category}` and never learns what the
notification says or which week the user is in. (Browsers require
`userVisibleOnly: true`, so the SW must show *a* notification — it shows the
one it just composed. This works.)

That gets the single most valuable engagement feature — appointment reminders,
weekly nudges — at maybe 15% of the cost of Phase A, with the Data safety form
declaring one device identifier instead of a health-data pipeline.

### 4.3 Promote D3 ("¿puedo comer…?") to the launch path

It is the best single item in the whole 31. It is the most-asked pregnancy
question anywhere, it works fully offline, it is pure content with no
infrastructure, and it is the item that is *uniquely* Paraguayan and cannot be
copied by a translated global app: tereré, mate, chipa, quesú Paraguay, carne
asada, pescado de río, mandioca, yuyos. It is also the best SEO surface the app
will ever have.

Currently it sits in Phase D, behind accounts, sync, push and eight home-screen
tasks. It should ship in the first release.

### 4.4 Defer the AI baby image (Phase F) past the first release

Founder decision 5 keeps it, and it is a legitimate joy feature. But for the
*first Play submission* it adds: a per-image cash cost, a photo-upload consent
flow, and Google Play's Generative AI policy obligations — in-app reporting
and flagging of generated content, plus in-app disclosure that content is
AI-generated. That is a compliance surface attached to a feature with zero
retention value at 100 users. Ship it in v1.1, once the listing is live and
quiet.

### 4.5 "Build all 31 items" is a schedule decision disguised as a scope decision

Of the 31 benchmarked items, roughly seven change how the app feels in the
first ten seconds (C1, C2, C3, C6, D1, D3, E2). The other 24 are depth you add
*because* people are using it — and which ones you add should be decided by
what the first 100 users ask for, not by what a Swedish app happened to build
for a Swedish market. Preggers is a good benchmark for information
architecture. It is a bad backlog.

### 4.6 Analytics is deferred to post-launch and shouldn't be

G2 sits after launch. But the friends-and-family round is the *only* time
cheap qualitative signal is available, and you cannot answer "did week 2
retention hold?" retroactively. Play Console gives installs and uninstalls for
free once the app is listed; add one cookieless aggregate ping for weekly-active
and tool usage before the test round, not after.

### 4.7 Smaller notes

- **`lib/rateLimit.ts`** trusts the first `x-forwarded-for` hop. Correct behind
  Hostinger's proxy, spoofable if that ever changes. Low stakes, worth a
  comment.
- **`next` is pinned at 15.1.6** with known `npm audit` findings via
  sharp/libvips (already tracked in `DECISIONS.md`). Bump before the Play
  submission — a TWA is judged on the live site it wraps.
- **The name "Mi Bebé" is crowded on Play.** Check the store and the Paraguayan
  trademark register before printing it on a listing; the app deserves a name
  it can rank for. "Mi Bebé Paraguay" or the original "Nido" may search better.
- **`docs/REVIEW-AND-LAUNCH-PLAN.md` §4 is still the best document in the
  repo** and is still unstarted. It is the critical path. See §6.

---

## 5. The second benchmark app

`docs/FEATURE-MAP.md` documents exactly one: **Preggers** (Swedish, 16 screens
reviewed, 31 items). The founder recalls mentioning a second one, but no other
app is named anywhere in the repo — not in the docs, not in the commit history,
not in `DECISIONS.md`.

If it was **Preglife** (the other Swedish one) or **Pregnancy+**, the map is
probably close to complete already — they cover similar ground. If it was
something structurally different, the gap is worth ten minutes:

- **Flo / Ovia** would add cycle-mode depth and symptom-pattern insight, which
  this app's `planeando` mode currently lacks.
- **BabyCenter / "Mi embarazo día a día"** would add community — a forum or
  Q&A, which is the one genuinely large feature category absent from all 31
  items and the strongest retention mechanic in the category.
- **What to Expect** would add the daily-content cadence.

Worth naming it before the next planning pass, but it blocks nothing.

---

## 6. What is actually left before real users — the short version

Ordered by lead time, because the long poles are other people's calendars.

**Start this week (external dependencies, weeks of lead time):**

1. **Gineco-obstetra reviewer.** Paid or revenue-share. Blocks the entire app:
   `NEXT_PUBLIC_MEDICAL_REVIEWER` unset now hard-fails a deployment build, by
   design. This is also the credibility that makes the Play listing believable.
2. **Google Play developer account — $25, one time.** See
   `docs/ANDROID-LAUNCH.md` §1 first: **personal vs organization account
   changes the timeline by 3–6 weeks**, and it is the single decision on this
   list that cannot be undone later.
3. **Lawyer** for `lib/derechos.ts` figures + the privacy policy and terms.
4. **Native Guaraní speaker** for `lib/emergency.ts`.
5. **Directory: 30–50 real, consented listings**, Asunción + Central first.
   Founder legwork, phone by phone. This is the product.

**Code, in this order:**

6. Phase J — TWA packaging, assetlinks, Play compliance surfaces
   (`docs/ANDROID-LAUNCH.md`).
7. G1 content ops (validated JSON + `npm run validate:content`), so content can
   land without touching TypeScript.
8. C1 · C2 · C3 home screen, D3 food lookup, E2/E3 sharing.
9. B5 push, accountless (§4.2).
10. Domain + Hostinger deploy, `NEXT_PUBLIC_APP_URL`, staffed WhatsApp number.

**Then:** friends-and-family round (which doubles as the 12-tester closed test
if the Play account is personal), fix what they hit, submit to production.

**After the listing is live:** accounts, sync, admin, AI, the rest of the 31.
