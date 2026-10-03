import { Effect } from '../../../game/store/effects/effect';
import { PlayerType, GameError, GameMessage } from '../../../game';
import { CardTag } from '../../../game/store/card/card-types';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class DesertRuins extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'HL';
  public setNumber = '88';
  public cardImage = 'assets/cardback.png';
  public name: string = 'Desert Ruins';
  public fullName: string = 'Desert Ruins HL';
  public text: string =
    'At any time between turns, each player puts 1 damage counter on his or her Pokémon-ex with maximum HP of at least 100.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof BetweenTurnsEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      // idk why this hits both player's pokemon, it might be getting confused as to what the player specified is so it defaults to both, but hey, it works, so i don't care.
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const owner = StateUtils.findOwner(state, cardList);
        if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, cardList)) {
          return;
        }

        const pokemon = cardList.getPokemonCard();
        if (pokemon && pokemon.hasTag(CardTag.POKEMON_ex) && pokemon.hp >= 100) {
          cardList.damage += 10;
        }
      });

      if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }
    }

    return state;
  }
}
