// The drawn baby — the stand-in for the week renders until they exist.
//
// `public/assets/semanas/` is still empty, and the week card used to show a
// faded week number and a grey disc where the baby goes, which read as
// unfinished. This is a flat illustration in the app's own palette and line
// (petrol stroke, warm skin, blush cheek), side-curled with legs drawn up —
// the same pose rule as the render brief, so nothing anatomical is shown.
//
// Before week 9 there is an embryo, not a baby, and drawing a baby there
// would be wrong in a way a pregnant woman notices; those weeks get a soft
// glowing seed instead. Size comes from whoever frames it (`heroScale`).
//
// Decorative (`aria-hidden`): the card's caption already says the week and
// the size.

export function BabyIllustration({ week, size }: { week: number; size: number }) {
  if (week < 9) {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="92" fill="#FFFFFF" fillOpacity="0.45" />
        <circle cx="100" cy="100" r="58" fill="#F4D3C2" stroke="#2F5D50" strokeWidth="3" />
        <circle cx="86" cy="86" r="14" fill="#FFFFFF" fillOpacity="0.55" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <path
        d="M62 150 C34 136 36 92 66 80 C92 70 128 76 140 102 C152 132 130 162 100 162 C86 162 72 158 62 150 Z"
        fill="#EFC6B0"
        stroke="#2F5D50"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx="120" cy="136" r="21" fill="#F2CDB9" stroke="#2F5D50" strokeWidth="2.6" />
      <ellipse
        cx="96"
        cy="150"
        rx="15"
        ry="8"
        fill="#F2CDB9"
        stroke="#2F5D50"
        strokeWidth="2.6"
        transform="rotate(-18 96 150)"
      />
      <circle cx="88" cy="70" r="36" fill="#F4D3C2" stroke="#2F5D50" strokeWidth="2.6" />
      <path
        d="M60 58 C66 40 90 32 108 40"
        fill="none"
        stroke="#2F5D50"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path d="M76 72 Q82 77 88 72" fill="none" stroke="#2F5D50" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="74" cy="84" r="6" fill="#F3DAD4" />
      <path d="M58 76 Q52 80 57 86" fill="none" stroke="#2F5D50" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="104" cy="100" rx="10" ry="7" fill="#F4D3C2" stroke="#2F5D50" strokeWidth="2.6" />
    </svg>
  );
}
