import { heroTheme, type ThemeId } from "@/lib/hero/themes";

// U7 — the background, drawn with no downloads.
//
// Every motif is inline SVG over a CSS gradient. That is what lets a woman
// change her baby's background on a phone with no signal, and what keeps six
// themes from becoming six more things to precache (see `lib/hero/themes.ts`).
//
// The motifs are symbolic and abstract by rule, not by taste: HANDOFF §2 asks
// for "universal blessing/warmth to any user regardless of belief", so `alas`
// is the shape of shelter rather than an angel, and `cielo` is a sun and a
// moon rather than anybody's iconography.
//
// `aria-hidden` throughout: this is decoration behind a subject that already
// carries the alt text. A screen reader announcing "lace medallion" before
// "tu bebé a las 24 semanas" would put the wallpaper ahead of the baby.

export function ThemeBackdrop({
  theme,
  className = "",
}: {
  theme: ThemeId;
  className?: string;
}) {
  const t = heroTheme(theme);
  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{ background: t.background }}
      aria-hidden
    >
      {t.motif && <Motif id={t.motif} />}
    </div>
  );
}

function Motif({ id }: { id: NonNullable<ReturnType<typeof heroTheme>["motif"]> }) {
  switch (id) {
    case "nanduti":
      return <Nanduti />;
    case "cielo":
      return <Cielo />;
    case "estevia":
      return <Estevia />;
    case "alas":
      return <Alas />;
    case "estrellas":
      return <Estrellas />;
  }
}

const FILL = "absolute inset-0 h-full w-full";

/**
 * Ñandutí — Paraguay's radial lace, as spokes and concentric rings.
 *
 * The single most Paraguayan thing this app can put behind a baby, and the
 * reason it is drawn rather than photographed: real lace is a texture that
 * needs a raster, while the *structure* of ñandutí is radial symmetry, which
 * is a loop.
 */
function Nanduti() {
  const spokes = Array.from({ length: 16 }, (_, i) => (i * 180) / 16);
  return (
    <svg className={FILL} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <g stroke="#FFFFFF" strokeOpacity="0.55" fill="none" strokeWidth="0.7">
        {[26, 40, 54, 68, 82].map((r) => (
          <circle key={r} cx="100" cy="82" r={r} />
        ))}
        {spokes.map((angle) => (
          <line
            key={angle}
            x1="100"
            y1="82"
            x2="100"
            y2="0"
            transform={`rotate(${angle} 100 82)`}
          />
        ))}
        {[33, 47, 61, 75].map((r) =>
          spokes.map((angle) => (
            <circle
              key={`${r}-${angle}`}
              cx="100"
              cy={82 - r}
              r="2.2"
              transform={`rotate(${angle} 100 82)`}
            />
          )),
        )}
      </g>
    </svg>
  );
}

/** Sun and moon — day and night in one frame, holding the same sky. */
function Cielo() {
  return (
    <svg className={FILL} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <circle cx="52" cy="46" r="20" fill="#F6D9A8" fillOpacity="0.85" />
      <g stroke="#F6D9A8" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round">
        {Array.from({ length: 12 }, (_, i) => (i * 360) / 12).map((angle) => (
          <line
            key={angle}
            x1="52"
            y1="20"
            x2="52"
            y2="13"
            transform={`rotate(${angle} 52 46)`}
          />
        ))}
      </g>
      {/* A crescent as one circle masked by another — no path data to get wrong. */}
      <mask id="hero-luna">
        <rect width="200" height="200" fill="black" />
        <circle cx="150" cy="40" r="17" fill="white" />
        <circle cx="158" cy="33" r="15" fill="black" />
      </mask>
      <rect width="200" height="200" fill="#FFFFFF" fillOpacity="0.8" mask="url(#hero-luna)" />
    </svg>
  );
}

/** Ka'a he'ẽ — a wreath of stevia leaves, open at the top. */
function Estevia() {
  const leaves = Array.from({ length: 18 }, (_, i) => 20 + (i * 320) / 18);
  return (
    <svg className={FILL} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <g fill="#8FA982" fillOpacity="0.45">
        {leaves.map((angle) => (
          <ellipse
            key={angle}
            cx="100"
            cy="14"
            rx="4.5"
            ry="10"
            transform={`rotate(${angle} 100 88)`}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * Wings — two arcs, and nothing that could be somebody's deity.
 *
 * §2's rule is that the symbol stays universal, so what is drawn is the shape
 * of shelter: feathers as nested strokes, no figure between them.
 */
function Alas() {
  const feathers = [0, 1, 2, 3, 4];
  return (
    <svg className={FILL} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <g stroke="#FFFFFF" strokeOpacity="0.65" fill="none" strokeWidth="2" strokeLinecap="round">
        {feathers.map((i) => (
          <path
            key={`l${i}`}
            d={`M96 ${58 + i * 12} C ${70 - i * 9} ${52 + i * 10}, ${44 - i * 8} ${76 + i * 10}, ${30 - i * 5} ${104 + i * 9}`}
          />
        ))}
        {feathers.map((i) => (
          <path
            key={`r${i}`}
            d={`M104 ${58 + i * 12} C ${130 + i * 9} ${52 + i * 10}, ${156 + i * 8} ${76 + i * 10}, ${170 + i * 5} ${104 + i * 9}`}
          />
        ))}
      </g>
    </svg>
  );
}

/** A night sky. Fixed positions — a random field would flicker on every render. */
const STARS: [number, number, number][] = [
  [18, 24, 1.5], [42, 14, 1], [67, 33, 1.8], [88, 18, 1.1], [112, 29, 1.4],
  [136, 12, 1], [158, 26, 1.7], [180, 20, 1.2], [28, 58, 1.1], [74, 62, 1.4],
  [122, 55, 1], [166, 64, 1.5], [10, 92, 1.2], [52, 100, 1], [148, 96, 1.3],
  [192, 84, 1.1], [96, 8, 1.3], [8, 44, 1],
];

function Estrellas() {
  return (
    <svg className={FILL} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <g fill="#FFFFFF">
        {STARS.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fillOpacity={0.35 + r * 0.28} />
        ))}
      </g>
    </svg>
  );
}
