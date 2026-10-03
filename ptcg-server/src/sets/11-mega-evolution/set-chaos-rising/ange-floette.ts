import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { PlayStadiumEffect } from '../../../game/store/effects/play-card-effects';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class AngeFloette extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'CRI';
  public setNumber: string = '75';
  public name: string = 'Ange Floette';
  public fullName: string = 'Hyperrogue Ange Floette M4';
  public cardImage: string = 'assets/cardback.png';
  public text: string =
    "You can put this card into play only if you discard a Prism Tower in play, and you can put this card into play during the same turn you play Prism Tower.\n\nEach Mega Floette ex in play (both yours and your opponent's) gets +150 HP.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayStadiumEffect && effect.trainerCard === this) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (!stadiumCard || stadiumCard.name !== 'Prism Tower') {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    if (effect instanceof CheckHpEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      const pokemonCard = effect.target.getPokemonCard();

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)) {
        return state;
      }

      if (
        pokemonCard &&
        pokemonCard.name === 'Mega Floette ex' &&
        pokemonCard.hasTag(CardTag.POKEMON_SV_MEGA)
      ) {
        effect.hp += 150;
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
