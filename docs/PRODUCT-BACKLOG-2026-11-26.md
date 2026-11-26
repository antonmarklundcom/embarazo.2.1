# Product backlog and decisions after the Baby Journey batch

Written 26 November 2026 by the manager session, so the ideas, decisions and open work from that day's session survive it. The research behind it is [BABYJOURNEY-BENCHMARK-2026-11-25.md](BABYJOURNEY-BENCHMARK-2026-11-25.md); this file is what was decided and done with that research, and what is left. Current state and owner questions live in [`STATUS.md`](../STATUS.md); when the two disagree, `STATUS.md` wins.

Labels: **[done]** merged and live, **[hidden]** build now but keep hidden until a reviewer signs, **[later]**, **[skip]**. Review counts are keyword matches over 628 App Store reviews, so read them as approximate.

## 1. What shipped on 26 November 2026

| PR | What | Notes |
|---|---|---|
| 167 | Dead ends removed | Empty tool tiles hidden until content is published; no "Pronto" tile; onboarding count; "Ahora no" visible; baby mode no longer shows a pregnancy week |
| 168 | Country rule | [CONTENT-COUNTRY-RULE.md](CONTENT-COUNTRY-RULE.md), `lib/country`, a `validate:content` check |
| 170 | Family line, partner wording | 42 lines for la abuela, la tía, la madrina; "tu pareja o quien te acompaña" |
| 171 | Shorter Hoy | Hero, "Hoy", rows that open on tap; 2,151 px at 360x740, was 4,601 |
| 172 | Para conversar, checklist by trimester | 36 question cards; "Por trimestre" from existing week tips |
| 173 | Play listing | Text checked against the app, eight screenshots; nothing submitted |
| 174 | Pregunta del día, mood follow-up | Flag `pregunta_del_dia`, default off; 45 questions; results after 30 answers per trimester |
| 169, 175 | `STATUS.md` | |

All: DB none. Code by Claude Opus 5.5 workers at medium effort (PR 167's first commit by Sonnet 5.5); the manager session planned, reviewed and reran every gate before each merge.

## 2. Decisions

**Anton's, in his words or by his go-ahead**
- Opus 5.5 at medium effort does most of the coding when the manager delegates (26 Nov). `C:\Claude 1\site-factory\models.yaml` still names Sonnet 5.5 for the build step; whether to change the file is an open question.
- "Code what you suggest we should code now": the build-now group in section 5 was built.
- "Just list the ideas, don't write full content yet": no weekly content, guides or baby-year content has been drafted.

**Defaults the manager chose; Anton can overrule any of them**
- Hoy uses variant B (the per-person card moved into the "Tu semana" row, so "Hoy" starts 891 px down instead of 1,588). Variant A was not merged.
- Non-medical text may go live without the clinical reviewer; nothing about health does. Every new content file has a unit test that fails on health, legal or money terms.
- The daily question ships behind a flag that is off, shows results only after 30 answers for her trimester, and is shown to the mother only. With it on, "Hoy" holds four cards instead of three.
- The checklist by trimester quotes existing week tips only; no new to-dos were written.
- No new profile field. "Quien te acompaña" only for single mothers needs an onboarding question and a stored field; not built without Anton's yes.
- The "Así podría ser" tile is decided at build time from `AI_BABY_ENABLED`; switching the feature on needs a redeploy.
- A row on Hoy opened from a push link scrolls into view once; open rows are remembered in memory only.

## 3. What Baby Journey has that Mi Bebé lacks, and where each stands

**Content**
1. Long weekly pages (about 720 words at week 20; about 43 unique words here). **[hidden]**, not started.
2. Three voices every week (baby, mother, partner). **[hidden]**, not started. The family voice got 42 weekly lines **[done]**.
3. A knowledge bank in 11 categories (8 short guides here). **[hidden]**, not started. Anton has three draft guides (breastfeeding, baby sleep, postpartum) in `C:\dev\guias`.
4. Dietary advice that is live (62 foods written, hidden). Waits for the reviewer; no code needed.
5. Visible experts with names. Waits for the reviewer; the byline system exists.
6. Content for parents who have done this before, and for loss. Audit found no copy that assumes a first pregnancy **[done]**; loss content **[hidden]**, not started.
7. Recipes, birth-preparation courses. **[later]**

**Daily reasons to open**
8. A daily poll with others' answers. **[done]**, switched off (PR 174).
9. A mood tap that gives something back. **[done]** in a small form (one link).
10. A personalised feed. **[skip]**: conflicts with the privacy promise.

**Planning and memory tools**
11. A birth letter. Planned as "Mi plan de parto" with prompts per care setting. **[hidden]**, not started.
12. A birth story page. **[later]**
13. Question cards for couples. **[done]** as "Para conversar".
14. Checklists per trimester and for the baby. Trimester view **[done]**; a baby checklist is not started.

**After the birth**
15. Weekly, then monthly content to age 5. First year **[hidden]**, not started.
16. Vaccine and check-up schedule. **[hidden]**, not started; copy the official PAI 2026 table with its source link.
17. Weight and length curves. **[later]**: no official growth standard found yet.
18. Baby milestones. **[hidden]**, not started.
19. White noise. **[skip]**

**Formats and reach**
20. Video and podcast. **[skip]**: mobile data.
21. Store listings. Listing ready **[done]**; publishing waits for the Play organisation account.
22. A public face with an audience, web calculators as a funnel. People, not code; the clinical reviewer may be that person.
23. A doula chat. **[skip]**

**Where Mi Bebé is ahead:** kick counter, contraction timer with WhatsApp sharing, partner sharing with server enforcement, low data use, privacy, Paraguay's rights and paperwork.

## 4. What their reviews say, and what we do with it

**Praised, so invest**
1. "Information I can rely on" (about 243 of 567). Trust beats features: the reviewer is the biggest lever.
2. Following the baby week by week with a size comparison (about 195).
3. Clear and easy to use (about 117). Shorter Hoy **[done]**.
4. Still useful after the birth (about 117). Baby year not started.
5. A cosy, tidy look (about 73).
6. Partner and family involvement (about 44). Family line and Para conversar **[done]**.
7. Feeling reassured (about 25): tone matters as much as facts.

**Rarely mentioned, so do not over-invest**
8. Community or forum: 2 of 567. **[skip]**
9. Contraction timer, birth letter, name generator: 8 of 567 together.
10. Growth curves, belly photos, vaccine schedule, doula chat: almost never named. The vaccine schedule is still worth building here because it is a real need.

**Complained about, so avoid or do better**
11. Ads, insurance nagging, push spam, sponsored text mixed with advice (about half of low reviews). Keep any future money-making in one opt-in place.
12. Gamified levels, rating prompts, pop-ups. **[skip]**; a quiet streak is enough.
13. Partner prompts shown to single mothers. Neutral wording **[done]**; a real switch needs a profile field (open question).
14. Bugs, resets, lost data. Sync and backup must be proven on real phones (owner test).
15. Identity number required; e-mails after deletion. Ask for little; deletion is complete, including the new device-only keys **[done]**.
16. Content aimed at first-time parents only. Audit **[done]**; new content must keep this.
17. Support that does not answer. A WhatsApp reply within a day would stand out.
18. Leftover Swedish abroad. Country rule **[done]**.
19. A slow Android app. Speed on cheap Android is an opening; measure on a real phone.
20. An account before anything is shown. Same weakness here; "ver mi semana" before sign-in waits for Anton's yes.

**Ideas neither app has yet**
21. A weekly WhatsApp message. **[later]**: cost check first; Responde may carry a pilot.
22. Short audio in Guaraní for alarm signs and the weekly line. **[later]**: needs a native speaker.
23. A weekly line for the wider family. **[done]**
24. "Mi plan de parto" with prompts for public hospital, IPS and private clinic. **[hidden]**, not started.

## 5. The sorting, in one place

- **Built on 26 November:** shorter Hoy; daily poll and mood follow-up; question cards; checklist by trimester; neutral partner wording; first-pregnancy audit; family line; Play listing assets.
- **Build next, hidden until the reviewer signs (needs Anton's go-ahead to start drafting):** weekly content in three voices, in batches by trimester, starting with weeks 4 to 13 so tone can be judged; more guides, towards about 40, including loss and pause; the baby's first year month by month; the PAI vaccine calendar; "Mi plan de parto". Draft from official sources (MSPBS, WHO, the PAI schedule), cite the source on every claim, store under the country rule.
- **Later:** growth curves; birth story; Guaraní audio; weekly WhatsApp message; recipes and courses; a baby checklist; night reading mode.
- **Skip:** video and podcast; community forum; doula chat; personalised feed; white noise; levels, missions, offers, insurance, shop.

## 6. Adapting for Paraguay

1. Follow the Ministry's own schedule; the benchmark's reading of the prenatal booklet ("at least 4 consultations") must be confirmed by the reviewer before it shows.
2. Three care paths: public hospital, IPS, private clinic. Birth plan, checklists and prices need a version for each.
3. WhatsApp is the channel for sharing and reminders.
4. Android first, low data: no video, small images, reading without internet.
5. Guaraní is mostly spoken: audio before more written text.
6. The family is wider than a couple.
7. Local detail: size comparisons, local foods, dengue season, help lines (147 and 137 to confirm).
8. Paperwork and rights are the lead over any foreign app.
9. No card-payment features.

## 7. What is left before a launch

**A. Soft launch on the web (days).** Owner: real-phone offline test and push test; a monitored support and deletion e-mail; check sign-up and reset mail reaches the inbox; confirm database backups; read `/admin/metricas` for a baseline.

**B. Google Play (weeks).** Owner: D-U-N-S and the organisation account; signing key and fingerprints; IARC rating; health apps declaration; lawyer review of privacy and terms; feature graphic and icon; app name. Listing text and screenshots are ready (`docs/PLAY-STORE-SUBMISSION.md`).

**C. Worth promoting.** The clinical reviewer (unlocks the food list, 42 weekly notes, symptom insights and prices already built); the decision on showing her week before sign-in; a native Guaraní reviewer.

**D. Code that needs nobody.** A `ready` command (secrets, database, legal pages) and `secrets:check`, as the apps lane expects; baby-mode wording that still talks about the pregnancy ("Diario de tu panza" on Hoy); a retry for the daily question's count when she answers offline.

## 8. How the work was run, for the next manager session

- One worker per PR, briefed with the goal, the files to read, hard limits and the exact gates; the manager read every content file in full and looked at the screenshots before merging.
- Two workers at once at most: one in `C:\dev\embarazo.2.1`, one in a git worktree beside it (`C:\dev\embarazo.2.1-wt\<name>`) whose `node_modules` is a directory junction to the main checkout. Remove the junction with `cmd /c rmdir` before removing the worktree, or the real folder is at risk.
- Port 3000 on the laptop belongs to another app, and `playwright.config.ts` reuses whatever answers there. Use the config copies in `C:\dev\.cache\embarazo.2.1\e2e\` (port 3210 for the main checkout, 3211 for a worktree).
- `lib/server/passwordReset.test.ts` can time out at 5 s when the laptop is busy; it passes with `--testTimeout=30000`.
- A change to Hoy gets the whole e2e suite (about 310 tests, about 10 minutes); other changes get the specs near them.
- Content pattern to copy: `lib/seed/py/familyLines.{json,ts,test.ts}` (schema, loader, `validate:content` block, banned-term guard).
