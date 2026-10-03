import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT, TAKE_X_PRIZES, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gholdengo extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Gimmighoul';
  public hp: number = 130;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Celebration',
    cost: [M],
    damage: 0,
    text: 'If you have exactly 30 cards in your hand, take 2 Prize cards. If you do, shuffle your hand into your deck.'
  },
  {
    name: 'Triple Smash',
    cost: [M],
    damage: 50,
    damageCalculation: 'x',
    text: 'Flip 3 coins. This attack does 50 damage for each heads.'
  }];

  public regulationMark: string = 'J';
  public set: string = '30C';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '108';
  public name: string = 'Gholdengo';
  public fullName: string = 'Gholdengo 30C';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Celebration
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.hand.cards.length === 30) {
        return TAKE_X_PRIZES(store, state, player, 2, {}, () => {
          MOVE_CARDS(store, state, player.hand, player.deck, { sourceCard: this });
          SHUFFLE_DECK(store, state, player);
        });
      }
    }

    // Triple Smash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 3, results => {
        const heads = results.filter(r => r).length;
        effect.damage = 50 * heads;
      });
    }

    return state;
  }
}
