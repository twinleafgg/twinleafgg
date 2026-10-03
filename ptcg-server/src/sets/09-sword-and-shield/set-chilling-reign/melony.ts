import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  AttachEnergyPrompt,
  CardTarget,
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Melony extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'CRE';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '146';

  public regulationMark = 'E';

  public name: string = 'Melony';

  public fullName: string = 'Melony CRE';

  public text: string =
    'Attach a [W] Energy card from your discard pile to 1 of your Pokémon V. If you do, draw 3 cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      // Check if there's Water Energy in discard
      const hasWaterEnergyInDiscard = player.discard.cards.some(
        (c) =>
          c.superType === SuperType.ENERGY &&
          c.energyType === EnergyType.BASIC &&
          c.name === 'Water Energy',
      );

      if (!hasWaterEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Check if player has any Pokemon V/VSTAR/VMAX in play
      let hasValidTarget = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (
          card.hasTag(CardTag.POKEMON_V) ||
          card.hasTag(CardTag.POKEMON_VSTAR) ||
          card.hasTag(CardTag.POKEMON_VMAX) ||
          card.hasTag(CardTag.POKEMON_VUNION)
        ) {
          hasValidTarget = true;
        }
      });

      if (!hasValidTarget) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Block targets that aren't V/VSTAR/VMAX
      const blockedTargets: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (
          !card.hasTag(CardTag.POKEMON_V) &&
          !card.hasTag(CardTag.POKEMON_VSTAR) &&
          !card.hasTag(CardTag.POKEMON_VMAX) &&
          !card.hasTag(CardTag.POKEMON_VUNION)
        ) {
          blockedTargets.push(target);
        }
      });

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { min: 1, max: 1, blocked: blockedTargets },
        ),
        (chosen) => {
          if (!chosen || chosen.length === 0) {
            return state;
          }

          const blockedTo: CardTarget[] = [];
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
            if (!chosen.includes(list)) {
              blockedTo.push(target);
            }
          });

          state = store.prompt(
            state,
            new AttachEnergyPrompt(
              player.id,
              GameMessage.ATTACH_ENERGY_CARDS,
              player.discard,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.BENCH, SlotType.ACTIVE],
              { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
              { allowCancel: false, min: 1, max: 1, blockedTo: blockedTo },
            ),
            (transfers) => {
              if (!transfers || transfers.length === 0) {
                return state;
              }

              // Attach the energy
              const transfer = transfers[0];
              const targetList = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, player.discard, targetList, {
                cards: [transfer.card],
                sourceCard: this,
                sourceEffect: effect,
              });

              // Draw 3 cards
              DRAW_CARDS(store, state, player, 3);
            },
          );
        },
      );
    }

    return state;
  }
}
