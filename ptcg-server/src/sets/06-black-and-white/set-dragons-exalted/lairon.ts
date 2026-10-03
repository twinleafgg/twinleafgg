import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StateUtils, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, FLIP_UNTIL_TAILS_AND_COUNT_HEADS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Lairon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Aron';
  public cardType: CardType[] = [M];
  public hp: number = 90;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Metal Claw',
    cost: [M, C],
    damage: 30,
    text: ''
  }, {
    name: 'Wreak Havoc',
    cost: [M, M, C],
    damage: 60,
    text: 'Flip a coin until you get tails. For each heads, discard the top card of your opponent\'s deck.'
  }];

  public set: string = 'DRX';
  public setNumber: string = '79';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Lairon';
  public fullName: string = 'Lairon DRX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      FLIP_UNTIL_TAILS_AND_COUNT_HEADS(store, state, player, (heads: number) => {
        const cardsToDiscard = Math.min(heads, opponent.deck.cards.length);
        for (let i = 0; i < cardsToDiscard; i++) {
          MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: 1, sourceCard: this });
        }
      });
    }

    return state;
  }
}
