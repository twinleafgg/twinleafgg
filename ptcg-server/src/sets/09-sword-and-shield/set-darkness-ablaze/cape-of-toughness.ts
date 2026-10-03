import { CardTag, Stage, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class CapeOfToughness extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public regulationMark = 'D';

  public set: string = 'DAA';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '160';

  public name: string = 'Cape of Toughness';

  public fullName: string = 'Cape of Toughness DAA';

  public text: string =
    'The Basic Pokémon this card is attached to gets +50 HP, except Pokémon-GX.';

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

      if (card.stage === Stage.BASIC && !card.hasTag(CardTag.POKEMON_GX)) {
        effect.hp += 50;
      }
    }
    return state;
  }
}
