import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { ADD_SLEEP_TO_PLAYER_ACTIVE } from '../../../game/store/prefabs/prefabs';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class TropicalWind extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP05';
  public name: string = 'Tropical Wind';
  public fullName: string = 'Tropical Wind DPP';
  public text: string = 'Flip a coin. If heads, remove 2 damage counters from each Active Pokémon (remove 1 damage counter if a Pokémon has only 1). If tails, each Active Pokémon is now Asleep.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          const healPlayer = Math.min(20, player.active.damage);
          const healOpponent = Math.min(20, opponent.active.damage);
          if (healPlayer > 0) {
            store.reduceEffect(state, new HealEffect(player, player.active, healPlayer));
          }
          if (healOpponent > 0) {
            store.reduceEffect(state, new HealEffect(opponent, opponent.active, healOpponent));
          }
        } else {
          ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, player, this);
          ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, opponent, this);
        }
        MOVE_CARDS(store, state, player.supporter, player.discard, {
          cards: [effect.trainerCard],
          sourceCard: this,
        });
      });
    }

    return state;
  }
}
