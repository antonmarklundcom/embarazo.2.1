import type { MiBebeDB } from "@/lib/db";
/** A different tab restored/wiped this database while a response was in flight. */
export class LocalAccountChanged extends Error {
  constructor() { super("local-account-changed"); this.name = "LocalAccountChanged"; }
}
/** Must run INSIDE the transaction that writes the incoming record/bookkeeping. */
export async function assertLocalAccountOwner(instance: MiBebeDB, expectedAccountId: string): Promise<void> {
  const current = await instance.syncState.get("default");
  if (current?.accountId !== expectedAccountId) throw new LocalAccountChanged();
}
