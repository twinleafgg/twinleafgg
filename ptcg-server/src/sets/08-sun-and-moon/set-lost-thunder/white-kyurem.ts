import { StateUtils } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class WhiteKyurem extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.WATER];

  public hp: number = 130;

  public weakness = [{ type: CardType.METAL }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [{
    name: 'Field Crush',
    cost: [CardType.COLORLESS, CardType.COLORLESS],
    damage: 30,
    text: 'If your opponent has a Stadium card in play, discard it.'
  }, {
    name: 'Freezing Flames',
    cost: [CardType.WATER, CardType.WATER, CardType.COLORLESS],
    damage: 80,
    damageCalculation: '+',
    text: 'If this Pokémon has any [R] Energy attached to it, this attack does 80 more damage.'
  }];

  public set: string = 'LOT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '63';

  public name: string = 'White Kyurem';

  public fullName: string = 'White Kyurem LOT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);

      if (!stadiumCard) {
        return state;
      }

      const stadiumCardList = StateUtils.findCardList(state, stadiumCard);
      const owner = StateUtils.findOwner(state, stadiumCardList);

      if (stadiumCard !== undefined && owner !== effect.player) {
        const cardList = StateUtils.findCardList(state, stadiumCard);
        const player = StateUtils.findOwner(state, cardList);
        MOVE_CARDS(store, state, cardList, player.discard, { sourceCard: this });
        return state;
      }

      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergy);

      const hasFireEnergy = checkProvidedEnergy.energyMap.some(e => e.provides.includes(CardType.ANY) || e.provides.includes(CardType.FIRE));

      if (hasFireEnergy) {
        effect.damage += 80;
      }

      return state;
    }
    return state;
  }
}

