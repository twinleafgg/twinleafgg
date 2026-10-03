import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { StateUtils } from '../../game';
import { COIN_FLIP_PROMPT } from '../../game/store/prefabs/prefabs';

export class Digger extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'TR';
  public setNumber: string = '75';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Digger';
  public fullName: string = 'Digger TR';

  public text: string =
    'Flip a coin. If tails, do 10 damage to your Active Pokémon. If heads, your opponent flips a coin. If tails, your opponent does 10 damage to his or her Active Pokémon. If heads, you flip a coin. Keep doing this until a player gets tails.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const flipCoin = (flipper: typeof player): void => {
        COIN_FLIP_PROMPT(store, state, flipper, (result) => {
          if (result) {
            // Heads - other player flips
            const otherPlayer = flipper === player ? opponent : player;
            flipCoin(otherPlayer);
          } else {
            // Tails - flipper takes damage
            flipper.active.damage += 10;
          }
        });
      };

      flipCoin(player);
    }

    return state;
  }
}
