import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameLog, GamePhase } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACK_COIN_REFLIP_REDUCE_EFFECT } from '../../../game/store/prefabs/attack-coin-reflip';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class TrickCoin extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'PHF';
  public setNumber: string = '108';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Trick Coin';
  public fullName: string = 'Trick Coin PHF';
  public text: string =
    'Once during your turn, after you flip any coins for an attack of the Pokémon this card is attached to, you may ignore all effects of those coin flips and begin flipping those coins again. (You may only use effects that let you flip coins again, including effects from other cards, once during your turn.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return ATTACK_COIN_REFLIP_REDUCE_EFFECT(store, state, effect, {
      source: 'tool',
      canOffer: (s, st, player) =>
        st.phase === GamePhase.ATTACK &&
        st.players[st.activePlayer] === player &&
        player.active.tools.includes(this) &&
        !IS_TOOL_BLOCKED(s, st, player, this),
      reflipLog: GameLog.LOG_PLAYER_REFLIPS_WITH_TRICK_COIN,
    });
  }
}
