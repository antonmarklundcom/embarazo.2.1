"use client";

// Last-resort boundary for errors in the root layout itself (fonts,
// Providers). Must render its own <html>/<body> per Next.js convention since
// it replaces the root layout when it fires. Intentionally plain — no
// Tailwind theme dependency in case the failure is upstream of styling.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-PY">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#FBF7F1",
          color: "#2A2620",
        }}
      >
        <h1 style={{ fontSize: "1.125rem", fontWeight: 500 }}>
          Mi Bebé no pudo cargar
        </h1>
        <p style={{ fontSize: "0.875rem", maxWidth: 320, color: "#7E766C" }}>
          Tus datos están a salvo en tu teléfono. Probá recargar la app.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: 44,
            padding: "0.625rem 1.5rem",
            borderRadius: 12,
            border: "none",
            background: "#1F5F5B",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
