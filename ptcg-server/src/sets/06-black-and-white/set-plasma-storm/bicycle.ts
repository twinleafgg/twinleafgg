import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Bicycle extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'PLS';

  public name: string = 'Bicycle';

  public fullName: string = 'Bicycle PLS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '117';

  public text: string = 'Draw cards until you have 4 cards in your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const cards = player.hand.cards.filter((c) => c !== this);
      const cardsToDraw = Math.max(0, 4 - cards.length);

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      if (cardsToDraw === 0 || player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: cardsToDraw, sourceCard: this });
    }

    return state;
  }
}
