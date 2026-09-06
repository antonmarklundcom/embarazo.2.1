"use client";

import { useQuery } from "@tanstack/react-query";

import {
  FLAG_DEFINITIONS,
  isFlagKey,
  type ClientFlagValues,
  type FlagKey,
} from "./keys";

// BUILD-PLAN I5 / U1 — reading a flag from a component.
//
// The contract this hook exists to guarantee: **a flag fetch never blocks or
// blanks a render.** There is no loading state to handle, no error state to
// handle and no suspense boundary to add. Before the answer arrives, and on
// any failure — offline, a 500, a garbled body — the caller gets the key's
// default, which for every flag today is `false`, i.e. the quieter app.
//
// That is why the return type is `boolean` and not `boolean | undefined`: a
// hook that could return `undefined` would grow a spinner at each call site,
// and a spinner where a rail is going to be hidden anyway is a worse screen
// than the one without it.
//
// The service worker has a NetworkFirst rule for this route with a cached
// fallback, so a returning offline device gets its last known answer rather
// than the default (app/sw.ts).

async function fetchClientFlags(): Promise<ClientFlagValues> {
  const res = await fetch("/api/v1/flags");
  if (!res.ok) throw new Error("failed");
  const body: unknown = await res.json();
  if (!body || typeof body !== "object") return {};

  // Trust the shape as little as the route trusts its parameters: an unknown
  // key from a newer deployment is dropped, a non-boolean value is ignored.
  const out: ClientFlagValues = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (isFlagKey(key) && typeof value === "boolean") out[key] = value;
  }
  return out;
}

/** The current value of a client-scope flag, defaulting until it is known. */
export function useFlag(key: FlagKey): boolean {
  const { data } = useQuery({
    // One cache key for everybody: the response does not vary by user.
    queryKey: ["flags"],
    queryFn: fetchClientFlags,
    // The store's own window. Refetching faster would not see a newer answer.
    staleTime: 60_000,
  });

  return data?.[key] ?? FLAG_DEFINITIONS[key].default;
}
