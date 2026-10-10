import type { LocalGameState } from './types/localGameState';
import { captureSnapshot } from './board3d/transitions/boardSnapshot';
import { planTransition } from './board3d/transitions/planTransition';

function hasChoosePrizePrompt(game: LocalGameState): boolean {
  return (game.state.prompts ?? []).some((p) => p.type === 'Choose prize');
}

/**
 * True when this state change both introduces a Choose prize prompt and will play a
 * board KO ghost flight. Used to suppress the prize UI in the same React turn so it
 * does not flash before the 3D board sets {@code onKoSequenceActiveChange(true)}.
 */
export function shouldSuppressChoosePrizeForKoAnimation(
  prev: LocalGameState | null | undefined,
  next: LocalGameState,
): boolean {
  if (!prev || !hasChoosePrizePrompt(next)) {
    return false;
  }
  if (hasChoosePrizePrompt(prev)) {
    const prevIds = new Set(
      (prev.state.prompts ?? []).filter((p) => p.type === 'Choose prize').map((p) => p.id),
    );
    const hasNew = (next.state.prompts ?? []).some(
      (p) => p.type === 'Choose prize' && !prevIds.has(p.id),
    );
    if (!hasNew) {
      return false;
    }
  }

  const snapOpts = {
    omniscient: !!next.replay || !!prev.replay,
    handIdsReal: () => true,
  };
  const prevSnap = captureSnapshot(prev.state, snapOpts);
  const nextSnap = captureSnapshot(next.state, snapOpts);
  const plan = planTransition(prevSnap, nextSnap);
  return plan.steps.some((s) => s.kind === 'boardGhostToPile');
}
