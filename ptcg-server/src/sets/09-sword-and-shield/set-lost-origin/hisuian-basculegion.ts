import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, EnergyCard, Card, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HisuianBasculegion extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public cardType: CardType[] = [CardType.WATER];
  public hp: number = 110;
  public retreat = [CardType.COLORLESS];
  public weakness = [{ type: CardType.LIGHTNING }];
  public evolvesFrom = 'Hisuian Basculin';

  public attacks = [{
    name: 'Upstream Spirits',
    cost: [],
    damage: 20,
    damageCalculation: 'x',
    text: 'This attack does 20 damage for each basic Energy card in your discard pile. Then, shuffle those cards into your deck.'
  },
  {
    name: 'Water Shot',
    cost: [CardType.WATER],
    damage: 70,
    text: ' Discard an Energy from this Pokémon.'
  }];

  public set: string = 'LOR';
  public setNumber: string = '45';
  public regulationMark: string = 'F';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Hisuian Basculegion';
  public fullName: string = 'Hisuian Basculegion LOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let energyInDiscard: number = 0;
      const blocked: number[] = [];
      const basicEnergyCards: Card[] = [];
      player.discard.cards.forEach((c, index) => {
        const isBasicEnergy = c instanceof EnergyCard && c.energyType === EnergyType.BASIC;
        if (isBasicEnergy) {
          energyInDiscard += 1;
          basicEnergyCards.push(c);
        } else {
          blocked.push(index);
        }
      });

      effect.damage = 20 + (energyInDiscard * 20);

      player.discard.cards.forEach(cards => {
        if (cards instanceof EnergyCard && cards.energyType === EnergyType.BASIC) {
          MOVE_CARDS(store, state, player.discard, player.deck, { cards: basicEnergyCards, sourceCard: this });
        }

      });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
        player.deck.applyOrder(order);
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
    }

    return state;
  }
}