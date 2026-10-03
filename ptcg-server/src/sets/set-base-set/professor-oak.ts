import { Effect } from '../../game/store/effects/effect';
import { GameError } from '../../game/game-error';
import { GameMessage } from '../../game/game-message';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { DRAW_CARDS, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class ProfessorOak extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '88';

  public name: string = 'Professor Oak';

  public fullName: string = 'Professor Oak BS';

  public text: string = 'Discard your hand, then draw 7 cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const cards = player.hand.cards.filter((c) => c !== this);
      MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
      DRAW_CARDS(store, state, player, 7);
    }

    return state;
  }
}
