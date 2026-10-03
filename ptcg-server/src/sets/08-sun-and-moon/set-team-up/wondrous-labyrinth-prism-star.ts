import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType, CardTag } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { MoveCardsEffect } from '../../../game/store/effects/game-effects';
import {
  CheckAttackCostEffect,
  CheckPokemonTypeEffect,
} from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class WondrousLabyrinthPrismStar extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.PRISM_STAR];
  public set: string = 'TEU';
  public setNumber: string = '158';
  public name: string = 'Wondrous Labyrinth Prism Star';
  public fullName: string = 'Wondrous Labyrinth Prism Star TEU';
  public cardImage: string = 'assets/cardback.png';
  public text: string =
    "The attacks of non-[Y] Pokémon (both yours and your opponent's) cost [C] more.\n\nWhenever any player plays an Item or Supporter card from their hand, prevent all effects of that card done to this Stadium card.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && StateUtils.getStadiumCard(state) === this) {
      const checkPokemonTypeEffect = new CheckPokemonTypeEffect(effect.player.active);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active, this)) {
        return state;
      }

      store.reduceEffect(state, checkPokemonTypeEffect);
      const isFairyPokemon = checkPokemonTypeEffect.cardTypes.includes(CardType.FAIRY);

      if (!isFairyPokemon) {
        const index = effect.cost.indexOf(CardType.COLORLESS);
        if (index > -1) {
          effect.cost.splice(index, 0, CardType.COLORLESS);
        } else {
          effect.cost.push(CardType.COLORLESS);
        }
      }
      return state;
    }

    // Prevent effects of Item and Supporter cards on this Stadium
    if (effect instanceof MoveCardsEffect && StateUtils.getStadiumCard(state) === this) {
      if (
        effect.sourceCard instanceof TrainerCard &&
        (effect.sourceCard.trainerType === TrainerType.SUPPORTER ||
          effect.sourceCard.trainerType === TrainerType.ITEM)
      ) {
        const stadiumCard = StateUtils.getStadiumCard(state);
        if (stadiumCard !== undefined) {
          const cardList = StateUtils.findCardList(state, stadiumCard);
          if (effect.source === cardList) {
            effect.preventDefault = true;
          }
        }
      }
    }

    return state;
  }
}
