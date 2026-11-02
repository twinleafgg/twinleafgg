import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Ledian extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Ledyba';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Quick Draw',
    cost: [G],
    damage: 10,
    text: 'Draw 3 cards.'
  },
  {
    name: 'Swift',
    cost: [C, C],
    damage: 40,
    text: 'This attack\'s damage isn\'t affected by Weakness, Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Ledian';
  public fullName: string = 'Ledian HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Quick Draw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS(store, state, effect.player, 3);
    }

    // Swift
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage = 0;
      effect.opponent.active.damage += 40;
      const afterDamage = new AfterDamageEffect(effect, 40);
      afterDamage.target = effect.opponent.active;
      store.reduceEffect(state, afterDamage);
    }

    return state;
  }
}
