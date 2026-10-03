import { GameError, GameMessage, StateUtils } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class DevouredField extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'CIN';
  public name = 'Devoured Field';
  public fullName = 'Devoured Field CIN';
  public text =
    "The attacks of [D] Pokémon and [N] Pokémon (both yours and your opponent's) do 10 more damage to the opponent's Active Pokémon (before applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof DealDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const checkPokemonType = new CheckPokemonTypeEffect(player.active);
      const attack = effect.attack;

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, player.active, this)) {
        return state;
      }

      store.reduceEffect(state, checkPokemonType);

      if (
        !checkPokemonType.cardTypes.includes(CardType.DRAGON) &&
        !checkPokemonType.cardTypes.includes(CardType.DARK)
      ) {
        return state;
      }

      if (attack && attack.damage > 0 && effect.target === opponent.active) {
        effect.damage += 10;
      }
    }

    return state;
  }
}
