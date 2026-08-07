import { AjustesClient } from "./AjustesClient";
import { AccountSection } from "@/components/AccountSection";

// BUILD-PLAN A2 — /ajustes became a server component so it can read the
// session (BUILD-PLAN "Done when: /ajustes shows the account"). The whole
// existing screen still lives in AjustesClient; the account block is passed in
// as a server-rendered slot, which keeps lib/server/* out of the client bundle.
//
// Per-user content: never prerender it.
export const dynamic = "force-dynamic";

export default function AjustesPage() {
  return <AjustesClient account={<AccountSection />} />;
}
