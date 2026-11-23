import { CardList, GameError, GameMessage, Player, ShowCardsPrompt, State, StateUtils, StoreLike, TrainerCard, TrainerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, MOVE_CARDS, SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class Reporter extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '77';
  public name: string = 'Reporter';
  public fullName: string = 'Reporter FLO';
  public text: string =
    'Draw 2 cards. Your opponent reveals their hand. Look at the top card of your opponent\'s deck, then return it.';

  public canPlay(_store: StoreLike, _state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      DRAW_CARDS(store, state, player, 2);
      SHOW_CARDS_TO_PLAYER(store, state, player, opponent.hand.cards);

      if (opponent.deck.cards.length > 0) {
        const deckTop = new CardList();
        MOVE_CARDS(store, state, opponent.deck, deckTop, { count: 1, sourceCard: this });

        return store.prompt(state, new ShowCardsPrompt(
          player.id,
          GameMessage.CARDS_SHOWED_BY_EFFECT,
          deckTop.cards,
        ), () => {
          opponent.deck.cards = [...deckTop.cards, ...opponent.deck.cards];
        });
      }
    }

    return state;
  }
}
