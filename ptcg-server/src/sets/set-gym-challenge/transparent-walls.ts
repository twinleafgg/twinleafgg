import { StateUtils } from '../../game';
import { TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { PutDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import { ADD_MARKER, HAS_MARKER, REMOVE_MARKER } from '../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class TransparentWalls extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'G2';
  public setNumber = '125';
  public name: string = 'Transparent Walls';
  public fullName: string = 'Transparent Walls G2';
  public cardImage: string = 'assets/cardback.png';
  public text: string =
    "Until the end of your opponent's next turn, prevent all damage from attacks done to your Benched Pokémon. (Any other effects of attacks still happen.)";

  public TRANSPARENT_WALLS_MARKER = 'TRANSPARENT_WALLS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      ADD_MARKER(this.TRANSPARENT_WALLS_MARKER, player, this);
    }

    if (effect instanceof PutDamageEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (!HAS_MARKER(this.TRANSPARENT_WALLS_MARKER, opponent, this)) {
        return state;
      }

      if (effect.target === player.active || effect.target === opponent.active) {
        return state;
      }

      const targetPlayer = StateUtils.findOwner(state, effect.target);

      if (targetPlayer === opponent) {
        effect.preventDefault = true;
      }
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (HAS_MARKER(this.TRANSPARENT_WALLS_MARKER, opponent, this)) {
        REMOVE_MARKER(this.TRANSPARENT_WALLS_MARKER, opponent, this);
      }
    }

    return state;
  }
}
