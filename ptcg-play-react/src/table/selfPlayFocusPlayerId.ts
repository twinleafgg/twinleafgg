import type { State } from 'ptcg-server';

/**
 * Mirrors ptcg-server `promptRequiresSelfPlayFocus` / `selfPlayFocusPlayerId`
 * (kept local so Vite prebundle always resolves).
 */
const NON_FOCUS_PROMPT_TYPES = new Set([
  'WaitPrompt',
  'Shuffle deck',
  'Shuffle prizes',
  'Coin flip',
]);

function promptRequiresSelfPlayFocus(prompt: { type: string; message?: unknown }): boolean {
  if (NON_FOCUS_PROMPT_TYPES.has(prompt.type)) {
    return false;
  }
  if (prompt.type === 'Alert' && prompt.message === 'NOT_YOUR_TURN') {
    return false;
  }
  return true;
}

export function selfPlayFocusPlayerId(state: State): number {
  const pending = state.prompts.find(
    (p) => p.result === undefined && promptRequiresSelfPlayFocus(p),
  );
  if (pending) {
    return pending.playerId;
  }
  const pl = state.players[state.activePlayer];
  if (pl) {
    return pl.id;
  }
  return state.players[0]?.id ?? 0;
}
