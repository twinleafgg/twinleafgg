import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { GamePhase, State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import {IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PlayerType } from '../../../game';

export class BalloonBerry extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'DR';
  public name: string = 'Balloon Berry';
  public fullName: string = 'Balloon Berry DR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '82';

  public text: string =
    'When the Pokémon Balloon Berry is attached to retreats, discard Balloon Berry instead of discarding Energy cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof CheckRetreatCostEffect &&
      effect.player.active.tools.includes(this) &&
      state.phase !== GamePhase.ATTACK
    ) {
      const player = effect.player;
      const index = effect.cost.indexOf(CardType.COLORLESS);
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }
      if (index !== -1) {
        effect.cost.splice(index, 99);
      }

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
        if (cardList.tools && cardList.tools.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
    }

    return state;
  }
}
