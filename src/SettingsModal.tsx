import { Copy, Database, Download, ExternalLink, RefreshCw, RotateCcw, Smartphone, X } from "lucide-react";
import { useState } from "react";
import { decodeSave, encodeSave, type GameAction, type GameState } from "./game";
import { downloadSave } from "./SaveRecovery";
import { Modal } from "./Modal";
import type { usePwa } from "./usePwa";

export function SettingsModal({ state, dispatch, onClose, pwa, readBackup }: {
  state: GameState; dispatch: (action: GameAction) => boolean; onClose: () => void;
  pwa: ReturnType<typeof usePwa>; readBackup: () => GameState | null;
}) {
  const [importValue, setImportValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const [backup] = useState(readBackup);
  const [restoreArmed, setRestoreArmed] = useState(false);

  const copySave = async () => {
    try { await navigator.clipboard.writeText(encodeSave(state)); setFeedback("Sauvegarde copiée."); }
    catch { setFeedback("Copie impossible dans ce navigateur. Le téléchargement reste disponible."); }
  };
  const importSave = () => {
    try {
      if (!dispatch({ type: "IMPORT", state: decodeSave(importValue) })) return;
      setFeedback("Sauvegarde importée."); setImportValue("");
    } catch { setFeedback("Ce code de sauvegarde n'est pas valide ou vient d'une version plus récente."); }
  };
  const reset = () => {
    if (!resetArmed) { setResetArmed(true); setFeedback("La prochaine confirmation remplacera la mine. Une copie exportée reste indépendante du navigateur."); return; }
    if (!dispatch({ type: "RESET" })) return;
    setFeedback("Nouvelle mine créée."); setResetArmed(false);
  };

  return <Modal className="settings-modal" titleId="settings-title" onClose={onClose}>
    <div className="settings-modal__heading">
      <div><small>VERSION 1.0.0 · L'AUBE RETROUVÉE</small><h2 id="settings-title">La mine & ses archives</h2></div>
      <button type="button" className="icon-button" title="Fermer" aria-label="Fermer les réglages" onClick={onClose}><X aria-hidden="true" /></button>
    </div>
    <label className="motion-setting"><input type="checkbox" checked={state.reducedMotion} onChange={(event) => dispatch({ type: "SET_REDUCED_MOTION", enabled: event.target.checked })} /> Animations réduites</label>
    <p>Progression locale, sans compte ni synchronisation. Les navigateurs ne partagent pas leur sauvegarde.</p>
    <button className="settings-action" type="button" onClick={copySave}><Copy aria-hidden="true" /> COPIER LA SAUVEGARDE</button>
    <button className="settings-action" type="button" onClick={() => { downloadSave(encodeSave(state)); setFeedback("Copie exportée. Elle reste disponible même si les données du navigateur sont effacées."); }}><Download aria-hidden="true" /> TÉLÉCHARGER UNE COPIE</button>
    {backup && <button className="settings-action" type="button" onClick={() => {
      if (!restoreArmed) { setRestoreArmed(true); return; }
      if (dispatch({ type: "IMPORT", state: backup })) { setFeedback("Copie de secours restaurée."); setRestoreArmed(false); }
    }}><RotateCcw aria-hidden="true" /> {restoreArmed ? "CONFIRMER LA RESTAURATION" : `SECOURS DU ${new Date(backup.lastSavedAt).toLocaleString("fr-FR")}`}</button>}
    <label htmlFor="save-file">Ouvrir une copie</label>
    <input id="save-file" type="file" accept=".txt,text/plain" onChange={async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 2_000_000) { setFeedback("Ce fichier est trop volumineux."); return; }
      try { setImportValue(await file.text()); setFeedback("Copie chargée, prête à importer."); }
      catch { setFeedback("Lecture du fichier impossible."); }
    }} />
    <label htmlFor="save-import">Importer un code</label>
    <textarea id="save-import" value={importValue} onChange={(event) => setImportValue(event.target.value)} placeholder="Code de sauvegarde" />
    <button className="settings-action" type="button" onClick={importSave} disabled={!importValue.trim()}><Database aria-hidden="true" /> IMPORTER</button>
    <button className={`reset-action${resetArmed ? " is-armed" : ""}`} type="button" onClick={reset}><RotateCcw aria-hidden="true" /> {resetArmed ? "CONFIRMER LA NOUVELLE PARTIE" : "RECOMMENCER"}</button>
    {resetArmed && <button className="settings-action" type="button" onClick={() => setResetArmed(false)}><X aria-hidden="true" /> ANNULER</button>}
    {feedback && <p className="settings-feedback" role="status">{feedback}</p>}
    <section className="pwa-settings" aria-label="Application">
      <h3><Smartphone aria-hidden="true" /> {pwa.installed ? "Application installée" : "Application"}</h3>
      <p role="status">{pwa.error || (pwa.offlineReady ? "Disponible hors connexion sur cet appareil." : "Cache hors connexion en préparation.")}</p>
      {pwa.canInstall && <button className="settings-action" type="button" onClick={() => void pwa.install()}><Download aria-hidden="true" /> INSTALLER LA MINE</button>}
      {!pwa.installed && <details className="install-help"><summary>Installation sur téléphone</summary>
        <p>Pas d'APK à télécharger. Les guides officiels de ton navigateur :</p>
        <a href="https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=fr" target="_blank" rel="noreferrer">Chrome · Android <ExternalLink aria-hidden="true" /></a>
        <a href="https://support.mozilla.org/fr/kb/utiliser-applications-web-firefox-android" target="_blank" rel="noreferrer">Firefox · Android <ExternalLink aria-hidden="true" /></a>
        <a href="https://support.apple.com/fr-fr/guide/iphone/iph42ab2f3a7/ios" target="_blank" rel="noreferrer">Safari · iPhone <ExternalLink aria-hidden="true" /></a>
      </details>}
      {pwa.needRefresh && <button className="settings-action" type="button" onClick={() => void pwa.update()}><RefreshCw aria-hidden="true" /> APPLIQUER LA MISE À JOUR</button>}
    </section>
  </Modal>;
}
