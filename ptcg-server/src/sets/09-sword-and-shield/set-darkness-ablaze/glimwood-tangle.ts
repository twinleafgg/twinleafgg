import { GameLog } from '../../../game/game-message';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACK_COIN_REFLIP_REDUCE_EFFECT } from '../../../game/store/prefabs/attack-coin-reflip';

export class GlimwoodTangle extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '162';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'DAA';
  public name = 'Glimwood Tangle';
  public fullName = 'Glimwood Tangle DAA';
  public text =
    "Once during each player's turn, after that player flips any coins for an attack, they may ignore all results of those coin flips and begin flipping those coins again.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return ATTACK_COIN_REFLIP_REDUCE_EFFECT(store, state, effect, {
      source: 'stadium',
      canOffer: (_, st, __) => StateUtils.getStadiumCard(st) === this,
      reflipLog: GameLog.LOG_PLAYER_REFLIPS_WITH_GLIMWOOD_TANGLE,
    });
  }
}
