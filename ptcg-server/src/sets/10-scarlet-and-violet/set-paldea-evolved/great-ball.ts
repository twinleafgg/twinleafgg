import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  CardList,
  GameMessage,
  ShuffleDeckPrompt,
  ChooseCardsPrompt,
  ShowCardsPrompt,
  StateUtils,
  GameError,
  Player,
} from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GreatBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public regulationMark = 'G';

  public set: string = 'PAL';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '183';

  public name: string = 'Great Ball';

  public fullName: string = 'Great Ball PAL';

  public text: string =
    'Look at the top 7 cards of your deck. You may reveal a Pokémon you find there and put it into your hand. Shuffle the other cards back into your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return player.deck.cards.length > 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const temp = new CardList();

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      MOVE_CARDS(store, state, player.deck, temp, { count: 7, sourceCard: this });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          temp,
          { superType: SuperType.POKEMON },
          { allowCancel: false, min: 0, max: 1 },
        ),
        (chosenCards) => {
          if (chosenCards.length <= 0) {
            // No Pokemon chosen, shuffle all back
            temp.cards.forEach((card) => {
              MOVE_CARDS(store, state, temp, player.deck, { sourceCard: this });
              MOVE_CARDS(store, state, player.supporter, player.discard, {
                cards: [this],
                sourceCard: this,
              });
            });
          }

          if (chosenCards.length > 0) {
            // Move chosen Pokemon to hand
            const pokemon = chosenCards[0];
            MOVE_CARDS(store, state, temp, player.hand, { cards: [pokemon], sourceCard: this });
            MOVE_CARDS(store, state, temp, player.deck, { sourceCard: this });
            MOVE_CARDS(store, state, player.supporter, player.discard, {
              cards: [this],
              sourceCard: this,
            });

            if (chosenCards.length > 0) {
              state = store.prompt(
                state,
                new ShowCardsPrompt(
                  opponent.id,
                  GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                  chosenCards,
                ),
                () => state,
              );
            }
          }
          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [this],
            sourceCard: this,
          });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }
    return state;
  }
}
