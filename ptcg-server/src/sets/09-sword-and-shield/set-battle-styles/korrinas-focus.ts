import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class KorrinasFocus extends TrainerCard {
  public regulationMark = 'E';

  protected _tags = [CardTag.RAPID_STRIKE];

  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '128';

  public name: string = "Korrina's Focus";

  public fullName: string = "Korrina's Focus BST";

  public text: string = 'Draw cards until you have 6 cards in your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      while (player.hand.cards.length < 6) {
        if (player.deck.cards.length === 0) {
          break;
        }
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
      }
      return state;
    }
    return state;
  }
}
