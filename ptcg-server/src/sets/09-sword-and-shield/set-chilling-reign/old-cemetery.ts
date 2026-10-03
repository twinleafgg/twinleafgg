import { GameError, GameLog, GameMessage, State, StateUtils, StoreLike } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class OldCemetery extends TrainerCard {
  public regulationMark = 'E';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '147';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'CRE';
  public name = 'Old Cemetery';
  public fullName = 'Old Cemetery CRE 147';
  public text =
    'Whenever any player attaches an Energy card from their hand to 1 of their non-[P] Pokémon, put 2 damage counters on that Pokémon.';

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof AttachEnergyEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      const checkPokemonTypeEffect = new CheckPokemonTypeEffect(effect.target);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)) {
        return state;
      }

      store.reduceEffect(state, checkPokemonTypeEffect);

      if (checkPokemonTypeEffect.cardTypes.includes(CardType.PSYCHIC)) {
        return state;
      }

      store.log(state, GameLog.LOG_PLAYER_PLACES_DAMAGE_COUNTERS, {
        name: owner.name,
        damage: 20,
        target: effect.target.getPokemonCard()!.name,
        effect: this.name,
      });

      effect.target.damage += 20;
    }

    return state;
  }
}
