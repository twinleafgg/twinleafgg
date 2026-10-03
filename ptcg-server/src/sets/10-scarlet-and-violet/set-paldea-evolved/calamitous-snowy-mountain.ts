import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, Stage, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameError, GameMessage, GameLog } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class CalamitousSnowyMountain extends TrainerCard {
  public regulationMark = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '174';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'PAL';
  public name = 'Calamitous Snowy Mountain';
  public fullName = 'Calamitous Snowy Mountain PAL';
  public text =
    'Whenever any player attaches an Energy card from their hand to 1 of their Basic non-[W] Pokémon, put 2 damage counters on that Pokémon.';

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

      if (
        !effect.target.isStage(Stage.BASIC) ||
        checkPokemonTypeEffect.cardTypes.includes(CardType.WATER)
      ) {
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
