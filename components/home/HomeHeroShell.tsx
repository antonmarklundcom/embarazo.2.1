import Link from "next/link";

import { WelcomeBaby } from "@/components/welcome/WelcomeBaby";
import { heroTheme } from "@/lib/hero/themes";

// Night run item 8 — what `/` paints before the account check answers.
//
// The account gate is a client check (`/api/v1/auth-status`), so the server
// can only render its "checking" state. That state used to be one line of
// text, and Hoy's real hero arrived only after the fetch, a Dexie read and a
// render — the bimodal 2.0 s / 4.6 s LCP in KNOWN-ISSUES. This shell is the
// hero's frame, served in the HTML: the same warm ground and a 252 px stage
// (Hoy's `STAGE`) with the welcome baby, so the largest paint happens on the
// first frame instead of after the network. The status line, the emergency
// link and the CSS-only repair link are the ones the old placeholder had.
export function HomeHeroShell() {
  return (
    <div className="space-y-5">
      <section aria-label="Abriendo tu embarazo" className="hero-bleed relative isolate overflow-hidden pb-6">
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: heroTheme("halo").background }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-b from-transparent to-cream md:hidden" />
        <div className="mt-11">
          <WelcomeBaby size={252} alt="" priority />
        </div>
        <div className="mt-4 text-center">
          <p role="status" className="text-[15px] font-bold text-ink/85">
            Abriendo tu embarazo…
          </p>
        </div>
      </section>
      <div className="text-center">
        <Link href="/emergencia" className="inline-block text-sm font-bold text-terracotta underline">
          Señales de alarma y ayuda
        </Link>
        <p className="reveal-late mt-6 text-sm text-muted">
          ¿No carga? <a href="/reparar" className="font-bold text-petrol underline">Reparar la app</a>
        </p>
      </div>
    </div>
  );
}
