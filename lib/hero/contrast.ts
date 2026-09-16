// W3 — measured WCAG 2.x contrast, replacing u7's "checked by eye" audit.
export interface RGBA { r: number; g: number; b: number; a: number }

/** Parses `#rgb`, `#rrggbb`, `rgb(...)` and `rgba(...)` into 0–255 channels. */
export function parseColor(color: string): RGBA {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const parts = color.match(/rgba?\(([^)]+)\)/i)?.[1];
  if (!parts) throw new Error(`contrast.ts: unrecognised colour "${color}"`);
  const [r = 0, g = 0, b = 0, a] = parts.split(",").map((v) => parseFloat(v.trim()));
  return { r, g, b, a: a === undefined ? 1 : a };
}

/** Alpha-composites `fg` over an opaque `bg`, per channel, by `fg.a`. */
export function compositeOver(fg: RGBA, bg: RGBA): RGBA {
  const m = (k: "r" | "g" | "b") => fg[k] * fg.a + bg[k] * (1 - fg.a);
  return { r: m("r"), g: m("g"), b: m("b"), a: 1 };
}

const channel = (c: number) =>
  c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4;

/** WCAG relative luminance of an opaque colour, 0–1. */
export function relativeLuminance({ r, g, b }: RGBA): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colour strings, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(parseColor(a));
  const l2 = relativeLuminance(parseColor(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
