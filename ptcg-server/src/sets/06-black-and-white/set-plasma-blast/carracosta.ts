import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { TrainerCard } from '../../../game/store/card/trainer-card';

export class Carracosta extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Tirtouga';
  public cardType: CardType[] = [W];
  public hp: number = 140;
  public weakness = [{ type: G }];
  public retreat = [C, C, C, C];

  public attacks = [
    {
      name: 'Fossil Clutch',
      cost: [W, C, C],
      damage: 50,
      damageCalculation: '+',
      text: 'You may discard an Item card that has Fossil in its name from your hand. If you do, this attack does 50 more damage.'
    },
    {
      name: 'Waterfall',
      cost: [W, W, C, C],
      damage: 80,
      text: ''
    }
  ];

  public set: string = 'PLB';
  public setNumber: string = '28';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Carracosta';
  public fullName: string = 'Carracosta PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasFossilItem = player.hand.cards.some(c =>
        c instanceof TrainerCard &&
        c.trainerType === TrainerType.ITEM &&
        c.name.includes('Fossil')
      );

      if (hasFossilItem) {
        const blocked: number[] = [];
        player.hand.cards.forEach((c, index) => {
          if (!(c instanceof TrainerCard) ||
            c.trainerType !== TrainerType.ITEM ||
            !c.name.includes('Fossil')) {
            blocked.push(index);
          }
        });

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { min: 0, max: 1, allowCancel: true, blocked }
        ), selected => {
          if (selected && selected.length > 0) {
            MOVE_CARDS(store, state, player.hand, player.discard, { cards: [selected[0]], sourceCard: this });
            effect.damage += 50;
          }
        });
      }
    }

    return state;
  }
}
