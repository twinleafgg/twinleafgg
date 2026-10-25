import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Gible extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C, value: 10 }];
  public retreat = [C];

  public attacks = [{
    // Surprise Attack
    name: 'Surprise Attack',
    cost: [C, C],
    damage: 30,
    text: 'Flip a coin. If tails, this attack does nothing.'
  }];

  public set: string = 'P6';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Gible';
  public fullName: string = 'Gible P6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Surprise Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => { if (!result) { effect.damage = 0; } });
    }
    return state;
  }
}
