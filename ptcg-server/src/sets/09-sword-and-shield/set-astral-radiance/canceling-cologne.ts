import { TrainerCard, TrainerType, StoreLike, State, StateUtils, PokemonCardList } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { APPLY_ABILITY_LOCK_MARKERS, HANDLE_ABILITY_LOCK, CLEAR_ABILITY_LOCK_AT_END_OF_YOUR_TURN } from "../../../game/store/prefabs/ability-lock";
import { WAS_TRAINER_USED } from "../../../game/store/prefabs/trainer-prefabs";
import { TRAINER_TARGET_BLOCKED } from "../../../game/store/prefabs/trainer-target";

export class CancelingCologne extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public regulationMark = 'F';
  public set: string = 'ASR';
  public name: string = 'Canceling Cologne';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '136';
  public fullName: string = 'Canceling Cologne ASR';
  public text: string =
    "Until the end of your turn, your opponent's Active Pokémon has no Abilities. (This includes Pokémon that come into play during that turn.)";

  public CANCELING_COLOGNE_MARKER = 'CANCELING_COLOGNE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (!TRAINER_TARGET_BLOCKED(store, state, player, this, opponent.active)) {
        APPLY_ABILITY_LOCK_MARKERS(this.CANCELING_COLOGNE_MARKER, this, opponent);
      }
    }

    // Only the marked player's Active Pokémon is locked (not bench / not both players).
    HANDLE_ABILITY_LOCK(effect, ({ player, card }) => {
      if (!player.marker.hasMarker(this.CANCELING_COLOGNE_MARKER, this)) {
        return false;
      }
      try {
        const cardList = StateUtils.findCardList(state, card);
        return cardList instanceof PokemonCardList && cardList === player.active;
      } catch {
        return false;
      }
    });

    CLEAR_ABILITY_LOCK_AT_END_OF_YOUR_TURN(effect, state, this.CANCELING_COLOGNE_MARKER, this);

    return state;
  }
}
