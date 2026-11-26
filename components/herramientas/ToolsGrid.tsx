"use client";

import Link from "next/link";

import { ToolIcon, type ToolIconName } from "@/components/ToolIcon";
import { useProfile } from "@/lib/useProfile";

// The tools grid, split out of the page so the one part that depends on a
// device-local fact (has the baby been born?) can be a client component while
// the page stays static. The tiles are decided on the server; this only drops
// the two pregnancy-only ones once a birth date is recorded. The routes stay
// reachable by URL.

export interface GridTool {
  href: string;
  title: string;
  desc: string;
  icon: ToolIconName;
  tone: string;
}

export interface GridGroup {
  title: string;
  tools: GridTool[];
}

const PREGNANCY_ONLY = new Set(["/herramientas/pataditas", "/herramientas/contracciones"]);

function ToolTile({ tool }: { tool: GridTool }) {
  return (
    <Link
      href={tool.href}
      className={`flex min-h-[112px] flex-col items-start justify-between gap-2 rounded-card ${tool.tone} p-3 text-left transition active:scale-[0.97]`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-ink">
        <ToolIcon name={tool.icon} />
      </span>
      <span className="text-[12px] font-extrabold leading-tight text-ink">{tool.title}</span>
      {/* Kept for screen readers and for anyone who needs the sentence. */}
      <span className="sr-only">{tool.desc}</span>
    </Link>
  );
}

export function ToolsGrid({ groups }: { groups: GridGroup[] }) {
  const profile = useProfile();
  const born = !profile.loading && profile.birthDate !== undefined;
  const shown = groups
    .map((group) => ({
      ...group,
      tools: born ? group.tools.filter((tool) => !PREGNANCY_ONLY.has(tool.href)) : group.tools,
    }))
    .filter((group) => group.tools.length > 0);

  return (
    <>
      {shown.map((group, index) => (
        <section key={group.title} aria-labelledby={`herramientas-${index}`} className="space-y-2.5">
          <h2 id={`herramientas-${index}`} className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
            {group.title}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {group.tools.map((tool) => (
              <ToolTile key={tool.href} tool={tool} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
