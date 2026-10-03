import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  COIN_FLIP_PROMPT,
  DRAW_CARDS,
  SHUFFLE_HAND_INTO_DECK_THEN_DRAW,
} from '../../../game/store/prefabs/prefabs';

export class ProfessorBirchsObservations extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'PRC';
  public setNumber: string = '134';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Professor Birch's Observations";
  public fullName: string = "Professor Birch's Observations PRC";

  public text: string =
    'Shuffle your hand into your deck and flip a coin. If heads, draw 7 cards. If tails, draw 4 cards. You may play only 1 Supporter card during your turn (before your attack).';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      return SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, effect.player, {
        excludeCard: this,
        resolveDraw: (store, state, player) => {
          COIN_FLIP_PROMPT(store, state, player, (result) => {
            DRAW_CARDS(store, state, player, result ? 7 : 4);
          });
        },
      });
    }

    return state;
  }
}
