import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_SURVIVES_ON_TEN_HP_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { COIN_FLIP_PROMPT, THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Shieldon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Armor Fossil';
  public hp: number = 80;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Endure',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, during your opponent\'s next turn, if Shieldon would be Knocked Out by damage from an attack, Shieldon is not Knocked Out and its remaining HP becomes 10 instead.'
  }, {
    name: 'Rock Slide',
    cost: [M, C],
    damage: 30,
    text: 'Does 10 damage to 2 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '62';
  public name: string = 'Shieldon';
  public fullName: string = 'Shieldon PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Endure
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          THIS_POKEMON_SURVIVES_ON_TEN_HP_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
        }
      });
    }

    // Rock Slide
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const benchedCount = opponent.bench.filter(b => b.cards.length > 0).length;
      if (benchedCount === 0) {
        return state;
      }
      const count = Math.min(2, benchedCount);
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state, count, count);
    }

    return state;
  }
}
