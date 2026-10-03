/** Draw-supporter animation gates — Angular has no hand/deck flights, so skip the wait. */
export const SKIP_WAIT_MESSAGES = new Set([
  'Hand to deck animation',
  'Deck shuffle animation',
]);

/**
 * Matches ptcg-server `promptRequiresSelfPlayFocus`: these do not move the self-play seat.
 * Kept local so the waiting overlay does not depend on a rebuilt server package export.
 */
const NON_FOCUS_PROMPT_TYPES = new Set([
  'WaitPrompt',
  'Shuffle deck',
  'Shuffle prizes',
  'Coin flip',
]);

export function promptRequiresSelfPlayFocus(prompt: { type: string; message?: unknown }): boolean {
  if (NON_FOCUS_PROMPT_TYPES.has(prompt.type)) {
    return false;
  }
  if (prompt.type === 'Alert' && prompt.message === 'NOT_YOUR_TURN') {
    return false;
  }
  return true;
}

/** Opponent waits the single self-play client must clear without swapping seats. */
export function isSelfPlayBackgroundWait(prompt: {
  type: string;
  message?: unknown;
  showVisual?: boolean;
}): boolean {
  if (prompt.type !== 'WaitPrompt') {
    return false;
  }
  const message = prompt.message != null ? String(prompt.message) : '';
  if (message && SKIP_WAIT_MESSAGES.has(message)) {
    return true;
  }
  return prompt.showVisual === false;
}

export function selfPlayBackgroundWaitDelayMs(prompt: {
  type: string;
  message?: unknown;
  duration?: number;
}): number {
  const message = prompt.message != null ? String(prompt.message) : '';
  if (message && SKIP_WAIT_MESSAGES.has(message)) {
    return 0;
  }
  return prompt.duration != null && prompt.duration > 0 ? prompt.duration : 0;
}
