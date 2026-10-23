import type { SyncOutcome } from "./client";

export function syncStatusView(input: {
  running: boolean; offline?: boolean; pending: number | undefined; lastError?: string; lastSyncAt?: number;
}): { title: string; description: string; retry: boolean } {
  if (input.running) return { title: "Sincronizando tus registros…", description: "Estamos comprobando la copia en tu cuenta.", retry: false };
  if (input.lastError) return {
    title: "No pudimos actualizar la copia en tu cuenta",
    description: "Los registros de este teléfono siguen guardados acá. La copia de tu cuenta puede estar incompleta.",
    retry: true,
  };
  if (input.offline) return { title: "Sin conexión con tu cuenta", description: "Los registros disponibles siguen en este teléfono. No comprobamos cambios de otros aparatos.", retry: true };
  if (input.pending === undefined) return { title: "Comprobando la copia…", description: "Estamos leyendo los registros de este teléfono.", retry: false };
  if (input.pending > 0) return {
    title: "Guardado en este teléfono; falta subir",
    description: "Hay registros pendientes. Se intentará cuando puedas conectar con tu cuenta.",
    retry: true,
  };
  if (!input.lastSyncAt) return {
    title: "Todavía no confirmamos la copia en tu cuenta",
    description: "Los registros disponibles están guardados en este teléfono.",
    retry: true,
  };
  return { title: "Última sincronización completada", description: "No hay registros locales pendientes de subir.", retry: false };
}

/** A non-throwing sync outcome must never imply a complete cross-device export. */
export function exportCompleteness(outcome: SyncOutcome): "complete" | "local-only" | "refused" {
  if (outcome === "ok") return "complete";
  if (outcome === "account-mismatch") return "refused";
  return "local-only";
}
