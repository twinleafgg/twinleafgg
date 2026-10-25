import { PokemonCard, pokemonHasCardType } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';

export class Charizard extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Charmeleon';
  public hp: number = 140;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +30 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Fire Formation',
    powerType: PowerType.POKEBODY,
    text: 'Each of Charizard\'s attacks does 10 more damage for each [R] Pokémon on your Bench to your opponent\'s Active Pokémon (before applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Fire Wing',
    cost: [R],
    damage: 30,
    text: ''
  }, {
    name: 'Burning Tail',
    cost: [R, R, C],
    damage: 80,
    text: 'Discard a Fire Energy attached to Charizard.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Charizard';
  public fullName: string = 'Charizard AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fire Formation
    if (WAS_ATTACK_USED(effect, 0, this) || WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      if (!IS_POKEBODY_BLOCKED(store, state, player, this)) {
        let firePokemonCount = 0;
        player.bench.forEach(bench => {
          const pokemon = bench.getPokemonCard();
          if (pokemon !== undefined && pokemonHasCardType(pokemon, CardType.FIRE)) {
            firePokemonCount++;
          }
        });
        effect.damage += 10 * firePokemonCount;
      }
    }

    // Burning Tail
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1, R);
    }

    return state;
  }
}
