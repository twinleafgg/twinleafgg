import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Raichu extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Pikachu';
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Boosted Voltage',
    cost: [L],
    damage: 20,
    text: 'If Raichu has a Pokémon Tool card attached to it, this attack does 20 damage to each of your opponent\'s Benched Pokémon that isn\'t an Evolved Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Thunder Blast',
    cost: [L, C, C],
    damage: 70,
    text: 'Discard a Lightning Energy card attached to Raichu.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '27';
  public name: string = 'Raichu';
  public fullName: string = 'Raichu AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Boosted Voltage
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.source.tools.length > 0) {
        effect.opponent.bench.forEach(target => {
          if (target.cards.length > 0 && target.getPokemons().length < 2) {
            const damageEffect = new PutDamageEffect(effect, 20);
            damageEffect.target = target;
            store.reduceEffect(state, damageEffect);
          }
        });
      }
    }

    // Thunder Blast
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1, L);
    }

    return state;
  }
}
