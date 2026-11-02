import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class LifeHerb extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'UL';
  public name: string = 'Life Herb';
  public fullName: string = 'Life Herb UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '79';
  public text: string = 'Flip a coin. If heads, choose 1 of your Pokémon, and remove all Special Conditions and 6 damage counters from that Pokémon (all if there are less than 6).';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_HEAL,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false }
        ), targets => {
          if (!targets || targets.length === 0) {
            return;
          }
          const target = targets[0];
          store.reduceEffect(state, new HealEffect(player, target, 60));
          const conditions = target.specialConditions.slice();
          conditions.forEach(condition => {
            target.removeSpecialCondition(condition);
          });
        });
      });
    }

    return state;
  }
}
