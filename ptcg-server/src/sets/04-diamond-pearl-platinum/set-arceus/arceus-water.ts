import { State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { AfterDamageEffect, ApplyWeaknessEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ArceusWater extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 90;
  public weakness = [{ type: L }];
  public retreat = [C, C];
  protected _tags = [CardTag.ARCEUS];

  public attacks = [{
    name: 'Fastwave',
    cost: [W, C, C],
    damage: 50,
    shredAttack: true,
    text: "This attack's damage isn't affected by Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.",
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'AR4';
  public name: string = 'Arceus';
  public fullName: string = 'Arceus Water AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fastwave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;

      effect.ignoreResistance = true;
      const applyWeakness = new ApplyWeaknessEffect(effect, 50);
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
