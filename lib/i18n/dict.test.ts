import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  asLocale,
  DEFAULT_LOCALE,
  DICT,
  HTML_LANG,
  LOCALES,
  LOCALE_NAMES,
  translate,
  type CoreKey,
  type Locale,
} from "./dict";
import { bilingualTextSchema } from "../content/schemas";
import { ALARM_SIGNS, CALL_SCRIPT_STEPS, EMERGENCY_NUMBERS } from "../emergency";
import { BENEFITS } from "../derechos";
import { CHEERS } from "../sharing/cheers";

const KEYS = Object.keys(DICT.es) as CoreKey[];

describe("locale parity", () => {
  it("has the same keys in every locale", () => {
    // The type already forbids a missing key. This catches the other
    // direction — a key left behind in `gn` after `es` dropped it — which the
    // compiler is happy with and which ships as dead weight in every bundle.
    for (const locale of LOCALES) {
      expect(Object.keys(DICT[locale]).sort(), locale).toEqual([...KEYS].sort());
    }
  });

  it("has no blank string in any locale", () => {
    for (const locale of LOCALES) {
      for (const key of KEYS) {
        expect(DICT[locale][key].trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("translates all but the handful of strings that are the same word", () => {
    // A Guaraní column that is a copy of the Spanish one is the failure mode a
    // types-only parity check cannot see: it compiles, it renders, and it is
    // not a translation. The allowlist is the honest exception — these are
    // borrowings and proper nouns that Guaraní speakers say exactly this way,
    // and coining a "real" Guaraní word for WhatsApp would produce a label no
    // user recognises. Anything else identical across columns is a bug.
    const SAME_IN_BOTH: CoreKey[] = [
      "header.emergency", // "SOS"
      "emergency.whatsapp", // "WhatsApp"
      "emergency.title", // "Emergencia" — the borrowed word is the spoken one
      "nav.checklist", // "Checklist"
      "home.week", // "Semana"
    ];
    for (const key of KEYS) {
      if (SAME_IN_BOTH.includes(key)) {
        expect(DICT.gn[key], key).toBe(DICT.es[key]);
      } else {
        expect(DICT.gn[key], key).not.toBe(DICT.es[key]);
      }
    }
  });

  it("ships both locales in one module, with no dynamic import", () => {
    // D6's "all locales ship in one chunk": the toggle has to work offline and
    // mid-flight, so a lazily-fetched locale bundle is a toggle that works in
    // the office and fails in Concepción. A source scan, because the failure is
    // invisible at runtime in dev — where every fetch succeeds.
    const source = readFileSync(new URL("./dict.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\bimport\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/require\s*\(/);
  });
});

describe("translate / asLocale", () => {
  it("returns the string for the asked-for locale", () => {
    expect(translate("es", "nav.today")).toBe("Hoy");
    expect(translate("gn", "nav.today")).toBe(DICT.gn["nav.today"]);
  });

  it("falls back to Spanish for anything that is not a supported locale", () => {
    // Values arriving from a synced profile row written by a future version of
    // the app, or by a hand-edited backup file. A locale the build has never
    // heard of must render Spanish, not `undefined` in the nav bar.
    for (const bad of [undefined, null, "", "pt", "es-PY", "GN", 7, {}]) {
      expect(asLocale(bad), String(bad)).toBe(DEFAULT_LOCALE);
    }
    for (const locale of LOCALES) expect(asLocale(locale)).toBe(locale);
  });

  it("maps every locale to an html lang and a self-name", () => {
    for (const locale of LOCALES) {
      expect(HTML_LANG[locale].length, locale).toBeGreaterThan(0);
      expect(LOCALE_NAMES[locale].length, locale).toBeGreaterThan(0);
    }
    // es-PY, not es: the app formats its dates with es-PY and the region
    // changes the rendering ("setiembre", not "septiembre").
    expect(HTML_LANG.es).toBe("es-PY");
  });
});

describe("L0 safety strings", () => {
  // Every `{ es, gn? }` value on a safety surface, validated by the same schema
  // the content files use — so a blank `gn`, or a `gn` pasted from the `es`,
  // fails here rather than rendering as a "translation" nobody can read.
  const surfaces: Array<[string, { es: string; gn?: string }]> = [
    ...ALARM_SIGNS.map((s): [string, { es: string; gn?: string }] => [
      `alarm:${s.id}`,
      s.text,
    ]),
    ...CALL_SCRIPT_STEPS.map((s, i): [string, { es: string; gn?: string }] => [
      `call-script:${i}`,
      s,
    ]),
    ...EMERGENCY_NUMBERS.map((n): [string, { es: string; gn?: string }] => [
      `number:${n.number}`,
      n.detail,
    ]),
    ...BENEFITS.map((b): [string, { es: string; gn?: string }] => [
      `benefit:${b.id}`,
      b.title,
    ]),
    ...CHEERS.map((c): [string, { es: string; gn?: string }] => [
      `cheer:${c.id}`,
      c.text,
    ]),
  ];

  it("every bilingual string is a valid one", () => {
    for (const [label, text] of surfaces) {
      const result = bilingualTextSchema.safeParse(text);
      expect(result.success, `${label}: ${result.error?.issues[0]?.message}`).toBe(true);
    }
  });

  it("every alarm sign carries Guaraní, with no gaps", () => {
    // The rest of the surfaces may translate incrementally. This list may not:
    // it is the one a woman reads when something is already wrong, and a list
    // where six of nine lines have Guaraní reads as "the other three are less
    // serious". All or none, and it is all.
    for (const sign of ALARM_SIGNS) {
      expect(sign.text.gn?.trim().length, sign.id).toBeGreaterThan(0);
    }
  });

  it("shows Guaraní on safety surfaces without asking the locale", () => {
    // D6: stacked and always. The component that renders these must not read
    // the locale — the woman who needs the Guaraní line at 3 a.m. is exactly
    // the one who never opened Ajustes. A source scan, because "we forgot to
    // gate this" and "we deliberately did not gate this" look identical in a
    // rendered screenshot.
    const source = readFileSync(
      new URL("../../components/Bilingual.tsx", import.meta.url),
      "utf8",
    );
    // Asserted on the imports rather than on the word "locale", which the
    // file's own comment uses to explain why it does not read one.
    expect(source).not.toMatch(/from "@\/lib\/i18n/);
    expect(source).not.toMatch(/\buseLocale\(|\buseT\(/);
    expect(source).toMatch(/lang="gn"/);
  });
});

describe("the locale is a preference, not a health fact", () => {
  it("is not something the sync payload names", () => {
    // The profile row already rides sync as opaque payload (ARCHITECTURE.md
    // §4.3), which is how `locale` reaches a second device for free. What must
    // not happen is the server growing a column, a header or a query parameter
    // for it: a language is a strong signal about who someone is, and this app
    // sends the server nothing about who anyone is.
    const files = [
      "../server/sync.ts",
      "../sync/stores.ts",
      "../server/schema.ts",
    ];
    for (const file of files) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source, file).not.toMatch(/\blocale\b/);
    }
  });

  it("never becomes a locale route or a middleware", () => {
    // K13a made "this app has no middleware" a security invariant, and the
    // service worker precaches one URL per page. Both would break the moment
    // someone reached for the conventional i18n setup.
    const source = readFileSync(new URL("./useLocale.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/next\/navigation|router\.(push|replace)/);
  });
});

describe("dictionary hygiene", () => {
  it("names every key `area.thing`", () => {
    for (const key of KEYS) {
      expect(key, key).toMatch(/^[a-z]+\.[a-zA-Z]+$/);
    }
  });

  it("covers the five nav tabs, which are the strings everyone reads", () => {
    const navKeys = KEYS.filter((k) => k.startsWith("nav."));
    expect(navKeys).toHaveLength(5);
  });

  it("has no interpolation placeholder in any string", () => {
    // `translate` has no interpolation and no plural machinery on purpose: the
    // moment a string bakes in a count, Guaraní pluralisation becomes a
    // linguist's question rather than an ICU one. A stray `{name}` here would
    // render literally to a user.
    for (const locale of LOCALES) {
      for (const key of KEYS) {
        expect(DICT[locale][key], `${locale}:${key}`).not.toMatch(/[{}]|%[sd]/);
      }
    }
  });
});

describe("Locale type", () => {
  it("is exactly the two languages D6 approved — no neutral Spanish, no English", () => {
    const locales: Locale[] = [...LOCALES];
    expect(locales).toEqual(["es", "gn"]);
  });
});
