// Small persistent privacy reassurance line (build spec §6 — a product pillar).
export function PrivacyLine({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs text-muted ${className}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"
          stroke="#8FAE86"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="m9 12 2 2 4-4" stroke="#8FAE86" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Tus datos quedan en tu teléfono.
    </p>
  );
}
