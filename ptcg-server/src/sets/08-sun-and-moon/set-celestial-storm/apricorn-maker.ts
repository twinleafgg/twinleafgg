import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { State, StoreLike, TrainerCard, GameError, GameMessage, Player } from '../../../game';
import { MOVE_CARDS, SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class ApricornMaker extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'CES';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '124';
  public name: string = 'Apricorn Maker';
  public fullName: string = 'Apricorn Maker CES';
  public text: string =
    'Search your deck for up to 2 Item cards that have the word "Ball" in their name, reveal them, and put them into your hand. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      const blocked: number[] = [];
      player.deck.cards.forEach((c, index) => {
        if (
          !(c instanceof TrainerCard) ||
          c.trainerType != TrainerType.ITEM ||
          !c.hasTag(CardTag.BALL)
        ) {
          blocked.push(index);
        }
      });

      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.TRAINER },
        { min: 0, max: 2, allowCancel: false, blocked },
      );
    }

    return state;
  }
}
