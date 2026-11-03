import { Action } from '../actions/action';
import {
  AttachEnergyEffect, PlayPokemonEffect, PlayStadiumEffect,
  PlaySupporterEffect, AttachPokemonToolEffect, PlayItemEffect
} from '../effects/play-card-effects';
import { EnergyCard } from '../card/energy-card';
import { GameError } from '../../game-error';
import { GameMessage } from '../../game-message';
import { PlayCardAction, CardTarget, PlayerType, SlotType } from '../actions/play-card-action';
import { PokemonCard } from '../card/pokemon-card';
import { PokemonCardList } from '../state/pokemon-card-list';
import { State, GamePhase } from '../state/state';
import { StoreLike } from '../store-like';
import { TrainerCard } from '../card/trainer-card';
import { TrainerType, CardTag } from '../card/card-types';
import { assembleDualStadiumFromHand } from '../dual-stadium-utils';
import { assembleDualLegendFromHand } from '../dual-legend-utils';
import { Effect } from '../effects/effect';
import { StateUtils } from '../state-utils';
import { Player } from '../state/player';
import { UsePowerEffect } from '../effects/game-effects';
import { CAN_USE_FROM_HAND_TO_BENCH_POWER } from '../prefabs/prefabs';

function findPokemonTarget(state: State, player: Player, target: CardTarget): PokemonCardList | undefined {
  try {
    return StateUtils.getTarget(state, player, target);
  } catch {
    return undefined;
  }
}

export function playCardReducer(store: StoreLike, state: State, action: Action): State {
  const player = state.players[state.activePlayer];

  if (state.phase === GamePhase.PLAYER_TURN) {

    if (action instanceof PlayCardAction) {
      if (player === undefined || player.id !== action.id) {
        throw new GameError(GameMessage.NOT_YOUR_TURN);
      }

      const handCard = player.hand.cards[action.handIndex];

      if (handCard === undefined) {
        throw new GameError(GameMessage.UNKNOWN_CARD);
      }

      if (handCard instanceof EnergyCard) {
        const target = findPokemonTarget(state, player, action.target);
        if (!(target instanceof PokemonCardList) || target.cards.length === 0) {
          throw new GameError(GameMessage.INVALID_TARGET);
        }

        if (player.usedDragonsWish === true || state.rules.unlimitedEnergyAttachments === true) {
          // Allow multiple energy attachments per turn
          const effect = new AttachEnergyEffect(player, handCard, target);
          return store.reduceEffect(state, effect);
        } else {

          if (player.energyPlayedTurn === state.turn) {
            throw new GameError(GameMessage.ENERGY_ALREADY_ATTACHED);
          }
          player.energyPlayedTurn = state.turn;

          const effect = new AttachEnergyEffect(player, handCard, target);
          return store.reduceEffect(state, effect);
        }
      }

      if (handCard instanceof PokemonCard) {
        const target = findPokemonTarget(state, player, action.target);
        if (!(target instanceof PokemonCardList)) {
          throw new GameError(GameMessage.INVALID_TARGET);
        }

        const benchPower = handCard.powers?.find(p => p.useFromHandToBench === true);
        if (
          benchPower &&
          action.target.slot === SlotType.BENCH &&
          target.cards.length === 0 &&
          CAN_USE_FROM_HAND_TO_BENCH_POWER(store, state, player, handCard)
        ) {
          // Only the ability path when still legal — hand ability locks clear this
          // (same gate as playableCardIds). Otherwise fall through (e.g. sandbox all-basic).
          const usePower = new UsePowerEffect(
            player,
            benchPower,
            handCard,
            { player: PlayerType.BOTTOM_PLAYER, slot: SlotType.HAND, index: action.handIndex },
            target,
          );
          return store.reduceEffect(state, usePower);
        }

        if (handCard.tags.includes(CardTag.DUAL_LEGEND)) {
          if (action.target.slot !== SlotType.BENCH || target.cards.length > 0) {
            throw new GameError(GameMessage.INVALID_TARGET);
          }
          return assembleDualLegendFromHand(store, state, player, handCard);
        }

        const effect = new PlayPokemonEffect(player, handCard, target, action.target.slot, action.target.index);
        return store.reduceEffect(state, effect);
      }

      if (handCard instanceof TrainerCard) {
        const target = findPokemonTarget(state, player, action.target);
        let effect: Effect;
        switch (handCard.trainerType) {
          case TrainerType.SUPPORTER:
            if (state.turn === 1 && handCard.firstTurn !== true) {
              throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
            }
            if (player.supporter.cards.length > 0) {
              throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
            }
            effect = new PlaySupporterEffect(player, handCard, target);
            break;
          case TrainerType.STADIUM: {
            if (handCard.tags.includes(CardTag.DUAL_STADIUM)) {
              return assembleDualStadiumFromHand(store, state, player, handCard);
            }
            const stadium = StateUtils.getStadiumCard(state);
            const isHyperrogueOverPrismTower = handCard.name === 'Hyperrogue Ange Floette' && stadium?.name === 'Prism Tower';
            if (state.rules.oneStadiumPerTurn && player.stadiumPlayedTurn === state.turn && !isHyperrogueOverPrismTower) {
              throw new GameError(GameMessage.STADIUM_ALREADY_PLAYED);
            }
            if (!state.rules.allowSameNameStadium && stadium && stadium.name === handCard.name) {
              throw new GameError(GameMessage.SAME_STADIUM_ALREADY_IN_PLAY);
            }
            player.stadiumPlayedTurn = state.turn;
            effect = new PlayStadiumEffect(player, handCard);
            break;
          }
          case TrainerType.TOOL:
            if (!(target instanceof PokemonCardList)) {
              throw new GameError(GameMessage.INVALID_TARGET);
            }
            effect = new AttachPokemonToolEffect(player, handCard, target);
            break;
          default:
            effect = new PlayItemEffect(player, handCard, target);
            break;
        }
        return store.reduceEffect(state, effect);
      }
      player.hand.moveCardTo(handCard, player.supporter);
    }

  }

  return state;
}
