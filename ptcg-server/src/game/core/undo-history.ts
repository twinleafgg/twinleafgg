import { State, GamePhase } from '../store/state/state';
import { StateSerializer } from '../serializer/state-serializer';
import { SerializedState } from '../serializer/serializer.interface';
import { GameError } from '../game-error';
import { GameCoreError } from '../game-message';

export interface UndoFrameMeta {
  turn: number;
  activePlayerId: number;
}

export interface UndoAvailability {
  canUndo: boolean;
  /** Player id who must press Undo for the next step (when canUndo is false for requester). */
  undoOwnerId?: number;
}

/**
 * Diff-based undo stack for live games. Only allocated when undo is enabled.
 * Keeps turn-start checkpoints so restores stay cheap after pruning.
 */
export class UndoHistory {

  private diffs: SerializedState[] = [];
  private meta: UndoFrameMeta[] = [];
  /** Full serialized states at selected indexes (turn starts + base after prune). */
  private checkpoints = new Map<number, SerializedState>();
  private prevSerialized: SerializedState | undefined;
  private serializer = new StateSerializer();

  public get length(): number {
    return this.diffs.length;
  }

  public append(state: State): void {
    if (state.phase === GamePhase.WAITING_FOR_PLAYERS || state.phase === GamePhase.FINISHED) {
      return;
    }
    if (state.prompts.some(p => p.result === undefined)) {
      return;
    }

    const full = this.serializer.serialize(state);
    const diff = this.serializer.serializeDiff(this.prevSerialized, state);
    if (diff === '[[]]' && this.diffs.length > 0) {
      return;
    }

    const activePlayerId = state.players[state.activePlayer]?.id ?? 0;
    const index = this.diffs.length;
    const isTurnStart = this.meta.length === 0 || this.meta[this.meta.length - 1].turn !== state.turn;

    this.diffs.push(this.diffs.length === 0 ? full : diff);
    this.meta.push({ turn: state.turn, activePlayerId });
    if (isTurnStart || index === 0) {
      this.checkpoints.set(index, full);
    }
    this.prevSerialized = full;
  }

  public prune(deepUndoEnabled: boolean): void {
    if (this.meta.length === 0) {
      return;
    }
    const currentTurn = this.meta[this.meta.length - 1].turn;
    const minTurn = deepUndoEnabled ? Math.max(0, currentTurn - 1) : currentTurn;

    let keepFrom = 0;
    for (let i = 0; i < this.meta.length; i++) {
      if (this.meta[i].turn >= minTurn) {
        keepFrom = i;
        break;
      }
    }
    if (keepFrom === 0) {
      return;
    }

    const base = this.getSerialized(keepFrom);
    const nextDiffs = [base, ...this.diffs.slice(keepFrom + 1)];
    const nextMeta = this.meta.slice(keepFrom);
    const nextCheckpoints = new Map<number, SerializedState>();
    nextCheckpoints.set(0, base);

    for (let i = 1; i < nextMeta.length; i++) {
      if (nextMeta[i].turn !== nextMeta[i - 1].turn) {
        nextCheckpoints.set(i, this.getSerialized(keepFrom + i));
      }
    }

    this.diffs = nextDiffs;
    this.meta = nextMeta;
    this.checkpoints = nextCheckpoints;
    this.prevSerialized = this.getSerialized(this.diffs.length - 1);
  }

  public getAvailability(requesterId: number, deepUndoEnabled: boolean, selfPlay: boolean): UndoAvailability {
    const ownerId = this.getNextUndoOwnerId(deepUndoEnabled);
    if (ownerId === undefined) {
      return { canUndo: false };
    }
    if (selfPlay || requesterId === ownerId) {
      return { canUndo: true, undoOwnerId: ownerId };
    }
    return { canUndo: false, undoOwnerId: ownerId };
  }

  public getNextUndoOwnerId(deepUndoEnabled: boolean): number | undefined {
    if (this.diffs.length < 2) {
      return undefined;
    }
    const last = this.meta[this.meta.length - 1];
    const prev = this.meta[this.meta.length - 2];
    const crossingTurnBoundary = last.turn !== prev.turn;
    if (crossingTurnBoundary) {
      if (!deepUndoEnabled) {
        return undefined;
      }
      return prev.activePlayerId;
    }
    return last.activePlayerId;
  }

  /**
   * Restore previous stable state.
   * When currentHasPrompts, restores the last recorded frame without popping
   * (dismisses the in-progress prompt state).
   */
  public undo(currentHasPrompts: boolean): State {
    if (this.diffs.length === 0) {
      throw new GameError(GameCoreError.ERROR_UNDO_NOT_AVAILABLE);
    }
    if (currentHasPrompts) {
      return this.getState(this.diffs.length - 1);
    }
    if (this.diffs.length < 2) {
      throw new GameError(GameCoreError.ERROR_UNDO_NOT_AVAILABLE);
    }

    const removeIndex = this.diffs.length - 1;
    this.diffs.pop();
    this.meta.pop();
    this.checkpoints.delete(removeIndex);

    const restored = this.getState(this.diffs.length - 1);
    this.prevSerialized = this.serializer.serialize(restored);
    return restored;
  }

  public getState(position: number): State {
    return this.serializer.deserialize(this.getSerialized(position));
  }

  private getSerialized(position: number): SerializedState {
    if (position < 0 || position >= this.diffs.length) {
      throw new GameError(GameCoreError.ERROR_INVALID_STATE);
    }

    const checkpointIndexes = Array.from(this.checkpoints.keys())
      .filter(i => i <= position)
      .sort((a, b) => b - a);
    const start = checkpointIndexes[0] ?? 0;
    let data = this.checkpoints.get(start);
    if (data === undefined) {
      data = this.diffs[0];
      let i = 0;
      while (i < position) {
        i++;
        data = this.serializer.applyDiff(data, this.diffs[i]);
      }
      return data;
    }

    let i = start;
    while (i < position) {
      i++;
      data = this.serializer.applyDiff(data, this.diffs[i]);
    }
    return data;
  }
}
