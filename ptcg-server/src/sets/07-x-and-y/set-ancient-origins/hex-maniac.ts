import { GameError, GameMessage, StateUtils } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import {
  APPLY_ABILITY_LOCK_MARKERS,
  CLEAR_ABILITY_LOCK_AT_END_OF_OPPONENTS_TURN,
  HANDLE_ABILITY_LOCK,
  HAS_ABILITY_LOCK_MARKER,
} from '../../../game/store/prefabs/ability-lock';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class HexManiac extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'AOR';

  public setNumber = '75';

  public name: string = 'Hex Maniac';

  public fullName: string = 'Hex Maniac AOR';

  public cardImage: string = 'assets/cardback.png';

  public text: string =
    "Until the end of your opponent's next turn, each Pokémon in play, in each player's hand, and in each player's discard pile has no Abilities. (This includes cards that come into play on that turn.)";

  public HEX_MANIAC_MARKER = 'HEX_MANIAC_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      APPLY_ABILITY_LOCK_MARKERS(this.HEX_MANIAC_MARKER, this, player, opponent);
    }

    HANDLE_ABILITY_LOCK(effect, ({ player }) =>
      HAS_ABILITY_LOCK_MARKER(this.HEX_MANIAC_MARKER, player, this, state),
    );

    CLEAR_ABILITY_LOCK_AT_END_OF_OPPONENTS_TURN(effect, state, this.HEX_MANIAC_MARKER, this);

    return state;
  }
}
