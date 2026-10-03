import { StateUtils } from '../../game/store/state-utils';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { MoveCardsEffect, UseStadiumEffect } from '../../game/store/effects/game-effects';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { GameError, GameMessage, PowerType, SuperType } from '../../game';

// WIP - requires changing nearly everything to use MoveCardsEffect
export class PokemonTower extends TrainerCard {
  protected _trainerType = TrainerType.STADIUM;
  public set = 'PR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '42';
  public name = 'Pokemon Tower';
  public fullName = 'Pokemon Tower PR';
  public text =
    "If the effect of a Pokémon Power, attack, Energy card, or Trainer card would put a card in a discard pile into its owner's hand, that card stays in that discard pile instead.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof MoveCardsEffect && StateUtils.getStadiumCard(state) === this) {
      // Check if the source is in the discard pile of any player and destination is hand
      const isDiscardToHand = state.players.some(
        (player) => effect.source === player.discard && effect.destination === player.hand,
      );

      if (isDiscardToHand) {
        // Only prevent if the effect is from a Pokémon Power, attack, Energy card, or Trainer card
        if (
          effect.sourceEffect &&
          (effect.sourceEffect.powerType === PowerType.POKEMON_POWER ||
            effect.sourceEffect.powerType === PowerType.POKEPOWER ||
            effect.sourceEffect.powerType === PowerType.POKEBODY)
        ) {
          effect.preventDefault = true;
          return state;
        }

        if (
          effect.sourceCard?.attacks.some((attack) => attack.name === effect.sourceEffect?.name)
        ) {
          effect.preventDefault = true;
          return state;
        }

        if (
          effect.sourceCard instanceof TrainerCard ||
          effect.sourceCard?.superType === SuperType.ENERGY
        ) {
          effect.preventDefault = true;
          return state;
        }
      }

      return state;
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
