import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType, SuperType, CardTag } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { MoveCardsEffect, UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HeatFactoryPrismStar extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.PRISM_STAR];
  public set: string = 'LOT';
  public setNumber: string = '178';
  public name: string = 'Heat Factory Prism Star';
  public fullName: string = 'Heat Factory Prism Star LOT';
  public cardImage: string = 'assets/cardback.png';

  public text: string =
    "Once during each player's turn, that player may discard a [R] Energy card from their hand. If they do, they draw 3 cards.\n\nWhenever any player plays an Item or Supporter card from their hand, prevent all effects of that card done to this Stadium card.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const stadiumUsedTurn = player.stadiumUsedTurn;

      let hasCardsInHand = false;
      const blocked: number[] = [];
      player.hand.cards.forEach((c, index) => {
        if (c instanceof EnergyCard) {
          if (c.provides.includes(CardType.FIRE)) {
            hasCardsInHand = true;
          } else {
            blocked.push(index);
          }
        }
      });

      if (hasCardsInHand === false) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.ENERGY },
          { allowCancel: true, min: 1, max: 1, blocked },
        ),
        (selected) => {
          selected = selected || [];
          if (selected.length === 0) {
            player.stadiumUsedTurn = stadiumUsedTurn;
            return;
          }
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: selected, sourceCard: this });
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
        },
      );
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
