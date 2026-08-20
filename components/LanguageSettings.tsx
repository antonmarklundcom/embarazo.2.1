"use client";

import { useState } from "react";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/dict";
import { setLocale, useLocale, useT } from "@/lib/i18n/useLocale";

/**
 * K19-L1 — the language toggle.
 *
 * Two things about it are deliberate and easy to "fix" wrongly later:
 *
 * **The hint is honest about the boundary.** The toggle moves navigation,
 * actions and the safety framing — roughly a hundred strings. It does *not*
 * move the 42 weeks of content, the guías or the derechos bodies, and D6 says
 * it will not until Guaraní content is institutionally funded and reviewed.
 * A user who switches to Guaraní and then finds every article in Spanish
 * should have been told so on this screen, not discovered it on the third tap.
 *
 * **Each option is written in its own language.** "Guaraní" and "Castellano"
 * are what each is called by the people who read it; a picker that translates
 * its own option labels into the currently-active language is the one thing a
 * language picker must never do, because the person looking for the switch is
 * by definition the person who cannot read the current one.
 */
export function LanguageSettings() {
  const t = useT();
  const active = useLocale();
  const [msg, setMsg] = useState("");

  async function choose(next: Locale) {
    if (next === active) return;
    await setLocale(next);
    // The confirmation is written in the language just chosen — reading it is
    // the proof that the toggle did something.
    setMsg(next === "gn" ? "Oñeñongatu. Guaraníme." : "Guardado. En castellano.");
    setTimeout(() => setMsg(""), 3500);
  }

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">
        {t("settings.language")}
        <span lang="gn" className="ml-1.5 text-sm font-bold italic text-muted">
          Ñe&apos;ẽ
        </span>
      </h2>
      <p className="mt-1 text-sm text-muted">{t("settings.languageHint")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            lang={locale}
            onClick={() => void choose(locale)}
            aria-pressed={active === locale}
            className={`min-h-[44px] rounded-tile border px-3 py-2.5 text-sm font-medium transition ${
              active === locale
                ? "border-petrol bg-petrol text-white"
                : "border-black/10 bg-cream text-ink"
            }`}
          >
            {LOCALE_NAMES[locale]}
          </button>
        ))}
      </div>
      {msg && <p className="mt-2 text-sm text-sage">{msg}</p>}
    </section>
  );
}
