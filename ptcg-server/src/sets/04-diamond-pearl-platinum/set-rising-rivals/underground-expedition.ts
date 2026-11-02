import { CardList, ChooseCardsPrompt, GameError, GameMessage, State, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class UndergroundExpedition extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '97';
  public name: string = 'Underground Expedition';
  public fullName: string = 'Underground Expedition RR';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, discard this card. Look at the 4 cards from the bottom of your deck. Choose any 2 cards there and put them into your hand. Put the remaining cards back on the bottom of your deck in any order.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const numBottom = Math.min(4, player.deck.cards.length);
      const bottomCards = player.deck.cards.slice(-numBottom);
      player.deck.cards.splice(-numBottom, numBottom);

      const bottomCardList = new CardList();
      bottomCardList.cards = bottomCards;

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        bottomCardList,
        {},
        { min: Math.min(2, bottomCards.length), max: Math.min(2, bottomCards.length), allowCancel: false }
      ), selected => {
        for (const card of selected) {
          MOVE_CARDS(store, state, bottomCardList, player.hand, { cards: [card], sourceCard: this });
        }

        while (bottomCardList.cards.length > 0) {
          MOVE_CARDS(store, state, bottomCardList, player.deck, { cards: [bottomCardList.cards[0]], sourceCard: this });
        }

        return state;
      });
    }

    return state;
  }
}
