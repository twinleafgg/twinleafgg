import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ShowCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class MissingClover extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'UPR';
  public setNumber: string = '129';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Missing Clover';
  public fullName: string = 'Missing Clover UPR';
  public text: string =
    'You may play 4 Missing Clover cards at once.\n\u2022 If you played 1 card, look at the top card of your deck.\n\u2022 If you played 4 cards, take a Prize card. (This effect works one time for 4 cards.)';

  // TODO: Missing Clover requires playing 4 cards at once, which is not supported by the current trainer card play system.
  // The engine plays one Item card at a time. Implementing "play 4 at once" would require custom UI support.
  // For now, implement the single-card effect: look at the top card of your deck.
  // Ref: set-crimson-invasion/peeking-red-card.ts (ShowCardsPrompt pattern)
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      // Single card: look at the top card of your deck
      if (player.deck.cards.length > 0) {
        const topCard = [player.deck.cards[0]];
        store.prompt(
          state,
          new ShowCardsPrompt(player.id, GameMessage.CARDS_SHOWED_BY_EFFECT, topCard),
          () => {},
        );
      }
    }

    return state;
  }
}
