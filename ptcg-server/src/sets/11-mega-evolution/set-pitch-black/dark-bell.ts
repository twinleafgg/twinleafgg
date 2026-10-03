import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType, SpecialCondition } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, Player } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { ADD_CONFUSION_TO_PLAYER_ACTIVE, TRAINER_TARGET_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class DarkBell extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'PBL';
  public setNumber: string = '75';
  public regulationMark: string = 'J';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Dark Bell';
  public fullName: string = 'Dark Bell M5';
  public text: string = 'Both Active non-[D] Pokémon are now Confused.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const opponent = StateUtils.getOpponent(state, player);
    const actives = [player.active, opponent.active];

    const bothConfused = actives.every(
      (active) =>
        active.cards.length > 0 && active.specialConditions.includes(SpecialCondition.CONFUSED),
    );
    if (bothConfused) {
      return false;
    }

    const bothDark = actives.every((active) => {
      if (active.cards.length === 0) {
        return false;
      }
      const checkType = new CheckPokemonTypeEffect(active);
      store.reduceEffect(state, checkType);
      return checkType.cardTypes.includes(CardType.DARK);
    });
    if (bothDark) {
      return false;
    }

    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const confuseTarget = (targetPlayer: typeof player, active: typeof player.active) => {
        if (active.cards.length === 0) {
          return;
        }
        const checkType = new CheckPokemonTypeEffect(active);
        store.reduceEffect(state, checkType);
        if (!checkType.cardTypes.includes(CardType.DARK)) {
          ADD_CONFUSION_TO_PLAYER_ACTIVE(store, state, targetPlayer, this);
        }
      };

      confuseTarget(player, player.active);
      if (!TRAINER_TARGET_BLOCKED(store, state, player, this, opponent.active)) {
        confuseTarget(opponent, opponent.active);
      }
    }

    return state;
  }
}
