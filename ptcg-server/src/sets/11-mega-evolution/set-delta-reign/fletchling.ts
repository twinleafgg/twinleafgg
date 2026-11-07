import { CardType, Stage, State, StoreLike } from '../../../game';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Fletchling extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 60;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Surprise Attack',
    cost: [C],
    damage: 30,
    text: 'Flip a coin. If tails, this attack does nothing.',
  }];

  public regulationMark: string = 'J';

  public set: string = 'DLR';
  public setNumber: string = '86';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Fletchling';
  public fullName: string = 'Fletchling M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Surprise Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          effect.damage = 0;
        }
      });
    }

    return state;
  }
}
