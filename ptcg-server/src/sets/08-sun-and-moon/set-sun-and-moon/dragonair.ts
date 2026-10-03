import { PokemonCard, Stage, CardType, StoreLike, State } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { DURING_YOUR_NEXT_TURN_ATTACH_ANY_NUMBER_OF_ENERGY } from "../../../game/store/prefabs/effect-of-attack-prefabs";
import { WAS_ATTACK_USED } from "../../../game/store/prefabs/prefabs";

export class Dragonair extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Dratini';
  public cardType: CardType[] = [CardType.DRAGON];
  public hp: number = 90;
  public weakness = [{ type: CardType.FAIRY }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [{
    name: 'Dragon\'s Wish',
    cost: [CardType.COLORLESS],
    damage: 0,
    text: 'During your next turn, you may attach any number of Energy cards from your hand to your Pokémon.'
  },
  {
    name: 'Tail Smack',
    cost: [CardType.GRASS, CardType.LIGHTNING, CardType.COLORLESS],
    damage: 60,
    text: ''
  }];

  public set: string = 'SUM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Dragonair';
  public fullName: string = 'Dragonair SUM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dragon's Wish
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DURING_YOUR_NEXT_TURN_ATTACH_ANY_NUMBER_OF_ENERGY(effect);
    }
    return state;
  }
}