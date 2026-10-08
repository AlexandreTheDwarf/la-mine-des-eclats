import { Download, FileUp, RotateCcw, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createInitialState, decodeSave, encodeSave, formatNumber, type GameState } from "./game";
import type { SaveProblem } from "./saveStore";

export function downloadSave(contents: string, name = "mine-des-eclats-sauvegarde.txt") {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

interface Props {
  problem: SaveProblem;
  state: GameState;
  onRecover: (state: GameState) => void;
  onReload: () => void;
  onRetry: () => void;
}

/** No dismiss button: running a blank mine over unreadable progress is unsafe.
 * The original bytes remain available even when no backup can be decoded. */
export function SaveRecovery({ problem, state, onRecover, onReload, onRetry }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => { dialog.current?.focus(); }, [problem.kind]);
  const damaged = problem.kind === "damaged";
  const conflict = problem.kind === "conflict";
  const restore = () => {
    try { onRecover(decodeSave(code)); }
    catch { setError("Ce code ne contient pas une sauvegarde compatible."); }
  };
  return (
    <div className="modal-backdrop recovery-backdrop">
      <section ref={dialog} tabIndex={-1} className="settings-modal recovery-modal" role="alertdialog" aria-modal="true" aria-labelledby="recovery-title" aria-describedby="recovery-detail" onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), textarea"));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}>
        <ShieldAlert className="recovery-icon" aria-hidden="true" />
        <h2 id="recovery-title">{damaged ? "Sauvegarde à récupérer" : conflict ? "Une autre mine est ouverte" : "Sauvegarde indisponible"}</h2>
        <p id="recovery-detail">{damaged
          ? "La progression enregistrée est illisible ou provient d'une version plus récente. Elle n'a pas été remplacée."
          : conflict ? "Un autre onglet a enregistré une progression différente. Cette partie est en pause pour éviter de l'écraser."
          : "Le navigateur refuse l'enregistrement. La partie est en pause ; garde une copie avant de fermer."}</p>
        <button type="button" className="settings-action" onClick={() => downloadSave(damaged ? problem.raw ?? "" : encodeSave(state), damaged ? "mine-des-eclats-recuperation.json" : undefined)} disabled={damaged && problem.raw === null}>
          <Download aria-hidden="true" />{damaged ? "RÉCUPÉRER LE FICHIER ORIGINAL" : "EXPORTER CETTE PARTIE"}
        </button>
        {conflict && <button type="button" className="settings-action" onClick={onReload}><RotateCcw aria-hidden="true" /> CHARGER LA DERNIÈRE SAUVEGARDE</button>}
        {!damaged && !conflict && <button type="button" className="settings-action" onClick={onRetry}><RotateCcw aria-hidden="true" /> RÉESSAYER L'ENREGISTREMENT</button>}
        {damaged && <>
          {problem.backup && <button type="button" className="settings-action" onClick={() => onRecover(problem.backup!)}>
            <RotateCcw aria-hidden="true" /> RESTAURER LE SECOURS · {formatNumber(problem.backup.maxDepth)} m
          </button>}
          <label htmlFor="recovery-code">Code de sauvegarde</label>
          <textarea id="recovery-code" value={code} onChange={(event) => setCode(event.target.value)} />
          <button type="button" className="settings-action" disabled={!code.trim()} onClick={restore}><FileUp aria-hidden="true" /> IMPORTER UNE COPIE</button>
          <button type="button" className="reset-action" onClick={() => armed ? onRecover(createInitialState()) : setArmed(true)}>
            <RotateCcw aria-hidden="true" /> {armed ? "CONFIRMER UNE NOUVELLE MINE" : "REPARTIR DE ZÉRO"}
          </button>
        </>}
        {error && <p role="alert">{error}</p>}
      </section>
    </div>
  );
}
