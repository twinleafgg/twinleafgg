import { Rules } from 'ptcg-server';

export interface RuleOption {
  key: keyof Rules;
  label: string;
}

/**
 * Server `Rules` fields exposed as checkboxes when creating a game.
 * Shared by the create/invite dialog and the play-both-sides dialog so both
 * offer the same options.
 */
export const GAME_RULE_OPTIONS: RuleOption[] = [
  { key: 'firstTurnDrawCard', label: 'GAMES_DRAW_CARD_FIRST_TURN' },
  { key: 'firstTurnUseSupporter', label: 'GAMES_PLAY_SUPPORTER_FIRST_TURN' },
  { key: 'attackFirstTurn', label: 'GAMES_ATTACK_FIRST_TURN' },
  { key: 'supporterCleanupAtEndTurn', label: 'GAMES_SUPPORTER_CLEANUP_END_TURN' },
  { key: 'unlimitedEnergyAttachments', label: 'GAMES_UNLIMITED_ENERGY' },
  { key: 'alternativeSetup', label: 'GAMES_ALTERNATIVE_SETUP' },
];
