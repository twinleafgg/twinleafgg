import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { ApplyWeaknessEffect, AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Rayquaza extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 120;

  public weakness = [{ type: CardType.DRAGON }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Dragon Pulse',
      cost: [CardType.LIGHTNING],
      damage: 40,
      text: 'Discard the top 2 cards of your deck.'
    },
    {
      name: 'Shred',
      cost: [CardType.FIRE, CardType.LIGHTNING, CardType.COLORLESS],
      damage: 90,
      text: 'This attack\'s damage isn\'t affected by any effects on ' +
        'the Defending Pokemon.'
    }
  ];

  public set: string = 'DRV';

  public name: string = 'Rayquaza';

  public fullName: string = 'Rayquaza DRV';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '11';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.discard, { count: 2, sourceCard: this });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const applyWeakness = new ApplyWeaknessEffect(effect, 90);
      store.reduceEffect(state, applyWeakness);
      const damage = applyWeakness.damage;

      effect.damage = 0;

      if (damage > 0) {
        opponent.active.damage += damage;
        const afterDamage = new AfterDamageEffect(effect, damage);
        state = store.reduceEffect(state, afterDamage);
      }
    }

    return state;
  }

}
