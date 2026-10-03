import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';

export class Moltres extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.FIRE];
  public hp: number = 120;
  public weakness = [{ type: CardType.LIGHTNING }];
  public resistance = [{ type: CardType.FIGHTING, value: -20 }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [{
    name: 'Top Burner',
    cost: [CardType.FIRE],
    damage: 0,
    text: 'Discard all [R] Energy from this Pokémon. Then, discard a card from the top of your opponent\'s deck for each Energy you discarded in this way.'
  },
  {
    name: 'Fire Spin',
    cost: [CardType.FIRE, CardType.FIRE, CardType.FIRE, CardType.COLORLESS],
    damage: 180,
    text: 'Discard 3 Energy from this Pokémon. '
  }];

  public set: string = 'TEU';
  public setNumber: string = '19';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Moltres';
  public fullName: string = 'Moltres TEU';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      const totalFirenergy = checkProvidedEnergy.energyMap.reduce((sum, energy) => {
        return sum + energy.provides.filter(type => type === CardType.FIRE || type === CardType.ANY).length;
      }, 0);

      let totalDiscarded = 0;

      //Puts all fire energy into cards
      const cards: Card[] = [];
      for (const energyMap of checkProvidedEnergy.energyMap) {
        const energy = energyMap.provides.filter(t => t === CardType.FIRE || t === CardType.ANY);
        if (energy.length > 0) {
          cards.push(energyMap.card);
        }
      }

      //Discards all cards in cards array
      const discardEnergy = new DiscardCardsEffect(effect, cards);
      discardEnergy.target = player.active;

      //Number of cards discarded
      totalDiscarded += totalFirenergy;
      store.reduceEffect(state, discardEnergy);

      MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: totalDiscarded, sourceCard: this });

    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 3);
    }

    return state;
  }
}