"use client";

import { useEffect } from "react";
import { HTML_LANG } from "@/lib/i18n/dict";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * K19-L1 — keeps `<html lang>` in step with the chosen locale.
 *
 * The attribute is server-rendered as `es-PY` in `app/layout.tsx` and patched
 * here once the profile row has been read. That order is deliberate: the
 * locale lives in IndexedDB (no locale routes, no middleware — see
 * `lib/i18n/dict.ts`), so the server cannot know it, and a layout that waited
 * for the answer would mean waiting for the client on every page.
 *
 * It matters beyond validation. `lang` is what makes a screen reader load
 * Guaraní pronunciation instead of reading Guaraní through Spanish phonetics,
 * what tells the browser not to offer to translate a page that is already in
 * the reader's language, and what hyphenation follows.
 *
 * Renders nothing — the DOM write *is* the component.
 */
export function HtmlLang() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  return null;
}
