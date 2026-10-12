# AI possibilities for Mi Bebé — proposal only,12 October 2026

No Claude integration, model calls or new AI feature was implemented or enabled in this work.

## Recommended first experiment

A source-linked guide finder: she asks a practical question and gets the relevant already-approved guide plus a short explanation of why it fits. Keep it small and useful: preparing for a prenatal control, choosing questions to ask her obstetrician, finding the hospital-bag checklist, locating official IPS/USF process information. Use low effort for classification/routing; medium only for a bounded summary of supplied sources. Do not let a chat model diagnose symptoms, declare a medicine/food safe, or decide whether urgent care is needed. Emergency links should be deterministic and always reachable.

Next experiment: turn notes she deliberately selects into a checklist of questions for her next control. Display the selected text before sending, ask consent, send minimal data, and let her edit the resulting list. Do not automatically send her diary, clinical card, due date, photographs, location or family data. A saved medical record is not consent for an external AI service.

For administration: draft source summaries/translation candidates for review, with the source URL and retrieval date attached. Native Guaraní review and clinician approval remain human tasks. Avoid autopublishing search articles or medical advice.

## Model and estimated cost

Official Claude documentation lists claude-haiku-5-5 (released7 October 2026), adaptive thinking with default medium effort. For prompts up to 100,000 tokens, published standard input/output prices are $0.10/$0.50 per million tokens. Example: 2,000 input plus 500 total billed output tokens is about $0.00045 per request, or $4.50 for 10,000 requests, before infrastructure, tools, extra thinking/output, retries and pricing changes. Measure real token counts/latency instead of assuming a chat length or effort setting guarantees a fixed cost.

Reference: https://platform.claude.com/docs/en/models/haiku-5-5/overview

## Before any implementation

- Server-only key, signed-in endpoint, request/response limits, per-user allowance and hard monthly budget switch. Do not expose an API key in browser JS.
- Explicit privacy choice and a clear statement of what will go to Anthropic. Confirm current retention/training/provider terms for the chosen account before writing the privacy claim.
- Use a reviewed source whitelist with dated approved text; refuse unsupported answers. Always link the actual source/guide.
- Separate model output from clinical facts and from paid placements. Explain uncertainty in ordinary Spanish. Keep advice actionable without claiming medical evaluation.
- Evaluate Spanish/voseo, hallucinated citations, wrong gestation, urgent symptoms, personal-data leakage, prompt injection and misleading reassurance on representative cases. Have a Paraguay-based clinician review the health-related behavior.
- Run an opt-in pilot after core login/offline/sync works, then compare usefulness and retention against the existing guide search. A low API bill does not justify an unhelpful or unsafe feature.
