import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DEFENDING_POKEMON_RETREAT_COSTS_MORE } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Relicanth2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Deep Sea Pressure',
    cost: [F, C],
    damage: 20,
    text: 'During your opponent\'s next turn, the Defending Pokémon\'s Retreat Cost is ColorlessColorless more.'
  }, {
    name: 'Aqua Wave',
    cost: [F, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Flip 2 coins. This attack does 40 damage plus 10 more damage for each heads.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH8';
  public name: string = 'Relicanth';
  public fullName: string = 'Relicanth SV2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Deep Sea Pressure
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DEFENDING_POKEMON_RETREAT_COSTS_MORE(store, state, effect, 2);
    }

    // Aqua Wave
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage += 10 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
