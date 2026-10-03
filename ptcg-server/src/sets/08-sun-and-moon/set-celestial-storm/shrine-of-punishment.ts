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

export class ShrineOfPunishment extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'CES';
  public setNumber = '143';
  public cardImage = 'assets/cardback.png';
  public name: string = 'Shrine of Punishment';
  public fullName: string = 'Shrine of Punishment CES';
  public text: string =
    "Between turns, put 1 damage counter on each Pokémon-GX and Pokémon-EX (both yours and your opponent's).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof BetweenTurnsEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      // idk why this hits both player's pokemon, it might be getting confused as to what the player specified is so it defaults to both, but hey, it works, so i don't care.
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const owner = StateUtils.findOwner(state, cardList);
        if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, cardList, this)) {
          return;
        }

        const pokemon = cardList.getPokemonCard();
        if (
          pokemon &&
          (pokemon?.hasTag(CardTag.POKEMON_GX) || pokemon.hasTag(CardTag.POKEMON_EX))
        ) {
          cardList.damage += 10;
        }
      });
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
