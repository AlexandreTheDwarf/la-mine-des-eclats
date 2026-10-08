import { useCallback, useEffect, useRef, useState } from "react";
import { SAVE_KEY, advanceGameTime, gameReducer, type GameAction, type GameState } from "./game";
import { GameSaveStore, type SaveProblem } from "./saveStore";

/** React owns presentation, while this hook owns the clock and persistence.
 * The ref is updated synchronously: pagehide can flush the latest click even
 * before React has rendered it. Timers never capture an old game snapshot. */
export function useGameSession() {
  const [store] = useState(() => new GameSaveStore());
  const [state, setState] = useState(() => store.load());
  const current = useRef(state);
  const [problem, setProblem] = useState<SaveProblem | null>(store.problem);

  const publish = useCallback((next: GameState) => {
    current.current = next;
    setState(next);
  }, []);

  const check = useCallback(() => {
    const blocked = store.checkForConflict();
    if (blocked) setProblem(store.problem);
    return blocked;
  }, [store]);

  const flush = useCallback(() => {
    if (check()) return false;
    const next = advanceGameTime(current.current, Date.now(), document.hidden);
    publish(next);
    const saved = store.write(next);
    setProblem(store.problem);
    return saved;
  }, [check, publish, store]);

  const dispatch = useCallback((action: GameAction) => {
    if (check()) return false;
    const next = gameReducer(advanceGameTime(current.current), action);
    // Destructive operations must be persisted before being shown as complete.
    if ((action.type === "IMPORT" || action.type === "RESET") && !store.write(next, Date.now(), true)) {
      setProblem(store.problem);
      return false;
    }
    publish(next);
    return true;
  }, [check, publish, store]);

  const recover = useCallback((replacement: GameState) => {
    const next = advanceGameTime(replacement, Date.now(), true);
    if (store.recover(next)) publish(next);
    setProblem(store.problem);
  }, [publish, store]);

  const reload = useCallback(() => {
    publish(store.load());
    setProblem(store.problem);
  }, [publish, store]);

  const retry = useCallback(() => {
    if (store.retry()) flush();
    else reload();
  }, [flush, reload, store]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (!document.hidden && !check()) publish(advanceGameTime(current.current));
    }, 1_000);
    // Unlike a debounce, this cannot be postponed forever by rapid clicks.
    const autosave = window.setInterval(() => { if (!document.hidden) flush(); }, 5_000);
    const visibility = () => {
      if (document.hidden) flush();
      else if (!check()) publish(advanceGameTime(current.current, Date.now(), true));
    };
    const storage = (event: StorageEvent) => {
      if (event.key === SAVE_KEY || event.key === null) check();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("pageshow", visibility);
    window.addEventListener("storage", storage);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(autosave);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("pageshow", visibility);
      window.removeEventListener("storage", storage);
    };
  }, [check, flush, publish]);

  return { state, dispatch, problem, flush, recover, reload, retry, readBackup: () => store.readBackup() };
}
