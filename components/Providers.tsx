"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Placements/directory are stable seed content (spec §6: staleTime 6h).
            staleTime: 1000 * 60 * 60 * 6,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // SessionProvider is safe with auth unconfigured: the session endpoint simply
  // resolves to null and every consumer sees "not signed in", which is exactly
  // local-only mode (BUILD-PLAN A2).
  return (
    <SessionProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
