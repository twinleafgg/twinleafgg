import { GameMessage } from '../../../game/game-message';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { GameError } from '../../../game';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  COIN_FLIP_PROMPT,
  SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND,
} from '../../../game/store/prefabs/prefabs';

export class BurnedTower extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '71';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'UD';
  public name = 'Burned Tower';
  public fullName = 'Burned Tower UD';

  public text =
    "Once during each player's turn, that player may flip a coin. If heads, the player searches his or her discard pile for a basic Energy card, shows it to his or her opponent, and puts it into his or her hand.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      if (
        !player.discard.cards.some(
          (card) => card.superType === SuperType.ENERGY && card.energyType === EnergyType.BASIC,
        )
      ) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (result) {
          SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND(
            store,
            state,
            player,
            this,
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
            { min: 1, max: 1 },
          );
        }
      });
    }
    return state;
  }
}
