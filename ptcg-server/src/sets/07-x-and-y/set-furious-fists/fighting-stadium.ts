import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType, CardTag } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class FightingStadium extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'FFI';
  public name: string = 'Fighting Stadium';
  public fullName: string = 'Fighting Stadium FFI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '90';
  public text: string =
    "The attacks of each [F] Pokémon in play (both yours and your opponent's) do 20 more damage to the Defending Pokémon-EX (before applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DealDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const targetCard = effect.target.getPokemonCard();
      const checkPokemonType = new CheckPokemonTypeEffect(effect.source);

      if (
        effect.target !== opponent.active ||
        !targetCard?.hasTag(CardTag.POKEMON_EX) ||
        IS_STADIUM_EFFECT_BLOCKED(store, state, opponent, effect.target)
      ) {
        return state;
      }

      store.reduceEffect(state, checkPokemonType);
      if (checkPokemonType.cardTypes.includes(CardType.FIGHTING)) {
        effect.damage += 20;
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
