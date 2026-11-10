import type { Rules } from 'ptcg-server';

export interface GameRuleOption {
  key: keyof Rules;
  labelKey: string;
}

/**
 * Server `Rules` fields exposed as checkboxes when creating a game.
 * Mirrors the Angular list in `ptcg-play/src/app/games/game-rules.ts` so the
 * invite dialog and the play-both-sides dialog offer the same options.
 */
export const GAME_RULE_OPTIONS: GameRuleOption[] = [
  { key: 'firstTurnDrawCard', labelKey: 'GAMES_DRAW_CARD_FIRST_TURN' },
  { key: 'firstTurnUseSupporter', labelKey: 'GAMES_PLAY_SUPPORTER_FIRST_TURN' },
  { key: 'attackFirstTurn', labelKey: 'GAMES_ATTACK_FIRST_TURN' },
  { key: 'supporterCleanupAtEndTurn', labelKey: 'GAMES_SUPPORTER_CLEANUP_END_TURN' },
  { key: 'unlimitedEnergyAttachments', labelKey: 'GAMES_UNLIMITED_ENERGY' },
  { key: 'alternativeSetup', labelKey: 'GAMES_ALTERNATIVE_SETUP' },
  { key: 'confusedRetreatFlip', labelKey: 'GAMES_CONFUSED_RETREAT_FLIP' },
  { key: 'oneRetreatPerTurn', labelKey: 'GAMES_ONE_RETREAT_PER_TURN' },
  { key: 'oneStadiumPerTurn', labelKey: 'GAMES_ONE_STADIUM_PER_TURN' },
  { key: 'allowSameNameStadium', labelKey: 'GAMES_ALLOW_SAME_NAME_STADIUM' },
  { key: 'canStartWithFossil', labelKey: 'GAMES_CAN_START_WITH_FOSSIL' },
  { key: 'oldBurnRule', labelKey: 'GAMES_OLD_BURN_RULE' },
  { key: 'mutantEvolution', labelKey: 'GAMES_MUTANT_EVOLUTION' },
];
