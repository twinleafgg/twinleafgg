import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  ADD_MARKER,
  DRAW_CARDS,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { Player } from '../../../game/store/state/player';

export class Amarys extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'PRE';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '93';

  public regulationMark = 'H';

  public name: string = 'Amarys';

  public fullName: string = 'Amarys PRE';

  public readonly AMARYS_USED_MARKER = 'AMARYS_USED_MARKER';

  public text: string =
    'Draw 4 cards. At the end of this turn, if you have 5 or more cards in your hand, discard your hand.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      DRAW_CARDS(store, state, effect.player, 4);
      ADD_MARKER(this.AMARYS_USED_MARKER, effect.player, this);
    }

    if (
      effect instanceof EndTurnEffect &&
      HAS_MARKER(this.AMARYS_USED_MARKER, effect.player, this)
    ) {
      const hand = effect.player.hand;
      const discard = effect.player.discard;

      if (hand.cards.length >= 5)
        MOVE_CARDS(store, state, hand, discard, { cards: hand.cards, sourceCard: this });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.AMARYS_USED_MARKER, this);

    return state;
  }
}
