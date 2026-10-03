import { GameError } from '../../game-error';
import { GameMessage } from '../../game-message';
import { Card } from '../card/card';
import { TrainerCard } from '../card/trainer-card';
import { Format, TrainerType, CardTag } from '../card/card-types';
import { Effect } from '../effects/effect';
import { TrainerEffect } from '../effects/play-card-effects';
import { ChooseCardsPrompt } from '../prompts/choose-cards-prompt';
import { ShowCardsPrompt } from '../prompts/show-cards-prompt';
import { ShuffleDeckPrompt } from '../prompts/shuffle-prompt';
import { canPlayDualStadium } from '../dual-stadium-utils';
import { getOverriddenCanPlay } from '../card/card-effect-overrides';
import { StateUtils } from '../state-utils';
import { Player } from '../state/player';
import { State, GamePhase } from '../state/state';
import { Store } from '../store';
import { StoreLike } from '../store-like';
import { PlayerType } from '../actions/play-card-action';
import { MOVE_CARDS, IS_ABILITY_BLOCKED } from './prefabs';

export {
  IS_TRAINER_TARGET,
  BLOCK_TRAINER_TARGET,
  TRAINER_TARGET_BLOCKED,
  WAS_TRAINER_TARGET_BLOCKED,
} from './trainer-target';

// =============================================================================
// Type guards
// =============================================================================

export function WAS_TRAINER_USED(effect: Effect, card: TrainerCard): effect is TrainerEffect {
  return effect instanceof TrainerEffect && effect.trainerCard === card;
}

/**
 * Temporarily route interactive prompts to `controllerId` while keeping board
 * perspective on the prompt's original player (see Store.prompt remap).
 * Restores the previous controller after nested prompts settle.
 */
export function WITH_PROMPT_CONTROLLER(
  store: StoreLike,
  state: State,
  controllerId: number,
  run: (state: State) => State
): State {
  const previous = state.promptControllerId;
  state.promptControllerId = controllerId;
  state = run(state);

  const restore = () => {
    state.promptControllerId = previous;
  };

  if (store.hasPrompts()) {
    return store.waitPrompt(state, restore);
  }

  restore();
  return state;
}

// =============================================================================
// Hand discard
// =============================================================================

export function DISCARD_X_CARDS_FROM_YOUR_HAND(effect: TrainerEffect, store: StoreLike, state: State, minAmount: number, maxAmount: number) {

  const player = effect.player;

  let cards: Card[] = [];
  cards = player.hand.cards.filter(c => c !== effect.trainerCard);

  const hasCardInHand = player.hand.cards.some(c => {
    return c instanceof Card;
  });
  if (!hasCardInHand) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (cards.length == maxAmount) {
    MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: effect.trainerCard });
  }

  if (cards.length > maxAmount) {
    state = store.prompt(state, new ChooseCardsPrompt(
      effect.player,
      GameMessage.CHOOSE_CARD_TO_DISCARD,
      player.hand,
      {},
      { allowCancel: false, min: minAmount, max: maxAmount }
    ), cards => {
      cards = cards || [];
      if (cards.length === 0) {
        return;
      }
      MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: effect.trainerCard });
    });
  }
}

// =============================================================================
// Reveal & shuffle
// =============================================================================

export function TRAINER_SHOW_OPPONENT_CARDS(effect: TrainerEffect, store: Store, state: State) {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  const cards: Card[] = [];
  if (cards.length > 0) {
    store.prompt(state, new ShowCardsPrompt(
      opponent.id,
      GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
      cards
    ), () => { });
  }
}

export function SHUFFLE_DECK(effect: TrainerEffect, store: Store, state: State) {
  const player = effect.player;
  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

// =============================================================================
// Supporter cleanup & play-card guards
// =============================================================================

export function CLEAN_UP_SUPPORTER(store: StoreLike, effect: TrainerEffect, player: Player) {
  const format = (store as any).handler.format;
  if (
    !(format === Format.RSPK || format === Format.RETRO) ||
    effect.trainerCard.trainerType !== TrainerType.SUPPORTER
  ) {
    player.supporter.moveCardTo(effect.trainerCard, player.discard);
  }
}

/**
 * Validates if a supporter card can be played under current game conditions
 * @param store The store instance
 * @param state The current game state
 * @param player The player attempting to play the card
 * @param trainerCard The supporter card to validate
 * @param bypassSupporterTurn If true, temporarily bypasses the supporterTurn check (for abilities that copy supporters)
 * @returns true if the card can be played, false otherwise
 */
export function CAN_PLAY_SUPPORTER_CARD(
  store: StoreLike,
  state: State,
  player: Player,
  trainerCard: TrainerCard,
  bypassSupporterTurn: boolean = false,
): boolean {
  try {
    // Store original supporterTurn value if bypassing
    const originalSupporterTurn = bypassSupporterTurn ? player.supporterTurn : undefined;

    // Temporarily set supporterTurn to 0 if bypassing the check
    if (bypassSupporterTurn) {
      player.supporterTurn = 0;
    }

    try {
      // Create a temporary TrainerEffect to test if the card can be played
      const testEffect = new TrainerEffect(player, trainerCard);

      // Try to reduce the effect to see if it throws an error
      // We need to catch the error to prevent the game from crashing
      try {
        store.reduceEffect(state, testEffect);
        return true;
      } catch (error) {
        return false;
      }
    } finally {
      // Restore original supporterTurn value if we bypassed it
      if (bypassSupporterTurn && originalSupporterTurn !== undefined) {
        player.supporterTurn = originalSupporterTurn;
      }
    }
  } catch (error) {
    return false;
  }
}

/**
 * Validates if a trainer card can be played under current game conditions
 * Dynamically checks by attempting to execute the card's logic and catching GameError
 * @param store The store instance
 * @param state The current game state
 * @param player The player attempting to play the card
 * @param trainerCard The trainer card to validate
 * @returns true if the card can be played, false otherwise
 */
export function CAN_PLAY_TRAINER_CARD(
  store: StoreLike,
  state: State,
  player: Player,
  trainerCard: TrainerCard,
): boolean {
  try {
    // Only check during player's turn
    if (
      state.phase !== GamePhase.PLAYER_TURN ||
      state.players[state.activePlayer].id !== player.id
    ) {
      return false;
    }

    // Check basic trainer type restrictions first (fast path)
    switch (trainerCard.trainerType) {
      case TrainerType.SUPPORTER:
        // Can't play supporter on turn 1 unless card allows it
        if (state.turn === 1 && !trainerCard.firstTurn) {
          return false;
        }
        // Can't play supporter if one already played this turn
        // Check supporterTurn (incremented when supporter is played) and supporter.cards (card in play area)
        if (player.supporterTurn > 0) {
          return false;
        }
        break;
      case TrainerType.STADIUM: {
        if (trainerCard.tags.includes(CardTag.DUAL_STADIUM)) {
          return canPlayDualStadium(store, state, player, trainerCard);
        }
        const stadium = StateUtils.getStadiumCard(state);
        const isHyperrogueOverPrismTower =
          trainerCard.name === 'Hyperrogue Ange Floette' && stadium?.name === 'Prism Tower';
        // Can't play stadium if one already played this turn (unless Hyperrogue Ange Floette over Prism Tower)
        if (player.stadiumPlayedTurn === state.turn && !isHyperrogueOverPrismTower) {
          return false;
        }
        // Can't play same stadium already in play
        if (stadium && stadium.name === trainerCard.name) {
          return false;
        }
        break;
      }
      case TrainerType.TOOL: {
        // Cards with canPlay (e.g. tools that attach to opponent's Pokemon) use that instead
        if (!trainerCard.canPlay) {
          let canAttachTool = false;
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, pokemonCard, target) => {
            if (Array.isArray(cardList.tools) && cardList.tools.length < pokemonCard.maxTools) {
              canAttachTool = true;
            }
          });
          if (!canAttachTool) {
            return false;
          }
        }
        break;
      }
      // Items have no basic restrictions beyond being in player's turn
    }

    // Check for Item/Tool blocking effects directly (no cloning needed)
    if (trainerCard.trainerType === TrainerType.ITEM) {
      // Check for ability-based blocks (Jellicent ex, etc.)
      const opponent = StateUtils.getOpponent(state, player);
      const opponentActive = opponent.active.getPokemonCard();
      if (opponentActive && opponentActive.name === 'Jellicent ex') {
        // Check if ability is blocked
        if (!IS_ABILITY_BLOCKED(store, state, opponent, opponentActive)) {
          return false; // Blocked by ability
        }
      }

      if (player.cannotPlayItemCards) {
        return false;
      }
    }

    if (trainerCard.trainerType === TrainerType.TOOL) {
      // Check for ability-based blocks (Jellicent ex, etc.)
      const opponent = StateUtils.getOpponent(state, player);
      const opponentActive = opponent.active.getPokemonCard();
      if (opponentActive && opponentActive.name === 'Jellicent ex') {
        // Check if ability is blocked
        if (!IS_ABILITY_BLOCKED(store, state, opponent, opponentActive)) {
          return false; // Blocked by ability
        }
      }

      if (player.cannotPlayToolCards) {
        return false;
      }
    }

    if (trainerCard.trainerType === TrainerType.SUPPORTER) {
      if (player.cannotPlaySupporterCards) {
        return false;
      }
    }

    if (trainerCard.trainerType === TrainerType.STADIUM) {
      if (player.cannotPlayStadiumCards) {
        return false;
      }
    }

    // Prefer format-overridden canPlay (same print routing as reduceEffect), then instance canPlay
    const format = state.gameSettings?.format ?? Format.NONE;
    const canPlayFn =
      getOverriddenCanPlay(trainerCard, format) ??
      (trainerCard.canPlay ? trainerCard.canPlay.bind(trainerCard) : undefined);
    if (canPlayFn) {
      const canPlayResult = canPlayFn(store, state, player);
      if (canPlayResult !== undefined) {
        return canPlayResult;
      }
    }

    // If canPlay is not implemented or returns undefined
    // For Tool and Stadium cards, if we've passed all basic checks, return true
    // (Stadium checks already done: stadiumPlayedTurn, same-name stadium in play)
    if (trainerCard.trainerType === TrainerType.TOOL) {
      return true; // Tool cards can be played if Pokemon can accept them
    }
    if (trainerCard.trainerType === TrainerType.STADIUM) {
      return true; // Stadiums are playable unless already played one this turn (checked above)
    }
    // For other trainer types, err on the side of caution
    // We can't validate card-specific requirements without canPlay
    return false;
  } catch (error) {
    return false;
  }
}

