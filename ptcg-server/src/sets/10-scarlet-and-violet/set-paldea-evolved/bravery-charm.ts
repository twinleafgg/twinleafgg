import { TrainerCard, TrainerType, State, Stage, StoreLike } from '../../../game';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class BraveryCharm extends TrainerCard {
  protected _trainerType = TrainerType.TOOL;

  public regulationMark = 'G';

  public set: string = 'PAL';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '173';

  public name: string = 'Bravery Charm';

  public fullName: string = 'Bravery Charm PAL';

  public text: string = 'The Basic Pokémon this card is attached to gets +50 HP.';

  private readonly HP_BONUS = 50;

  public reduceEffect(store: StoreLike, state: State, effect: Effect) {
    if (effect instanceof CheckHpEffect && effect.target.tools.includes(this)) {
      const card = effect.target.getPokemonCard();

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (card === undefined) {
        return state;
      }

      if (card.stage === Stage.BASIC) {
        effect.hp += this.HP_BONUS;
      }
    }
    return state;
  }
}
