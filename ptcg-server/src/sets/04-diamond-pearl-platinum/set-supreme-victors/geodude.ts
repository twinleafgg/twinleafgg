import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Geodude extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +10 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Knuckle Punch',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    name: 'Focus Fist',
    cost: [F, C],
    damage: 30,
    text: 'Flip a coin. If tails, this attack does nothing.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public name: string = 'Geodude';
  public fullName: string = 'Geodude SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Focus Fist
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          effect.damage = 0;
        }
      });
    }

    return state;
  }
}
