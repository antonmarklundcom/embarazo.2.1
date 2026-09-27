# QR cards for clinics — the URL to print

Growth plan item 18. One card design per clinic, hospital or pharmacy, each with
its own `src`, so `/admin/metricas` → **Códigos QR de clínicas** shows which
cards bring people in.

## The URL

```
https://app.embarazo.com.py/?src=<slug>
```

- `<slug>`: lowercase letters, digits and hyphens, 1–40 characters
  (`[a-z0-9-]{1,40}`). Examples: `hospital-materno-lambare`,
  `farmacia-centro-cde-2026`.
- Uppercase is lower-cased on arrival (`Clinica-Sur` counts as `clinica-sur`).
  Anything else (spaces, accents, `ñ`, more than 40 characters) is **dropped**,
  and the visit counts as "directo". Check the slug before printing.
- Put a print run or date in the slug when you want to compare two batches of
  the same clinic (`clinica-sur-2026-10`).
- Keep a list of the slugs you printed and where each card went. The app only
  ever sees the slug.

The link opens the app's home screen, which starts onboarding. Nothing else in
the URL is needed, and no other parameter is read from a QR card.

## What is counted, and what is not

- Once per phone: the first time a phone opens the app, if that first visit
  came from a QR card, one `+1` is sent for that slug on that day. A second
  scan on the same phone is not counted again.
- The phone's "channel" becomes `qr`, so the **Terminó el onboarding, por
  canal** table shows how many QR arrivals finished onboarding.
- No name, account, phone number, IP or location is sent or stored with the
  count: the stored row is `(qr, <slug>, <day>, <count>)`
  (`lib/stats/funnel.ts`, `lib/server/schema.ts` `funnelStats`).

## Checking a card before a print run

1. Open the URL on a phone that has never opened the app (or in a private
   window), and finish onboarding.
2. The next day, `/admin/metricas` shows the slug with 1 under **Códigos QR**.
