// The seven-day strip that tops "Hoy" — Monday-start, today highlighted.
// Decorative (`aria-hidden`): the week the user is actually in is announced by
// the hero it sits in. Since the 17 October redesign it is drawn on the hero's
// theme, so it takes that theme's ink.

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

export function WeekStrip({ tone = "light" }: { tone?: "light" | "dark" }) {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // Monday-start index
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx);
  const dark = tone === "dark";
  return (
    <div className="mx-auto grid max-w-md grid-cols-7 gap-1" aria-hidden>
      {DAY_LETTERS.map((letter, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const isToday = i === todayIdx;
        return (
          <div key={i} className="flex flex-col items-center">
            <div
              className={`text-[10px] font-extrabold tracking-[1px] ${
                isToday ? (dark ? "text-white" : "text-[#8E3B24]") : dark ? "text-white/70" : "text-ink/60"
              }`}
            >
              {isToday ? "HOY" : letter}
            </div>
            <div
              className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full text-[15px] ${
                isToday
                  ? `bg-white font-black shadow-soft ${dark ? "text-[#232C3B]" : "text-[#8E3B24]"}`
                  : `font-bold ${dark ? "text-white/80" : "text-ink/70"}`
              }`}
            >
              {d.getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
