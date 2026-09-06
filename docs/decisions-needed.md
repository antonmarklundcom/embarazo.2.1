# Decisions needed — founder answers

Runners (`prompts/RUN-OPUS.md`, `prompts/RUN-SONNET.md`) read this file. An
unanswered question means **the default applies**; nothing here blocks a
build. Answer by editing the "Answer:" line, or paste `prompts/DECIDE.md` into
a Sonnet window and answer in chat — it writes the answers here and into
`docs/BUILD-QUEUE-2026-09-06.md` §2.

## A. Affect the Opus window (answer before starting it, or accept defaults)

**A1. Hero preferences (theme, fruit toggle) — where do they live?**
Default: on the synced Dexie `profile` row, like the language toggle (follows
the user to a second device, no server column). Alternative: device-only
localStorage.
Answer:

**A2. The six background themes.** Default: halo (golden, default), ñandutí
lace, cielo (sun/moon), estevia wreath, alas (abstract wings), estrellas
(night sky). Drop or swap any?
Answer:

## B. Affect the Sonnet window

**B1. App name and title.** Default: product name stays **Mi Bebé**, manifest
and OG title **"Mi Bebé · Embarazo Paraguay"**, short name "Mi Bebé". Alternative:
rename the product to Embarazo Paraguay (U8 makes it a one-line flip either
way, but the manifest/OG strings ship with whatever is here). Check DINAPI
(Paraguayan trademark register) for "Mi Bebé" before launch either way.
Answer:

**B2. Recomendados seeding.** Default: curated free public resources only
(carné perinatal, PAI, IPS, Ley 7383/2024, lactancia groups); product cards
added later when a product exists. Alternative: also seed placeholder product
cards now (they stay hidden by the gate until real).
Answer:

**B3. Build U8 (brand constant)?** Default: yes.
Answer:

**B4. Build U9 (AI-drafted answers in the admin Q&A queue)?** Default: yes.
It needs `AI_DRAFT_ENABLED=true` + the Gemini key in the deployment to do
anything; disabled it is invisible.
Answer:

**B5. Per-unit log files instead of per-PR `DECISIONS.md` appends for this
batch, consolidated by the link pass.** Default: yes (avoids eight PRs
conflicting on one file).
Answer:

## C. Not build decisions, but the code is waiting on them

**C1. Where does the app live?** `NEXT_PUBLIC_APP_URL` — e.g.
`https://app.embarazo.com.py` (marketing site stays at the root domain, per
`docs/SITE-PLAN-EMBARAZO-COM-PY.md`) or `https://mibebe.com.py` if you buy it.
Needed for the first deploy, the install card, the invite link and OG.
Answer:

**C2. Monitored support address.** `NEXT_PUBLIC_SUPPORT_EMAIL` or a really
answered `NEXT_PUBLIC_BUSINESS_WHATSAPP`. A deployment build refuses without
one (the `/borrar-cuenta` page must point at somebody).
Answer:

**C3. AI baby image on at launch?** `AI_BABY_ENABLED=true`, quota 3/user/month,
ceiling $50/month. Default: yes — it is the app's one "wow" moment and U2 lets
you pause it in one click.
Answer:

**C4. Who answers the Q&A queue, and within how many days?** `/admin/preguntas`
flags 3+ days. U9 drafts; a person still publishes. Default: you or your
partner, 3 days.
Answer:

**C5. Who is the legal/business owner for sponsor invoicing (RUC)?** If your
partner is the face and owner on paper, the RUC and the sponsor contract
template are hers; the app does not care, the deck does.
Answer:

**C6. Plan the postpartum mode ("Ya nació", H1) as the next queue?** Your
partner is due around November 2026. If she is the face of the app, the app
should know what to do the day the baby arrives. Default: yes — a Fable
planning session for H1 in October, after this queue merges.
Answer:

## For the link pass (units append one line each; U11 reads them)

