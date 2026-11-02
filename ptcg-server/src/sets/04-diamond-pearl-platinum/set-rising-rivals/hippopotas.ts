import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, SWITCH_OUT_OPPONENT_ACTIVE_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Hippopotas extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +10 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Push Down',
    cost: [C],
    damage: 10,
    text: 'Your opponent switches the Defending Pokémon with 1 of his or her Benched Pokémon.'
  }, {
    name: 'Endeavor',
    cost: [F, C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Flip 2 coins. This attack does 30 damage plus 20 more damage for each heads.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '64';
  public name: string = 'Hippopotas';
  public fullName: string = 'Hippopotas RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Push Down
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SWITCH_OUT_OPPONENT_ACTIVE_POKEMON(store, state, effect.player, { sourceEffect: effect });
    }

    // Endeavor
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage += 20 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
