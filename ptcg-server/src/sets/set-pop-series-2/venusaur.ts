import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Venusaur extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Ivysaur';
  public hp: number = 120;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public attacks = [{
    // Wide Solarbeam
    name: 'Wide Solarbeam',
    cost: [G, G, C],
    damage: 20,
    text: 'Does 20 damage to 2 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    // Hard Plant
    name: 'Hard Plant',
    cost: [G, G, G, C],
    damage: 80,
    text: 'Venusaur can\'t use Hard Plant during your next turn.'
  }];

  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Venusaur';
  public fullName: string = 'Venusaur P2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Wide Solarbeam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(20, effect, store, state, 0, 2);
    }
    // Hard Plant
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, this.attacks[1]);
    }
    return state;
  }
}
