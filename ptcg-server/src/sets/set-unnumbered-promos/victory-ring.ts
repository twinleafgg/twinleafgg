import {
  Card,
  CardList,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  State,
  StoreLike,
  TrainerCard,
  TrainerType,
} from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { SHUFFLE_DECK, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';

export class VictoryRing extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'UP';
  public name: string = 'Victory Ring';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '101';
  public fullName: string = 'Victory Ring UP';

  public text: string =
    'Victory Ring can only be used by official tournament winners.\n\nTurn all of your Prize cards face up. You may choose any number of them and return them to your deck. If you do, shuffle your deck. Then, take the same number of cards from the top of your deck and put them face down as your Prize cards without looking at them.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const prizes = player.prizes.filter((p) => p.cards.length > 0);
      const allPrizeCards = new CardList();
      prizes.forEach((p) => allPrizeCards.cards.push(...p.cards));

      if (allPrizeCards.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Refs: set-legends-awakened/azelf.ts (temporarily reveal then re-hide prizes),
      // set-astral-radiance/hisuian-heavy-ball.ts (ChooseCardsPrompt over prize cards)
      prizes.forEach((p) => {
        p.isSecret = false;
      });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          allPrizeCards,
          {},
          { min: 0, max: allPrizeCards.cards.length, allowCancel: false },
        ),
        (selected) => {
          if (selected && selected.length > 0) {
            selected.forEach((card: Card) => {
              const sourcePrize = player.prizes.find((p) => p.cards.includes(card));
              if (sourcePrize) {
                MOVE_CARDS(store, state, sourcePrize, player.deck, {
                  cards: [card],
                  sourceCard: this,
                });
              }
            });

            SHUFFLE_DECK(store, state, player);

            player.prizes
              .filter((p) => p.cards.length === 0)
              .forEach((emptyPrize) => {
                MOVE_CARDS(store, state, player.deck, emptyPrize, { count: 1, sourceCard: this });
                emptyPrize.isSecret = true;
              });
          }
        },
      );
    }

    return state;
  }
}
