import { AjustesClient } from "./AjustesClient";
import { AccountSection } from "@/components/AccountSection";

// BUILD-PLAN A2 — /ajustes became a server component so it can read the
// session (BUILD-PLAN "Done when: /ajustes shows the account"). The whole
// existing screen still lives in AjustesClient; the account block is passed in
// as a server-rendered slot, which keeps lib/server/* out of the client bundle.
//
// Per-user content: never prerender it.
export const dynamic = "force-dynamic";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A5 lands here after deleting an account. The redirect is the only thing
  // left to tell the user it worked — their session is gone, so there is no
  // signed-in state to read and nothing else on the page has changed.
  const deleted = (await searchParams).cuenta === "borrada";

  return (
    <AjustesClient
      account={
        <>
          {deleted && (
            <section className="rounded-card border border-line bg-pastel-salvia p-4">
              <h2 className="text-[15px] font-extrabold text-ink">
                Listo, borramos tu cuenta
              </h2>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">
                No nos queda nada tuyo en el servidor. Podés seguir usando Mi
                Bebé sin cuenta cuando quieras.
              </p>
            </section>
          )}
          <AccountSection />
        </>
      }
    />
  );
}
