import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Stage, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { PokemonCard } from '../../../game';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

export class BigAirBalloon extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'MEW';

  public name: string = 'Big Air Balloon';

  public fullName: string = 'Big Air Balloon MEW';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '155';

  public regulationMark = 'G';

  public text: string = 'The Stage 2 Pokémon this card is attached to has no Retreat Cost.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect && effect.player.active.tools.includes(this)) {
      const card = effect.player.active.getPokemonCard();

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      if (card instanceof PokemonCard && card.stage === Stage.STAGE_2) effect.cost = [];
    }

    return state;
  }
}
