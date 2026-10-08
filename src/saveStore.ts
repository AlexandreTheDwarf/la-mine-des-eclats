import {
  SAVE_KEY, TEASER_SAVE_KEY, advanceGameTime, createInitialState,
  migrateTeaserSave, parseGameSave, type GameState,
} from "./game.ts";

export const BACKUP_KEY = `${SAVE_KEY}-backup`;
export type SaveProblemKind = "damaged" | "unavailable" | "conflict";
export interface SaveProblem {
  kind: SaveProblemKind;
  raw: string | null;
  backup: GameState | null;
}
type StoragePort = Pick<Storage, "getItem" | "setItem">;

/** The storage boundary is injectable so quota failures and competing tabs can
 * be tested without touching a real player's browser. Reading never writes.
 * A blocked store can only resume through an explicit reload or recovery. */
export class GameSaveStore {
  private expected: string | null = null;
  private lastBackupAt = 0;
  private loaded = false;
  problem: SaveProblem | null = null;
  private storage: () => StoragePort;

  constructor(storage: () => StoragePort = () => window.localStorage) {
    this.storage = storage;
  }

  readBackup(): GameState | null {
    try {
      const raw = this.storage().getItem(BACKUP_KEY);
      return raw ? parseGameSave(raw) : null;
    } catch { return null; }
  }

  load(now = Date.now()): GameState {
    this.problem = null;
    this.loaded = false;
    let raw: string | null = null;
    try {
      raw = this.storage().getItem(SAVE_KEY);
      this.expected = raw;
    } catch {
      this.problem = { kind: "unavailable", raw, backup: null };
      return createInitialState();
    }
    try {
      if (raw !== null) {
        const state = advanceGameTime(parseGameSave(raw), now, true);
        this.loaded = true;
        return state;
      }
      const backupRaw = this.storage().getItem(BACKUP_KEY);
      if (backupRaw !== null) {
        this.problem = { kind: "damaged", raw: backupRaw, backup: this.readBackup() };
        return createInitialState();
      }
      const teaser = this.storage().getItem(TEASER_SAVE_KEY);
      const state = teaser ? migrateTeaserSave(teaser) : createInitialState();
      this.loaded = true;
      return state;
    } catch {
      this.problem = { kind: "damaged", raw, backup: this.readBackup() };
      return createInitialState();
    }
  }

  /** Optimistic conflict detection prevents a suspended tab from overwriting
   * newer progress. The UI also listens for storage events to stop it sooner. */
  checkForConflict(): boolean {
    if (this.problem) return true;
    try {
      if (this.storage().getItem(SAVE_KEY) === this.expected) return false;
      this.problem = { kind: "conflict", raw: this.expected, backup: this.readBackup() };
    } catch {
      this.problem = { kind: "unavailable", raw: this.expected, backup: null };
    }
    return true;
  }

  write(state: GameState, now = Date.now(), replace = false): boolean {
    if (!this.loaded) return false;
    if (this.checkForConflict()) return false;
    try {
      const raw = JSON.stringify({ ...state, offlineReport: null, activeEvent: null, lastSavedAt: now });
      parseGameSave(raw);
      // Rotation is independent of the five-second autosave, leaving a useful
      // older restore point. Imports and resets always back up their predecessor.
      if (replace || now - this.lastBackupAt >= 60_000 || !this.storage().getItem(BACKUP_KEY)) {
        this.storage().setItem(BACKUP_KEY, this.expected ?? raw);
        this.lastBackupAt = now;
      }
      this.storage().setItem(SAVE_KEY, raw);
      this.expected = raw;
      return true;
    } catch {
      this.problem = { kind: "unavailable", raw: this.expected, backup: this.readBackup() };
      return false;
    }
  }

  /** Recovery is user initiated. Preserve unreadable bytes before replacement;
   * if that archive cannot be written, leave the original completely intact. */
  recover(state: GameState, now = Date.now()): boolean {
    try {
      const raw = this.storage().getItem(SAVE_KEY);
      if (raw !== this.expected) {
        this.problem = { kind: "conflict", raw: this.expected, backup: this.readBackup() };
        return false;
      }
      const original = raw ?? this.problem?.raw;
      if (original != null) this.storage().setItem(`${SAVE_KEY}-recovery-${now}`, original);
      const next = JSON.stringify({ ...state, offlineReport: null, activeEvent: null, lastSavedAt: now });
      parseGameSave(next);
      this.storage().setItem(SAVE_KEY, next);
      this.expected = next;
      this.loaded = true;
      this.problem = null;
      this.lastBackupAt = now;
      return true;
    } catch {
      this.problem = { kind: "unavailable", raw: this.expected, backup: this.readBackup() };
      return false;
    }
  }

  retry(): boolean {
    // Do not reset the expected revision: a retry must still detect a newer tab.
    if (this.problem?.kind === "unavailable") this.problem = null;
    return this.loaded;
  }
}
