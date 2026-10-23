import { useEffect, useRef, useState } from "react";

import { clearOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { db } from "@/lib/db";
import { waitForBackupSync } from "@/lib/sync/export";
import { exportCompleteness } from "@/lib/sync/status";
import { APP_NAME } from "@/lib/brand";
import { BackupError, exportBackup, backupFileName, importBackup } from "@/lib/backup";
import { syncNow } from "@/lib/sync/client";
import { requestPersistentStorage } from "@/lib/storagePersist";

// W4: "Copia de seguridad" (Phase 0 hardening — data never leaves the device),
// moved verbatim out of AjustesClient with the file input, the restore
// confirmation, the persistent-storage probe and the three handlers that only
// this card uses.
export function BackupSettings() {
  // Backup / restore (Phase 0 hardening — data never leaves the device).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [backupMsg, setBackupMsg] = useState("");
  const [backupErr, setBackupErr] = useState("");
  const [exporting, setExporting] = useState(false);
  const [localOnlyOffer, setLocalOnlyOffer] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<File | null>(null);

  // Persistent storage (Phase 0 hardening): ask the browser not to silently
  // evict IndexedDB under storage pressure, and show the resulting status.
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void requestPersistentStorage().then(setPersisted);
  }, []);

  async function handleExport(localOnly = false) {
    setBackupErr("");
    setBackupMsg("");
    setExporting(true);
    try {
      const owner = (await db().syncState.get("default"))?.accountId;
      const linked = Boolean(owner);
      if (linked && !localOnly) {
        const summary = await waitForBackupSync(() => syncNow({ waitForRunning: true }));
        const completeness = exportCompleteness(summary.outcome);
        if (completeness === "refused") {
          setLocalOnlyOffer(false);
          setBackupErr("No descargamos datos: entrá con la cuenta de estos registros.");
          return;
        }
        if (completeness === "local-only") {
          setLocalOnlyOffer(true);
          setBackupErr("No pudimos confirmar los registros de otros aparatos. Podés descargar solo lo disponible en este teléfono.");
          return;
        }
      }
      const blob = await exportBackup();
      if (!active.current || (await db().syncState.get("default"))?.accountId !== owner) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setLocalOnlyOffer(false);
      setBackupMsg(localOnly
        ? "Copia local descargada. Puede faltar lo cargado desde otros aparatos."
        : "Copia descargada. Contiene los registros y fotos disponibles en este teléfono.");
    } catch {
      setBackupErr("No pudimos generar la copia. Probá de nuevo.");
    } finally { setExporting(false); }
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
    } catch (error) {
      // A refused file says why (a newer version, a damaged photo); anything
      // else is the generic answer. Either way nothing on the phone changed:
      // `importBackup` validates the whole file before it clears anything.
      setBackupErr(
        error instanceof BackupError
          ? error.message
          : `No pudimos restaurar ese archivo. Verificá que sea una copia de seguridad de ${APP_NAME}.`,
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
        guardalo en un lugar privado. Si tenés cuenta, primero comprobamos la
        sincronización de tus registros. Las fotos del archivo son las que están
        disponibles en este teléfono; no se descargan automáticamente todas las
        fotos de otros aparatos. El archivo contiene información personal sin
        cifrar, excepto las notas que ya protegiste con PIN.
      </p>
      {persisted === false && (
        <p className="mt-2 text-sm text-terracotta">
          Tu navegador no garantizó guardado persistente para esta app. Hacer
          copias de seguridad periódicas es especialmente importante.
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={exporting || restoring}
        className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        {exporting ? "Preparando copia…" : "Descargar mis datos"}
      </button>
      {localOnlyOffer && <button type="button" disabled={exporting || restoring} onClick={() => void handleExport(true)} className="mt-2 min-h-11 w-full rounded-tile border border-line px-4 py-2 text-sm font-bold text-petrol">Descargar solo la copia de este teléfono</button>}

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

      {backupMsg && <p role="status" aria-live="polite" className="mt-2 text-sm text-sage">{backupMsg}</p>}
      {backupErr && <p role="alert" className="mt-2 text-sm text-terracotta">{backupErr}</p>}
    </section>
  );
}
