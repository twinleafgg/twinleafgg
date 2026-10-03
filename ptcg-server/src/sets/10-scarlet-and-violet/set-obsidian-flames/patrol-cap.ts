import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { MoveCardsEffect } from '../../../game/store/effects/game-effects';
import { StateUtils } from '../../../game';

export class PatrolCap extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'OBF';
  public name: string = 'Patrol Cap';
  public fullName: string = 'Patrol Cap OBF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '191';

  public text: string =
    "As long as the Pokémon this card is attached to is in the Active Spot, cards in your deck can't be discarded by effects of your opponent's attacks, Abilities, Item cards, Pokémon Tool cards, or Supporter cards.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof MoveCardsEffect) {
      state.players.forEach((player) => {
        if (
          player.active.tools.includes(this) &&
          effect.source === player.deck &&
          effect.destination === player.discard
        ) {
          // if the card is not from the player, prevent the discard
          if (
            effect.sourceCard &&
            StateUtils.findOwner(state, StateUtils.findCardList(state, effect.sourceCard)) !==
              player
          ) {
            effect.preventDefault = true;
          }
        }
      });
    }
    return state;
  }
}
