import { GameMessage, StateUtils } from '../../game';
import { TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import {
  APPLY_ABILITY_LOCK_MARKERS,
  CLEAR_ABILITY_LOCK_AT_END_OF_OPPONENTS_TURN,
  HANDLE_ABILITY_BLOCK,
  HAS_ABILITY_LOCK_MARKER,
  POKEPOWER_AND_BODY_TYPES,
  POKEMON_POWER_TYPES,
} from '../../game/store/prefabs/ability-lock';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class GoopGasAttack extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'TR';
  public setNumber = '78';
  public name: string = 'Goop Gas Attack';
  public fullName: string = 'Goop Gas Attack TR';
  public cardImage: string = 'assets/cardback.png';
  public text: string =
    "All Pokémon Powers stop working until the end of your opponent's next turn.";

  public GOOP_GAS_MARKER = 'GOOP_GAS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      APPLY_ABILITY_LOCK_MARKERS(this.GOOP_GAS_MARKER, this, player, opponent);
    }

    HANDLE_ABILITY_BLOCK(
      effect,
      ({ player }) => HAS_ABILITY_LOCK_MARKER(this.GOOP_GAS_MARKER, player, this, state),
      {
        powerTypes: [...POKEPOWER_AND_BODY_TYPES, ...POKEMON_POWER_TYPES],
        error: GameMessage.CANNOT_USE_POWER,
      },
    );

    CLEAR_ABILITY_LOCK_AT_END_OF_OPPONENTS_TURN(effect, state, this.GOOP_GAS_MARKER, this);

    return state;
  }
}
