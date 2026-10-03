import { pokemonHasCardType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { HANDLE_ABILITY_LOCK } from '../../../game/store/prefabs/ability-lock';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';

export class TeamRocketsWatchtower extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'DRI';
  public regulationMark = 'I';
  public name: string = "Team Rocket's Watchtower";
  public fullName: string = "Team Rocket's Watchtower DRI";
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '180';
  public text: string = "[C] Pokémon in play (both yours and your opponent's) have no Abilities.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    HANDLE_ABILITY_LOCK(
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
          if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, cardList, this)) {
            return false;
          }
          const checkType = new CheckPokemonTypeEffect(cardList);
          store.reduceEffect(state, checkType);
          return checkType.cardTypes.includes(CardType.COLORLESS);
        } catch {
          return pokemonHasCardType(card, CardType.COLORLESS);
        }
      },
      {
        allowUseFromHand: true,
        allowUseFromDiscard: true,
        error: GameMessage.BLOCKED_BY_EFFECT,
      },
    );

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
