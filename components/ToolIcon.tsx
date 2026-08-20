// BUILD-PLAN D1 — the tool illustrations (feature map #20).
//
// One line-art set, one stroke weight, one colour. They are drawn rather than
// imported for two reasons: an icon font or an SVG sprite is another network
// request on a screen that must work offline from first install, and a borrowed
// icon set brings a visual language that is not this app's.
//
// The five that existed inline in `app/(app)/page.tsx` moved here unchanged, so
// the home grid and the herramientas grid cannot drift apart.

export type ToolIconName =
  | "feet"
  | "timer"
  | "scale"
  | "camera"
  | "food"
  | "emergency"
  | "summary"
  | "carne"
  | "rights"
  | "symptoms"
  | "guides"
  | "video"
  | "checklist"
  // D2
  | "names"
  | "kegel"
  | "sleep"
  | "diary"
  | "dental"
  // K7 (§7) — two shipped screens that were reachable from nowhere.
  | "ai"
  | "faq";

export function ToolIcon({
  name,
  size = 24,
}: {
  name: ToolIconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#322E29",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "feet":
      return (
        <svg {...common}>
          <path d="M10 17c-2 1.5-4.5 1.2-5.5-.5C3.4 14.7 4.5 12 7 10.5S12.6 9 13.5 10.8C14.5 12.5 12 15.5 10 17Z" />
          <circle cx="16.5" cy="6.5" r="2" />
          <circle cx="20" cy="11" r="1.2" />
        </svg>
      );
    case "timer":
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2.5" />
          <path d="M10 2h4" />
        </svg>
      );
    case "scale":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M8.5 8.5c1-1.3 2.1-2 3.5-2s2.5.7 3.5 2l-2.3 2.3a1.7 1.7 0 0 1-2.4 0Z" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M4 8h16M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M9 4h6l1 4H8Z" />
          <circle cx="12" cy="14" r="2.4" />
        </svg>
      );
    case "food":
      return (
        <svg {...common}>
          <path d="M6 3v7a2.5 2.5 0 0 0 5 0V3M8.5 3v7" />
          <path d="M16 3c-1.5 1.5-2 3-2 5s1 3 2 3v10" />
        </svg>
      );
    case "emergency":
      return (
        <svg {...common}>
          <path d="M12 3 4 6.5v5c0 4.4 3.2 8.2 8 9.5 4.8-1.3 8-5.1 8-9.5v-5L12 3Z" />
          <path d="M12 8.5v4M12 15.5h.01" />
        </svg>
      );
    case "summary":
      return (
        <svg {...common}>
          <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
          <path d="M14 3v4h4M8.5 12h7M8.5 16h4.5" />
        </svg>
      );
    case "carne":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <circle cx="8.5" cy="11" r="2" />
          <path d="M13.5 10h4M13.5 13.5h4M5.5 16c.8-1.4 1.9-2 3-2s2.2.6 3 2" />
        </svg>
      );
    case "rights":
      return (
        <svg {...common}>
          <path d="M12 4v16M6 8h12M6 8l-2.5 5a2.8 2.8 0 0 0 5 0L6 8Zm12 0-2.5 5a2.8 2.8 0 0 0 5 0L18 8Z" />
          <path d="M8 20h8" />
        </svg>
      );
    case "symptoms":
      return (
        <svg {...common}>
          <path d="M3 12.5h3.5L8 9l2.5 7L13 11l1.5 1.5H21" />
          <path d="M20.5 8.5A4 4 0 0 0 12 6.8 4 4 0 0 0 3.5 8.5" />
        </svg>
      );
    case "guides":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" />
          <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5V5.5Z" />
        </svg>
      );
    case "video":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M10.5 9.5 15 12l-4.5 2.5v-5Z" />
        </svg>
      );
    case "names":
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.2-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.8-7 9-7 9Z" />
        </svg>
      );
    case "kegel":
      return (
        <svg {...common}>
          <path d="M12 4c4 0 7 2.7 7 6.5S16 20 12 20s-7-5.7-7-9.5S8 4 12 4Z" />
          <path d="M9 11.5c1-1 2-1.5 3-1.5s2 .5 3 1.5" />
        </svg>
      );
    case "sleep":
      return (
        <svg {...common}>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
          <path d="M15 4h4l-4 4h4" />
        </svg>
      );
    case "diary":
      return (
        <svg {...common}>
          <path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M8 3v18M11.5 8h4M11.5 12h4" />
        </svg>
      );
    case "ai":
      // A sparkle over a small portrait: generated, and a face. Deliberately
      // not a robot — the screen is "así podría ser tu bebé", labelled
      // entertainment, and a machine glyph would read as a prediction.
      return (
        <svg {...common}>
          <circle cx="11" cy="9.5" r="3.5" />
          <path d="M5 19.5c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5" />
          <path d="M18.5 3.5 19.3 5.7 21.5 6.5 19.3 7.3 18.5 9.5 17.7 7.3 15.5 6.5 17.7 5.7Z" />
        </svg>
      );
    case "faq":
      return (
        <svg {...common}>
          <path d="M20 15a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
          <path d="M9.5 9a2.5 2.5 0 0 1 4.6 1.3c0 1.7-2.1 1.9-2.1 3.2" />
          <path d="M12 15.6h.01" />
        </svg>
      );
    case "dental":
      return (
        <svg {...common}>
          <path d="M12 4c2 0 2.5-1 4.5-1S20 4.5 20 7.5c0 3-1.2 4.5-1.8 7.5-.5 2.5-.7 5-2.2 5s-1.5-4-4-4-2.5 4-4 4-1.7-2.5-2.2-5C5.2 12 4 10.5 4 7.5 4 4.5 5.5 3 7.5 3S10 4 12 4Z" />
        </svg>
      );
    case "checklist":
      return (
        <svg {...common}>
          <path d="M9 5h9M9 12h9M9 19h9" />
          <path d="M4 5.5 5 6.5 7 4.5M4 12.5l1 1 2-2M4 19.5l1 1 2-2" />
        </svg>
      );
  }
}
