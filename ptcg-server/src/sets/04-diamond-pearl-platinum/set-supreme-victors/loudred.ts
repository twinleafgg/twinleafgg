import { PokemonCard, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Loudred extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Whismur';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Smash Kick',
    cost: [C, C],
    damage: 30,
    text: ''
  }, {
    name: 'Stomp Off',
    cost: [C, C, C],
    damage: 50,
    text: 'Discard the top card from your opponent\'s deck.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '64';
  public name: string = 'Loudred';
  public fullName: string = 'Loudred SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Stomp Off
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      if (opponent.deck.cards.length > 0) {
        MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: 1, sourceCard: this });
      }
    }

    return state;
  }
}
