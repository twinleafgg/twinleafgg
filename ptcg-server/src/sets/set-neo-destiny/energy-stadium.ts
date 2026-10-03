import { Card, ChooseCardsPrompt, EnergyCard } from '../../game';
import { GameError } from '../../game/game-error';
import { GameMessage } from '../../game/game-message';
import { EnergyType, SuperType, TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { UseStadiumEffect } from '../../game/store/effects/game-effects';
import { DiscardToHandEffect } from '../../game/store/effects/play-card-effects';
import {
  COIN_FLIP_PROMPT,
  SHOW_CARDS_TO_PLAYER,
  MOVE_CARDS,
} from '../../game/store/prefabs/prefabs';
import { StateUtils } from '../../game/store/state-utils';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class EnergyStadium extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '99';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'N4';
  public name = 'Energy Stadium';
  public fullName = 'Energy Stadium N4';

  public text =
    "Once during each player's turn (before attacking), that player may flip a coin. If heads, that player puts a basic Energy card from his or her discard pile into his or her hand.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      // Check if DiscardToHandEffect is prevented
      const discardEffect = new DiscardToHandEffect(player, this);
      store.reduceEffect(state, discardEffect);

      if (discardEffect.preventDefault) {
        // If prevented, just discard the card and return
        MOVE_CARDS(store, state, player.supporter, player.discard, {
          cards: [effect.stadium],
          sourceCard: this,
        });
        return state;
      }

      const opponent = StateUtils.getOpponent(state, player);

      let basicEnergyInDiscard: number = 0;
      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        const isPokemon = c instanceof EnergyCard && c.energyType === EnergyType.BASIC;
        if (isPokemon) {
          basicEnergyInDiscard += 1;
        } else {
          blocked.push(index);
        }
      });

      if (basicEnergyInDiscard === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (result) {
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
                SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
              }

              cards.forEach((card, index) => {
                MOVE_CARDS(store, state, player.discard, player.hand, {
                  cards: [card],
                  sourceCard: this,
                });
              });
            },
          );
        }
      });
    }

    return state;
  }
}
