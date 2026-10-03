import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import {
  HANDLE_ABILITY_BLOCK,
  POKEPOWER_AND_BODY_TYPES,
} from '../../../game/store/prefabs/ability-lock';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class BattleFrontier extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'PK';
  public name: string = 'Battle Frontier';
  public fullName: string = 'Battle Frontier PK';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '71';
  public text: string =
    "Each player's [C] Evolved Pokémon, [D] Evolved Pokémon, and [M] Evolved Pokémon can't use any Poké-Powers or Poké-Bodies.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    HANDLE_ABILITY_BLOCK(
      effect,
      ({ card }) => {
        if (StateUtils.getStadiumCard(state) !== this) {
          return false;
        }
        try {
          const cardList = StateUtils.findCardList(state, card);
          if (!(cardList instanceof PokemonCardList)) {
            return false;
          }
          const owner = StateUtils.findOwner(state, cardList);
          if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, cardList)) {
            return false;
          }
          if (cardList.getPokemons().length <= 1) {
            return false;
          }
          const checkPokemonType = new CheckPokemonTypeEffect(cardList);
          store.reduceEffect(state, checkPokemonType);
          const cardTypes = checkPokemonType.cardTypes;
          return (
            cardTypes.includes(CardType.COLORLESS) ||
            cardTypes.includes(CardType.DARK) ||
            cardTypes.includes(CardType.METAL)
          );
        } catch {
          return false;
        }
      },
      {
        powerTypes: POKEPOWER_AND_BODY_TYPES,
        error: GameMessage.BLOCKED_BY_EFFECT,
      },
    );

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
