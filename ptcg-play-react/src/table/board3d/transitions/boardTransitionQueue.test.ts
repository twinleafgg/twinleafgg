import { describe, expect, it } from 'vitest';
import { BoardTransitionQueue } from './boardTransitionQueue';

const tick = (ms = 0) => new Promise<void>((r) => setTimeout(r, ms));

describe('BoardTransitionQueue', () => {
  it('runs states and events strictly in order, one at a time', async () => {
    const log: string[] = [];
    let active = 0;
    const queue = new BoardTransitionQueue<number>({
      async processState(n) {
        active++;
        expect(active).toBe(1);
        log.push(`start ${n}`);
        await tick(5);
        log.push(`end ${n}`);
        active--;
      },
    });
    queue.enqueueState(1);
    queue.enqueueEvent(() => {
      log.push('event');
    });
    queue.enqueueState(2);
    await queue.whenIdle();
    expect(log).toEqual(['start 1', 'end 1', 'event', 'start 2', 'end 2']);
  });

  it('fast-forwards old states without animation when the backlog grows', async () => {
    const seen: [number, boolean][] = [];
    const queue = new BoardTransitionQueue<number>({
      async processState(n, { animate }) {
        seen.push([n, animate]);
        await tick(1);
      },
    });
    for (let i = 1; i <= 5; i++) {
      queue.enqueueState(i);
    }
    await queue.whenIdle();
    // State 1 starts before the backlog exists; state 2 then has 3 states behind it.
    expect(seen).toEqual([
      [1, true],
      [2, false],
      [3, true],
      [4, true],
      [5, true],
    ]);
  });

  it('runs commit hooks after the next state commits', async () => {
    const log: string[] = [];
    const queue = new BoardTransitionQueue<number>({
      async processState(n) {
        log.push(`commit ${n}`);
      },
    });
    queue.runAfterNextCommit(() => log.push('hook'));
    queue.enqueueState(1);
    await queue.whenIdle();
    expect(log).toEqual(['commit 1', 'hook']);
  });

  it('runs a commit hook on its own when no state follows', async () => {
    const log: string[] = [];
    const queue = new BoardTransitionQueue<number>({ async processState() {} });
    queue.runAfterNextCommit(() => log.push('hook'), 10);
    await tick(30);
    await queue.whenIdle();
    expect(log).toEqual(['hook']);
  });

  it('reset marks the in-flight transition stale and drops queued entries', async () => {
    const seen: number[] = [];
    let staleSeen = false;
    const queue = new BoardTransitionQueue<number>({
      async processState(n, { isStale }) {
        seen.push(n);
        await tick(5);
        staleSeen = staleSeen || isStale();
      },
    });
    queue.enqueueState(1);
    queue.enqueueState(2);
    queue.reset();
    await queue.whenIdle();
    expect(seen).toEqual([1]);
    expect(staleSeen).toBe(true);
  });
});
