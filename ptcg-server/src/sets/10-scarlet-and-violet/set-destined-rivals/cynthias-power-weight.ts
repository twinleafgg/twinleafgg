import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

export class CynthiasPowerWeight extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  protected _tags = [CardTag.CYNTHIAS];
  public regulationMark = 'I';
  public set: string = 'DRI';
  public setNumber: string = '162';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Cynthia's Power Weight";
  public fullName: string = "Cynthia's Power Weight DRI";

  public text: string = "The Cynthia's Pokémon this card is attached to gets +70 HP.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckHpEffect && effect.target.tools.includes(this)) {
      const card = effect.target.getPokemonCard();

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      if (card === undefined) {
        return state;
      }

      if (card.hasTag(CardTag.CYNTHIAS)) {
        effect.hp += 70;
      }
    }
    return state;
  }
}
