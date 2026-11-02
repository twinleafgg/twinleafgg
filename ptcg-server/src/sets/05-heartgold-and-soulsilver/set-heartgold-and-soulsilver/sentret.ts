import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Sentret extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Scout',
    cost: [C],
    damage: 0,
    text: 'Look at your opponent\'s hand.'
  },
  {
    name: 'Scratch',
    cost: [C],
    damage: 10,
    text: ''
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '80';
  public name: string = 'Sentret';
  public fullName: string = 'Sentret HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Scout
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      SHOW_CARDS_TO_PLAYER(store, state, player, opponent.hand.cards);
    }

    return state;
  }
}
