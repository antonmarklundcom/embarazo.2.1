"use client";

import Link from "next/link";
import { PUBLISHED_VIDEOS } from "@/lib/seed/videos";
import { TOOL_TONE_CLASS, toolsForRole, type Tool } from "@/lib/tools";
import { useProfile } from "@/lib/useProfile";

// BUILD-PLAN D1 (FEATURE-MAP #20). Scannable 2-per-row grid replacing the
// text list. Two columns rather than Preggers' three: our labels are Spanish
// and longer, and three columns forced them to wrap to two lines each.

export default function HerramientasPage() {
  const profile = useProfile();
  const isOwner = profile.role === "mama";

  const tools: Tool[] = [...toolsForRole(isOwner)];
  // The video gallery appears on its own once content/videos.json has entries.
  if (PUBLISHED_VIDEOS.length > 0) {
    tools.push({
      href: "/guias/videos",
      title: "Videos",
      desc: "Galería de videos educativos, por tema y trimestre.",
      tone: "arena",
    });
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Herramientas
        </h1>
        <p className="text-sm text-muted">
          Todo funciona sin internet y se guarda primero en tu teléfono.
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-3">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="flex h-full min-h-[112px] flex-col justify-between rounded-card border border-line bg-white p-3 transition active:scale-[0.98]"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full ${TOOL_TONE_CLASS[tool.tone]}`}
                aria-hidden="true"
              />
              <span className="mt-3 block text-[15px] font-extrabold leading-tight text-ink">
                {tool.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
