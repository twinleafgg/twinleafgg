import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS_UNTIL_CARDS_IN_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Dunsparce extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Return',
    cost: [C],
    damage: 10,
    text: 'Draw cards until you have 6 cards in your hand.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '29';
  public name: string = 'Dunsparce';
  public fullName: string = 'Dunsparce UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Return
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS_UNTIL_CARDS_IN_HAND(effect.player, 6);
    }

    return state;
  }
}
