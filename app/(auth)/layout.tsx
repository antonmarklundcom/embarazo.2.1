import type { ReactNode } from "react";

// BUILD-PLAN A2. Auth screens deliberately sit outside the app shell: no
// bottom nav, no SOS pill. Someone deciding whether to create an account
// should not be one mis-tap away from the emergency screen.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        {children}
      </main>
    </div>
  );
}
