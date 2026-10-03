import {
  Card,
  CardList,
  GameError,
  GameMessage,
  OrderCardsPrompt,
  PokemonCard,
  ShowCardsPrompt,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { State } from '../../../game/store/state/state';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MaxRevive extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'GEN'; // Replace with the appropriate set abbreviation

  public name: string = 'Max Revive';

  public fullName: string = 'Max Revive GEN'; // Replace with the appropriate set abbreviation

  public cardImage: string = 'assets/cardback.png'; // Replace with the appropriate card image path

  public setNumber: string = '65'; // Replace with the appropriate set number

  public text: string = 'Put a Pokémon from your discard pile on top of your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      let pokemonInDiscard: number = 0;
      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        const isPokemon = c instanceof PokemonCard;
        if (isPokemon) {
          pokemonInDiscard += 1;
        } else {
          blocked.push(index);
        }
      });

      // Player does not have correct cards in discard
      if (pokemonInDiscard === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      let cards: Card[] = [];
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARDS_TO_PUT_ON_TOP_OF_THE_DECK,
          player.discard,
          { superType: SuperType.POKEMON },
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
          if (cards.length > 0) {
            const deckTop = new CardList();

            cards.forEach((card) => {
              MOVE_CARDS(store, state, player.discard, deckTop, {
                cards: [card],
                sourceCard: this,
              });
            });

            return store.prompt(
              state,
              new OrderCardsPrompt(player.id, GameMessage.CHOOSE_CARDS_ORDER, deckTop, {
                allowCancel: false,
              }),
              (order) => {
                if (order === null) {
                  return state;
                }

                deckTop.applyOrder(order);
                deckTop.moveToTopOfDestination(player.deck);

                if (cards.length > 0) {
                  const opponent = StateUtils.getOpponent(state, player);
                  return store.prompt(
                    state,
                    new ShowCardsPrompt(
                      opponent.id,
                      GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                      cards,
                    ),
                    () => state,
                  );
                }

                return state;
              },
            );
          }
        },
      );
    }

    return state;
  }
}
