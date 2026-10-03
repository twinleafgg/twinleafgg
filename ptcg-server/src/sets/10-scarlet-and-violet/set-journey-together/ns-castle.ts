import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class NsCastle extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.NS];
  public set: string = 'JTG';
  public name: string = "N's Castle";
  public fullName: string = "N's Castle JTG";
  public regulationMark = 'I';
  public cardImage: string = 'assets/cardback.png';
  public setNumber = '152';
  public text: string =
    "Each N's Pokémon in play (both yours and your opponent's) has no Retreat Cost.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect && StateUtils.getStadiumCard(state) === this) {
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active, this)) {
        return state;
      }

      if (effect.player.active.getPokemonCard()?.hasTag(CardTag.NS)) {
        effect.cost = [];
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
