/** When more than this many states wait behind the current one, older ones commit without animating. */
export const BOARD_TRANSITION_MAX_BACKLOG = 3;

export interface ProcessStateOptions {
  /** False when fast-forwarding a backlog: commit the state without flights. */
  animate: boolean;
  /** True once a reset superseded this run; stop animating and return. */
  isStale: () => boolean;
}

export interface BoardTransitionQueueHandlers<T> {
  processState(payload: T, options: ProcessStateOptions): Promise<void>;
  onError?(error: unknown): void;
}

type Entry<T> =
  | { kind: 'state'; seq: number; payload: T }
  | { kind: 'event'; run: () => Promise<void> | void; droppable: boolean };

interface CommitHook {
  afterSeq: number;
  run: () => void;
  done: boolean;
}

/**
 * Serializes board transitions: each server state (and ordering-sensitive board events)
 * runs to completion before the next one starts, so animations never overlap or reorder.
 */
export class BoardTransitionQueue<T> {
  private entries: Entry<T>[] = [];
  private running = false;
  private generation = 0;
  private enqueuedSeq = 0;
  private committedSeq = 0;
  private hooks: CommitHook[] = [];
  private idleWaiters: (() => void)[] = [];

  constructor(private readonly handlers: BoardTransitionQueueHandlers<T>) {}

  enqueueState(payload: T): void {
    this.entries.push({ kind: 'state', seq: ++this.enqueuedSeq, payload });
    this.drain();
  }

  /**
   * Run `run` in FIFO order with states. Droppable events are skipped when the
   * queue fast-forwards past them.
   */
  enqueueEvent(run: () => Promise<void> | void, options: { droppable?: boolean } = {}): void {
    this.entries.push({ kind: 'event', run, droppable: options.droppable ?? true });
    this.drain();
  }

  /**
   * Run `run` right after the next state enqueued from now on has committed. Socket animation
   * events usually arrive just before the state that contains their mesh. If no state follows
   * within `fallbackMs`, the hook runs in FIFO order instead.
   */
  runAfterNextCommit(run: () => void, fallbackMs = 250): void {
    const hook: CommitHook = { afterSeq: this.enqueuedSeq, run, done: false };
    this.hooks.push(hook);
    globalThis.setTimeout(() => {
      if (hook.done || this.enqueuedSeq > hook.afterSeq) {
        return;
      }
      this.enqueueEvent(() => this.fireHook(hook));
    }, fallbackMs);
  }

  /** Drop everything queued and invalidate the in-flight transition. */
  reset(): void {
    this.generation++;
    this.entries = [];
    for (const hook of this.hooks) {
      this.fireHook(hook);
    }
    this.hooks = [];
  }

  isBusy(): boolean {
    return this.running || this.entries.length > 0;
  }

  whenIdle(): Promise<void> {
    if (!this.isBusy()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private fireHook(hook: CommitHook): void {
    if (hook.done) {
      return;
    }
    hook.done = true;
    try {
      hook.run();
    } catch (error) {
      this.handlers.onError?.(error);
    }
  }

  private runCommitHooks(seq: number): void {
    const ready = this.hooks.filter((h) => !h.done && h.afterSeq < seq);
    this.hooks = this.hooks.filter((h) => !h.done && h.afterSeq >= seq);
    for (const hook of ready) {
      this.fireHook(hook);
    }
  }

  private statesQueued(): number {
    let n = 0;
    for (const e of this.entries) {
      if (e.kind === 'state') {
        n++;
      }
    }
    return n;
  }

  private drain(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    void this.loop();
  }

  private async loop(): Promise<void> {
    try {
      while (this.entries.length > 0) {
        const entry = this.entries.shift()!;
        const gen = this.generation;
        const isStale = () => gen !== this.generation;
        const fastForward = this.statesQueued() >= BOARD_TRANSITION_MAX_BACKLOG;
        try {
          if (entry.kind === 'event') {
            if (fastForward && entry.droppable) {
              continue;
            }
            await entry.run();
            continue;
          }
          await this.handlers.processState(entry.payload, { animate: !fastForward, isStale });
          if (!isStale()) {
            this.committedSeq = entry.seq;
            this.runCommitHooks(entry.seq);
          }
        } catch (error) {
          this.handlers.onError?.(error);
        }
      }
    } finally {
      this.running = false;
      const waiters = this.idleWaiters;
      this.idleWaiters = [];
      for (const w of waiters) {
        w();
      }
    }
  }

  getCommittedSeq(): number {
    return this.committedSeq;
  }
}
