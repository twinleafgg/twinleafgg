import { GameError, GameStoreMessage } from '../../game';
import { TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class FullHeal extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BS'; // Replace with the appropriate set abbreviation

  public name: string = 'Full Heal';

  public fullName: string = 'Full Heal BS'; // Replace with the appropriate set abbreviation

  public cardImage: string = 'assets/cardback.png'; // Replace with the appropriate card image path

  public setNumber: string = '82'; // Replace with the appropriate set number

  public text: string =
    'Your Active Pokémon is no longer Asleep, Confused, Paralyzed, or Poisoned.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.active.specialConditions.length === 0) {
        throw new GameError(GameStoreMessage.CANNOT_PLAY_THIS_CARD);
      }

      player.active.specialConditions = [];
    }

    return state;
  }
}
