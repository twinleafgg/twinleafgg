import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { pokemonHasCardType } from '../../../game';
import { UseStadiumEffect, HealEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { PlayerType } from '../../../game/store/actions/play-card-action';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';

export class RoughSeas extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'PRC';
  public name: string = 'Rough Seas';
  public fullName: string = 'Rough Seas PRC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '137';
  public text: string =
    "Once during each player's turn, that player may heal 30 damage from each of his or her [W] Pokémon and [L] Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      const targets: PokemonCardList[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (
          (pokemonHasCardType(card, CardType.WATER) ||
            pokemonHasCardType(card, CardType.LIGHTNING)) &&
          cardList.damage > 0
        ) {
          targets.push(cardList);
        }
      });

      if (targets.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      targets.forEach((target) => {
        const owner = StateUtils.findOwner(state, target);
        if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, target)) {
          return;
        }

        // Heal Pokemon
        const healEffect = new HealEffect(player, target, 30);
        store.reduceEffect(state, healEffect);
      });
    }

    return state;
  }
}
