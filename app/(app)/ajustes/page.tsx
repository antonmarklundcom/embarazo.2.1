import { redirect } from "next/navigation";
import { AjustesClient } from "./AjustesClient";
import { AccountSection } from "@/components/AccountSection";
export const dynamic = "force-dynamic";
export default async function AjustesPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  // Older installed clients landed here after deletion; confirmation must be public.
  if ((await searchParams).cuenta === "borrada") redirect("/cuenta?cuenta=borrada");
  return <AjustesClient account={<AccountSection />} />;
}
