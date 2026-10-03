import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { HANDLE_ABILITY_BLOCK, POKEBODY_TYPES } from '../../../game/store/prefabs/ability-lock';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class SpaceCenter extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'DX';
  public name: string = 'Space Center';
  public fullName: string = 'Space Center DX';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '91';
  public text: string =
    "Ignore Poké-Bodies for all Basic Pokémon in play (both yours and your opponent's) (excluding Pokémon-ex and Pokémon that has an owner in its name).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    HANDLE_ABILITY_BLOCK(
      effect,
      ({ card }) => {
        if (StateUtils.getStadiumCard(state) !== this) {
          return false;
        }
        if (card.hasTag(CardTag.POKEMON_ex)) {
          return false;
        }
        try {
          const cardList = StateUtils.findCardList(state, card);
          if (cardList instanceof PokemonCardList) {
            const owner = StateUtils.findOwner(state, cardList);
            if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, cardList)) {
              return false;
            }
            return cardList.getPokemons().length === 1 || card.hasTag(CardTag.LEGEND);
          }
        } catch {}
        return false;
      },
      {
        powerTypes: POKEBODY_TYPES,
        error: GameMessage.BLOCKED_BY_EFFECT,
      },
    );

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
