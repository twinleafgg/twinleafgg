import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType, CardTag } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { MoveCardsEffect, UseStadiumEffect } from '../../../game/store/effects/game-effects';
import {
  CheckAttackCostEffect,
  CheckPokemonTypeEffect,
} from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class ThunderMountainPrismStar extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.PRISM_STAR];
  public set: string = 'LOT';
  public name: string = 'Thunder Mountain Prism Star';
  public fullName: string = 'Thunder Mountain Prism Star LOT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '191';
  public text: string =
    "The attacks of [L] Pokémon (both yours and your opponent's) cost [L] less.\n\nWhenever any player plays an Item or Supporter card from their hand, prevent all effects of that card done to this Stadium card.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && StateUtils.getStadiumCard(state) === this) {
      const index = effect.cost.indexOf(CardType.LIGHTNING);
      const checkPokemonType = new CheckPokemonTypeEffect(effect.player.active);

      if (
        index === -1 ||
        IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active, this)
      ) {
        return state;
      }

      store.reduceEffect(state, checkPokemonType);

      if (checkPokemonType.cardTypes.includes(CardType.LIGHTNING)) {
        effect.cost.splice(index, 1);
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
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
