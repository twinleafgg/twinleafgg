/** Shared board animation durations — keep in sync with WaitPrompt timings on the server. */

/** Attack bounce on the attacking Pokémon (React 3D GSAP / 2D CSS). */
export const BOARD_ATTACK_ANIMATION_DURATION_SEC = 1.35;

/** Ability activation spotlight / pulse. */
export const BOARD_ABILITY_ANIMATION_DURATION_SEC = 0.9;

/** Evolution Y-spin + flash. */
export const BOARD_EVOLUTION_ANIMATION_DURATION_SEC = 1.5;

/** Basic Pokémon drop-in. */
export const BOARD_BASIC_ANIMATION_DURATION_SEC = 0.5;

/** Attack particle burst on the defending Pokémon. */
export const BOARD_ATTACK_EFFECT_DURATION_MS = 1500;

/** Delay before showing trainer-effect prompts after a trainer is played. */
export const TRAINER_PLAY_EFFECT_PROMPT_DELAY_MS = 650;

/** Delay after KO discard before choose-prize prompt. */
export const KO_TO_PRIZE_PROMPT_DELAY_MS = 350;

/** Coin flip animation — keep in sync with server COIN_FLIP_ANIMATION_WAIT_MS. */
export const BOARD_COIN_FLIP_SERVER_WAIT_MS = 2000;

/** Deck shuffle animation — keep in sync with server DECK_SHUFFLE_ANIMATION_WAIT_MS. */
export const BOARD_DECK_SHUFFLE_SERVER_WAIT_MS = 650;

/**
 * Client-only safety fallback when a hand→deck WaitPrompt arrives before the
 * board animation promise is registered (server uses BOARD_ANIMATION_GATE_TIMEOUT_MS).
 */
export const BOARD_HAND_TO_DECK_WAIT_FALLBACK_MS = 2500;

/**
 * Client-only safety fallback for draw WaitPrompts (e.g. Jellicent).
 * Multi-draw length is owned by the 3D hand sync, not the server card.
 */
export const BOARD_DRAW_WAIT_FALLBACK_MS = 3500;
