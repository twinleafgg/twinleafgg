import { GameMessage } from '../game-message';
import { State } from '../store/state/state';

/**
 * Prompt types that never need a human decision. Self-play must not swap seats
 * for these (silent animation gates, arbiter shuffles/flips). Interactive
 * prompts (Choose*, Confirm, Select, energy/damage movers) still steal focus.
 */
const NON_FOCUS_PROMPT_TYPES = new Set([
  'WaitPrompt',
  'Shuffle deck',
  'Shuffle prizes',
  'Coin flip',
]);

/** True when an unresolved prompt should move the self-play seat to its owner. */
export function promptRequiresSelfPlayFocus(prompt: { type: string; message?: unknown }): boolean {
  if (NON_FOCUS_PROMPT_TYPES.has(prompt.type)) {
    return false;
  }
  // Sanitizer placeholder for someone else's prompt — not a real decision.
  if (prompt.type === 'Alert' && prompt.message === GameMessage.NOT_YOUR_TURN) {
    return false;
  }
  return true;
}

/** First unresolved interactive prompt's player, else active turn player (same rule client + server). */
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
