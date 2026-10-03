import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, TrainerType } from '../../../game/store/card/card-types';
import { GameMessage, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';

export class Relicanth extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 90;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Fossil Hunt',
      cost: [C],
      damage: 0,
      text: 'Put 2 Item cards that have Fossil in their names from your discard pile into your hand.',
    },
    {
      name: 'Water Gun',
      cost: [W, C],
      damage: 30,
      text: '',
    },
  ];

  public set: string = 'PLB';
  public setNumber: string = '24';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Relicanth';
  public fullName: string = 'Relicanth PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if there are any Fossil items in discard
      const fossilItems = player.discard.cards.filter(
        (c) =>
          c instanceof TrainerCard &&
          c.trainerType === TrainerType.ITEM &&
          c.name.includes('Fossil'),
      );

      if (fossilItems.length === 0) {
        return state;
      }

      // Build blocked list for non-Fossil items
      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        if (
          !(c instanceof TrainerCard) ||
          c.trainerType !== TrainerType.ITEM ||
          !c.name.includes('Fossil')
        ) {
          blocked.push(index);
        }
      });

      const max = Math.min(2, fossilItems.length);

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          {},
          { min: max, max, allowCancel: false, blocked },
        ),
        (selected) => {
          const cards = selected || [];
          cards.forEach((card) => {
            MOVE_CARDS(store, state, player.discard, player.hand, { cards: [card], sourceCard: this });
          });

          if (cards.length > 0) {
            store.prompt(
              state,
              new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
              () => {},
            );
          }
        },
      );
    }

    return state;
  }
}
