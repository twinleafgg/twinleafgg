import { StateUtils } from '../../game';
import { SuperType, TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import {
  MOVE_CARDS,
  MULTIPLE_COIN_FLIPS_PROMPT,
  TRAINER_TARGET_BLOCKED,
} from '../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class SuperEnergyRemoval2 extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'AQ';
  public setNumber = '134';
  public name: string = 'Super Energy Removal 2';
  public fullName: string = 'Super Energy Removal 2 AQ';
  public cardImage: string = 'assets/cardback.png';
  public text: string =
    'Flip 2 coins. If both are heads, discard all Energy cards attached to the Defending Pokémon. If both are tails, discard all Energy cards attached to your Active Pokémon. If 1 is heads and 1 is tails, this card does nothing.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      effect.preventDefault = true;

      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, (result) => {
        if (result[0] && result[1]) {
          // Both heads: Discard all Energy from Defending Pokémon
          if (TRAINER_TARGET_BLOCKED(store, state, player, this, opponent.active)) {
            return;
          }
          const cards = opponent.active.cards.filter((c) => c.superType === SuperType.ENERGY);
          MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards, sourceCard: this });
        } else if (!result[0] && !result[1]) {
          // Both tails: Discard all Energy from Active Pokémon
          const cards = player.active.cards.filter((c) => c.superType === SuperType.ENERGY);
          MOVE_CARDS(store, state, player.active, player.discard, { cards, sourceCard: this });
        }
      });
    }
    return state;
  }
}
