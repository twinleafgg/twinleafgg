import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { TrainerCard } from '../../../game/store/card/trainer-card';

export class Machamp2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Machoke';
  public cardType: CardType[] = [F];
  public hp: number = 140;
  public weakness = [{ type: P }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Knock Off',
      cost: [F, C, C],
      damage: 60,
      text: 'Discard a random card from your opponent\'s hand.'
    },
    {
      name: 'Reinforced Lariat',
      cost: [F, F, C, C],
      damage: 80,
      damageCalculation: '+',
      text: 'If this Pok\u00e9mon has a Pok\u00e9mon Tool card attached to it, this attack does 40 more damage.'
    }
  ];

  public set: string = 'PLB';
  public setNumber: string = '50';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Machamp';
  public fullName: string = 'Machamp PLB 50';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.hand.cards.length > 0) {
        const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
        const card = opponent.hand.cards[randomIndex];
        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: [card], sourceCard: this });
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const hasTool = player.active.cards.some(c =>
        c instanceof TrainerCard && c.trainerType === TrainerType.TOOL
      );
      if (hasTool) {
        effect.damage += 40;
      }
    }

    return state;
  }
}
