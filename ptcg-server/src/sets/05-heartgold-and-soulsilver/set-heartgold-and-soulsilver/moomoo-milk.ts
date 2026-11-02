import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { MULTIPLE_COIN_FLIPS_PROMPT } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class MoomooMilk extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'HS';
  public name: string = 'Moomoo Milk';
  public fullName: string = 'Moomoo Milk HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';
  public text: string = 'Choose 1 of your Pokémon. Flip 2 coins. For each heads, remove 3 damage counters from that Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_HEAL,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected?.[0];
        if (!target) {
          return;
        }

        MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
          const heads = results.filter(r => r).length;
          if (heads > 0) {
            store.reduceEffect(state, new HealEffect(player, target, 30 * heads));
          }
        });
      });
    }

    return state;
  }
}
