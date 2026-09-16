# Decisions needed

Wishes that could not be actioned inside the unit that found them, because the
file they need is outside that unit's list. One line each, with the unit that
raised it.

## for the link pass

- **W4 — finish the PIN card extraction.** `lib/pinPolicy.test.ts` (K18) reads
  `app/(app)/ajustes/AjustesClient.tsx` **by path** and asserts the floor comes
  from `MIN_PIN_LENGTH` rather than a copied literal, plus two copy assertions
  ("no se recuperan", "probando todas las combinaciones"). W4 split every other
  settings card into `components/ajustes/**`; the PIN card stayed behind only so
  that guardrail keeps pointing at real code. Repoint the three assertions at
  `components/ajustes/PinSettings.tsx`, then move the card there — it is ~60
  lines and would take the shell from 274 to ~214.
