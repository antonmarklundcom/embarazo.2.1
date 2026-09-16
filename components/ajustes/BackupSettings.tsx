import { useEffect, useRef, useState } from "react";

import { clearOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { APP_NAME } from "@/lib/brand";
import { exportBackup, backupFileName, importBackup } from "@/lib/backup";
import { syncNow } from "@/lib/sync/client";

// W4: "Copia de seguridad" (Phase 0 hardening — data never leaves the device),
// moved verbatim out of AjustesClient with the file input, the restore
// confirmation, the persistent-storage probe and the three handlers that only
// this card uses.
export function BackupSettings() {
  // Backup / restore (Phase 0 hardening — data never leaves the device).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState("");
  const [backupErr, setBackupErr] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<File | null>(null);

  // Persistent storage (Phase 0 hardening): ask the browser not to silently
  // evict IndexedDB under storage pressure, and show the resulting status.
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
    navigator.storage.persisted().then((already) => {
      if (already) {
        setPersisted(true);
        return;
      }
      navigator.storage.persist().then(setPersisted);
    });
  }, []);

  async function handleExport() {
    setBackupErr("");
    setBackupMsg("");
    try {
      // A5: "Descargar mis datos" must include synced data. The device is the
      // source of truth, but a record written on another phone lives only on
      // the server until it is pulled — so pull first, then export. This is a
      // no-op (and silent) without an account, which is the common case.
      await syncNow();
      const blob = await exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFileName();
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg("Copia descargada. Guardala en un lugar seguro.");
      setTimeout(() => setBackupMsg(""), 4000);
    } catch {
      setBackupErr("No pudimos generar la copia. Probá de nuevo.");
    }
  }

  function handlePickRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setConfirmRestoreFile(file);
  }

  async function handleRestore() {
    if (!confirmRestoreFile) return;
    setRestoring(true);
    setBackupErr("");
    setBackupMsg("");
    try {
      await importBackup(confirmRestoreFile);
      // Same reasoning as handleWipe: the restored file is the truth about this
      // device now, and a leftover onboarding draft is not part of it.
      clearOnboardingDraft();
      setConfirmRestoreFile(null);
      // Force a full reload so every screen re-reads the restored data.
      window.location.href = "/";
    } catch {
      setBackupErr(
        `No pudimos restaurar ese archivo. Verificá que sea una copia de seguridad de ${APP_NAME}.`,
      );
      setRestoring(false);
    }
  }

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Copia de seguridad</h2>
      <p className="mt-1 text-sm text-muted">
        Sin cuenta, tus datos viven solo en este teléfono: si lo perdés, lo
        cambiás o borrás los datos del navegador, se pierden para siempre a
        menos que tengas una copia. Descargá un archivo con todos tus datos y
        guardalo en un lugar seguro (por ejemplo, envíatelo por WhatsApp o
        guardalo en Google Drive). Si tenés cuenta, la copia incluye también
        lo que hayas cargado desde otros aparatos.
      </p>
      {persisted === false && (
        <p className="mt-2 text-sm text-terracotta">
          Tu navegador no garantizó guardado persistente para esta app. Hacer
          copias de seguridad periódicas es especialmente importante.
        </p>
      )}
      <button
        type="button"
        onClick={handleExport}
        className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        Descargar mis datos
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handlePickRestoreFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-2 min-h-[44px] w-full rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
      >
        Restaurar desde un archivo
      </button>

      {confirmRestoreFile && (
        <div className="mt-3 space-y-2 rounded-tile border border-terracotta/30 bg-terracotta/5 p-3">
          <p className="text-sm text-ink">
            Restaurar <strong>{confirmRestoreFile.name}</strong> reemplaza
            todos los datos actuales de este teléfono por los del archivo.
            Esta acción no se puede deshacer. ¿Confirmás?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRestore}
              disabled={restoring}
              className="min-h-[44px] flex-1 rounded-tile bg-terracotta px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {restoring ? "Restaurando…" : "Sí, restaurar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRestoreFile(null)}
              disabled={restoring}
              className="min-h-[44px] flex-1 rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-petrol shadow-soft"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {backupMsg && <p className="mt-2 text-sm text-sage">{backupMsg}</p>}
      {backupErr && <p className="mt-2 text-sm text-terracotta">{backupErr}</p>}
    </section>
  );
}
