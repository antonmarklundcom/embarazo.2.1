# "Ya nació" — baby mode, 0–12 months (growth plan item 9)

Today the app ends at the birth: after week 42 there is nothing to open. This page is the plan
for the months after, split into PRs that each ship something whole. The site hub (`/bebe/`) comes
last, after the app part is live.

## What the user sees

1. **The switch (PR G1).** From week 37, Hoy shows a quiet card: "¿Ya nació tu bebé?" with
   "Sí, ya nació" and a date (defaults to today, can be set back, never in the future or before
   week 22). Nothing else changes until she taps it. It can be undone from Ajustes for 30 days,
   in case of a mistaken tap.
2. **Hoy for a baby (PR G2).** Once a birth date exists, Hoy leads with "Tu bebé tiene N semanas"
   (then months from week 8), instead of the pregnancy week, and four cards:
   - **Vacunas:** "Llevá la libreta de vacunación a cada control". The PAI calendar with its
     ages appears only when a sourced calendar is in the repo (see "Inputs" below). Until then
     the card says where the calendar comes from and never lists vaccines or ages.
   - **Trámites:** the existing `despues-del-nacimiento` content (certificado de nacido vivo,
     Registro Civil, cédula, IPS), reused, not rewritten.
   - **Alimentación y sueño:** class (B) basics, conservative (exclusive breastfeeding in the
     first months as WHO recommends, safe sleep on the back), no doses, logged for medical review.
   - **Señales de alarma del recién nacido:** fever, difficulty breathing, not feeding, unusual
     drowsiness, yellow skin in the first days. Each links to `/emergencia`.
   The pregnancy tools stay reachable; nothing she recorded is deleted or hidden.
3. **Push (PR G3).** With a birth date, the weekly "semana nueva" notice becomes a baby-age
   notice ("Tu bebé cumple 3 meses"), monthly after the first 8 weeks. Same category
   (`consejos`), same opt-in; no new permission.
4. **Site (PR G4, later).** One hub `/bebe/` on embarazo.com.py, only after G2 ships.

## Data

- `Pregnancy.birthDate?: number` (epoch ms, local midnight) and `birthRecordedAt?: number`
  (when she tapped "Sí", for the 30-day undo). Dexie **v8** indexes `pregnancy.birthDate`:
  additive, one index on an existing store, no upgrade step, no rename (AGENTS.md).
  `lib/db.test.ts` opens a v7 database with the v8 code and compares every row of every store.
  Synced and backed up like the rest of the pregnancy record (opaque payload).
- Baby age is derived, never stored: `lib/baby/age.ts` (pure, unit-tested) turns a birth date
  and "today" into weeks/months, in the device's calendar (the R0-1 lesson on UTC dates).
- The companion snapshot is unchanged in G1: it publishes the week and due date only, and
  adding the birth to it needs a server field. Decided later, with G2 on screen.

## Inputs needed from Anton (go to docs/human-todo.md)

- **PAI calendar for 0–12 months, with its official source** (MSPBS). Until then the vaccine
  card shows no schedule.
- **Medical review** of the feeding, sleep and newborn alarm-sign copy before it ships widely
  (same deferred-review posture as the rest of the clinical text).

## Tests per PR

- G1: unit for the date rules; e2e for the card appearing only from week 37, recording the
  date, and undo.
- G2: unit for age maths (month boundaries, leap years); e2e for Hoy switching to baby mode and
  the alarm links reaching `/emergencia`.
- G3: unit for the notice schedule after a birth date.
