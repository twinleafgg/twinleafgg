import { GameLog, pokemonHasCardTypeOptional } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { State, GamePhase } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { ATTACK_COIN_REFLIP_REDUCE_EFFECT } from '../../../game/store/prefabs/attack-coin-reflip';

export class BacktrackBadge extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'PBL';
  public setNumber: string = '74';
  public regulationMark: string = 'J';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Backtrack Badge';
  public fullName: string = 'Retry Badge M5';
  public text: string =
    'Once during your turn, after you flip any coins for an attack of the [C] Pokémon this card is attached to, you may ignore the results of those coin flips and begin flipping those coins again.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return ATTACK_COIN_REFLIP_REDUCE_EFFECT(store, state, effect, {
      source: 'tool',
      canOffer: (s, st, player) =>
        st.phase === GamePhase.ATTACK &&
        st.players[st.activePlayer] === player &&
        player.active.tools.includes(this) &&
        !IS_TOOL_BLOCKED(s, st, player, this) &&
        pokemonHasCardTypeOptional(player.active.getPokemonCard(), CardType.COLORLESS),
      reflipLog: GameLog.LOG_PLAYER_REFLIPS_WITH_BACKTRACK_BADGE,
    });
  }
}
