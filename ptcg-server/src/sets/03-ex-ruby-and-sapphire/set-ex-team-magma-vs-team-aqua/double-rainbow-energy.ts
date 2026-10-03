import { GameError, GameMessage, PlayerType, StoreLike, State } from '../../../game';
import { CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class DoubleRainbowEnergy extends EnergyCard {

  public provides: CardType[] = [CardType.COLORLESS];
  public energyType = EnergyType.SPECIAL;
  public set: string = 'MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '88';
  public name = 'Double Rainbow Energy';
  public fullName = 'Double Rainbow Energy MA';

  public text: string = 'Double Rainbow Energy can be attached only to an Evolved Pokémon (excluding Pokémon-ex). While in play, Double Rainbow Energy provides every type of Energy but provides 2 Energy at a time. (Doesn\'t count as a basic Energy when not in play and has no effect other than providing Energy.) Damage done to your opponent\'s Pokémon by the Pokémon Double Rainbow Energy is attached to is reduced by 10 (after applying Weakness and Resistance). When the Pokémon Double Rainbow Energy is attached to is no longer an Evolved Pokémon, discard Double Rainbow Energy.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Cannot attach to basic or ex
    if (effect instanceof AttachEnergyEffect && effect.energyCard === this) {
      const attachedTo = effect.target.getPokemonCard();

      if (!!attachedTo && effect.target.getPokemons().length <= 1) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Reduce damage done to opponent's Pokemon by 10
    if ((effect instanceof DealDamageEffect) && effect.source.cards.includes(this) && effect.target === effect.opponent.active) {
      effect.damage -= 10;
    } else if (effect instanceof PutDamageEffect && effect.source.cards.includes(this) && effect.target !== effect.opponent.active) {
      // Reduction not only on active
      effect.damage -= 10;
    }

    // Provide energy 
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      effect.energyMap.push({ card: this, provides: [CardType.ANY, CardType.ANY] });
    }

    // Discard card when not attached to Evolved Pokemon or pokemon-ex
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach(player => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (!cardList.cards.includes(this)) {
            return;
          }

          const attachedTo = cardList.getPokemonCard();

          if (!!attachedTo && cardList.getPokemons().length <= 1) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
      return state;
    }
    return state;
  }
}