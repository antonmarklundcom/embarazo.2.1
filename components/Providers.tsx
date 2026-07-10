"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { UpdateToast } from "./UpdateToast";

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

  return (
    <QueryClientProvider client={client}>
      {children}
      <UpdateToast />
    </QueryClientProvider>
  );
}
