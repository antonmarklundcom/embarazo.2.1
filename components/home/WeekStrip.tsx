// W4: moved verbatim out of `app/(app)/page.tsx`. The seven-day strip that
// tops "Hoy" — Monday-start, today highlighted. Decorative (`aria-hidden`):
// the week the user is actually in is announced by the hero below it.

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

export function WeekStrip() {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // Monday-start index
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx);
  return (
    <div className="grid grid-cols-7 gap-1" aria-hidden>
      {DAY_LETTERS.map((letter, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const isToday = i === todayIdx;
        return (
          <div key={i} className="text-center">
            <div
              className={`text-[10px] font-bold tracking-[1px] ${
                isToday ? "font-black text-terracotta" : "text-muted/70"
              }`}
            >
              {isToday ? "HOY" : letter}
            </div>
            <div
              className={`mt-1 rounded-full py-1.5 text-sm ${
                isToday
                  ? "bg-terracotta font-black text-white"
                  : "font-bold text-muted"
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
