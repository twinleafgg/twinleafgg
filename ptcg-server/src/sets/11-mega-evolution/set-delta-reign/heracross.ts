import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, DRAW_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Heracross extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 130;
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Spike Draw',
    cost: [G],
    damage: 20,
    text: 'Draw 2 cards.'
  },
  {
    name: 'High Horsepower',
    cost: [G, G, C],
    damage: 130,
    text: 'This Pokémon also does 30 damage to itself.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Heracross';
  public fullName: string = 'Heracross M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Spike Draw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS(store, state, effect.player, 2);
    }

    // High Horsepower
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 30);
    }

    return state;
  }
}
