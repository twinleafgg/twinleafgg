import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';

export class LookerWhistle extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'UPR';
  public setNumber: string = '127';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Looker Whistle';
  public fullName: string = 'Looker Whistle UPR';
  public text: string =
    'Search your deck for up to 2 cards named Looker, reveal them, and put them into your hand. Then, shuffle your deck.';

  // Ref: set-breakpoint/lapras.ts (Errand-Running - SEARCH_DECK_FOR_CARDS_TO_HAND)
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.TRAINER, name: 'Looker' },
        { min: 0, max: 2 },
      );
    }

    return state;
  }
}
