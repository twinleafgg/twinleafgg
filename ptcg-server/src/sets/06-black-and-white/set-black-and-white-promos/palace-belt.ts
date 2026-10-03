import { TrainerCard, TrainerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DrawCardForTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class PalaceBelt extends TrainerCard {
  protected _trainerType = TrainerType.TOOL;
  public set: string = 'BWP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '153';
  public name: string = 'Palace Belt';
  public fullName: string = 'Palace Belt BWP';
  public text: string =
    'If the Pokémon this card is attached to is your Active Pokémon, you draw 2 cards at the beginning of your turn instead of 1.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect) {
    if (effect instanceof DrawCardForTurnEffect && effect.player.active.tools.includes(this)) {
      const player = effect.player;

      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }
      effect.drawCount = 2;
    }

    return state;
  }
}
