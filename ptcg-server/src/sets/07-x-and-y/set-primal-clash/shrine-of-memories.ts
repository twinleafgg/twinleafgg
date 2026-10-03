import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PlayerType, StateUtils, StoreLike, State } from '../../../game';
import {
  CheckPokemonAttacksEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { Effect } from '../../../game/store/effects/effect';

export class ShrineOfMemories extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'PRC';
  public setNumber: string = '139';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Shrine of Memories';
  public fullName: string = 'Shrine of Memories PRC';
  public text: string =
    "Each player's evolved Pokémon can use any attack from its previous Evolutions. (That player still needs the necessary Energy to use each attack.)";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckTableStateEffect) {
      if (StateUtils.getStadiumCard(state) !== this) {
        return state;
      }

      const player = effect.player;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.stage !== Stage.BASIC) {
          const owner = StateUtils.findOwner(state, cardList);
          if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, cardList)) {
            return;
          }

          player.showAllStageAbilities = true;
        }
      });
    }

    if (effect instanceof CheckPokemonAttacksEffect) {
      if (StateUtils.getStadiumCard(state) !== this) {
        return state;
      }

      const player = effect.player;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (pokemonCardList, card) => {
        if (card.stage !== Stage.BASIC) {
          const owner = StateUtils.findOwner(state, pokemonCardList);
          if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, pokemonCardList)) {
            return;
          }

          for (const evolutionCard of pokemonCardList.cards) {
            if (evolutionCard.superType === SuperType.POKEMON && evolutionCard !== card) {
              effect.attacks.push(...(evolutionCard.attacks || []));
            }
          }
        }
      });
    }

    return state;
  }
}
