import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { DRAW_CARDS } from '../../../game/store/prefabs/prefabs';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { GameError, GameMessage } from '../../../game';

export class TeamRocketsFactory extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'DRI';
  public regulationMark = 'I';
  public name: string = "Team Rocket's Factory";
  public fullName: string = "Team Rocket's Factory DRI";
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '173';

  public text: string =
    'Once during each player\'s turn, if they played a Supporter card that has \"Team Rocket\" in its name from their hand this turn, they may draw 2 cards.';

  public readonly FACTORY_USED_MARKER = 'FACTORY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      if (!player.rocketSupporter) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }
      DRAW_CARDS(store, state, player, 2);
      player.marker.addMarker(this.FACTORY_USED_MARKER, this);
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.FACTORY_USED_MARKER, this)
    ) {
      effect.player.marker.removeMarker(this.FACTORY_USED_MARKER, this);
    }

    return state;
  }
}
