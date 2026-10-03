import { Card, ChooseCardsPrompt, ShowCardsPrompt } from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { DiscardToHandEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class PowerTree extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'LM';
  public name = 'Power Tree';
  public fullName = 'Power Tree LM';

  public text =
    "Once during each player's turn, if the player has no Special Energy cards in his or her discard pile, that player searches his or her discard pile for a basic Energy card, show it to the opponent, and put it into his or her hand.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if DiscardToHandEffect is prevented
      const discardEffect = new DiscardToHandEffect(player, this);
      store.reduceEffect(state, discardEffect);

      if (discardEffect.preventDefault) {
        return state;
      }

      let basicEnergyInDiscard: number = 0;
      let specialEnergyInDiscard: number = 0;
      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        if (c.superType === SuperType.ENERGY) {
          if (c.energyType === EnergyType.BASIC) {
            basicEnergyInDiscard += 1;
          }
          if (c.energyType === EnergyType.SPECIAL) {
            specialEnergyInDiscard += 1;
          }
        } else {
          blocked.push(index);
        }
      });

      if (specialEnergyInDiscard !== 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      if (basicEnergyInDiscard === 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      let cards: Card[] = [];
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: 1, allowCancel: false, blocked },
        ),
        (selectedCards) => {
          cards = selectedCards || [];

          // Operation canceled by the user
          if (cards.length === 0) {
            return state;
          }

          if (cards.length > 0) {
            store.prompt(
              state,
              new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
              () => {
                cards.forEach((card, index) => {
                  MOVE_CARDS(store, state, player.discard, player.hand, {
                    cards: [card],
                    sourceCard: this,
                  });
                });
              },
            );
          }
        },
      );
    }

    return state;
  }
}
