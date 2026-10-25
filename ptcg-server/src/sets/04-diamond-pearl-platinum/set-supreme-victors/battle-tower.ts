import { GameError, GameMessage, State, StateUtils, StoreLike } from '../../../game';
import { Stage, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect, UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class BattleTower extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '134';
  public name: string = 'Battle Tower';
  public fullName: string = 'Battle Tower SV';
  public text: string = 'This card stays in play when you play it. Discard this card if another Stadium card comes into play. If another card with the same name is in play, you can\'t play this card. Whenever any player plays any Pokémon from his or her hand to Level-Up 1 of his or her Pokémon, remove 4 damage counters from that Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof PlayPokemonEffect && StateUtils.getStadiumCard(state) === this) {
      if (effect.pokemonCard.stage !== Stage.LV_X) {
        return state;
      }
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)) {
        return state;
      }
      store.reduceEffect(state, new HealEffect(owner, effect.target, 40));
    }

    return state;
  }
}
