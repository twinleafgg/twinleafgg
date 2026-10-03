import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameError, GameMessage } from '../../../game';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';

export class AreaZeroUnderdepths extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'SCR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '131';
  public regulationMark = 'H';
  public name: string = 'Area Zero Underdepths';
  public fullName: string = 'Area Zero Underdepths SCR';

  public text = `Each player who has any Tera Pokémon in play can have up to 8 Pokémon on their Bench.

If a player no longer has any Tera Pokémon in play, that player discards Pokémon from their Bench until they have 5. When this card leaves play, both players discard Pokémon from their Bench until they have 5, and the player who played this card discards first.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckTableStateEffect && StateUtils.getStadiumCard(state) === this) {
      effect.benchSizes = state.players.map((player, index) => {
        let teraPokemon = 0;
        if (player.active?.getPokemonCard()?.hasTag(CardTag.POKEMON_TERA)) {
          teraPokemon++;
        }

        player.bench.forEach((benchSpot) => {
          if (benchSpot.getPokemonCard()?.hasTag(CardTag.POKEMON_TERA)) {
            teraPokemon++;
          }
        });
        return teraPokemon >= 1 ? 8 : 5;
      });
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }
    return state;
  }
}
