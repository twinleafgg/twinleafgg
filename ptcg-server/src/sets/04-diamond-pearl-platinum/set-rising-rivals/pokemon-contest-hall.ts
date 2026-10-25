import { Card, ChooseCardsPrompt, GameError, GameMessage, PokemonCardList, State, StateUtils, StoreLike } from '../../../game';
import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { COIN_FLIP_PROMPT, CONFIRMATION_PROMPT, MOVE_CARD_TO, SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';

export class PokemonContestHall extends TrainerCard {
  protected _trainerType = TrainerType.STADIUM;
  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';
  public name: string = 'Pokémon Contest Hall';
  public fullName: string = 'Pokémon Contest Hall RR';
  public text: string = 'Once during each player\'s turn, if that player\'s Bench isn\'t full, the player may flip a coin. If heads, that player searches his or her deck for a Basic Pokémon and puts it onto his or her Bench. If the player does, he or she may search his or her deck for a Pokémon Tool card and attach it to that Pokémon. If that player searched his or her deck, the player shuffles his or her deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }
      if (slots.length == 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (result) {
          let cards: Card[] = [];
          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
              player.deck,
              { superType: SuperType.POKEMON, stage: Stage.BASIC },
              { min: 0, max: 1, allowCancel: false },
            ),
            (selectedCards) => {
              cards = selectedCards || [];

              // Operation canceled by the user
              if (cards.length === 0) {
                SHUFFLE_DECK(store, state, player);
              } else {
                cards.forEach((card, index) => {
                  MOVE_CARD_TO(state, card, slots[index]);
                  slots[index].pokemonPlayedTurn = state.turn;

                  CONFIRMATION_PROMPT(store, state, player, (result) => {
                    if (result) {
                      return store.prompt(
                        state,
                        new ChooseCardsPrompt(
                          player,
                          GameMessage.CHOOSE_CARD_TO_ATTACH,
                          player.deck,
                          { superType: SuperType.TRAINER, trainerType: TrainerType.TOOL },
                          { min: 0, max: 1, allowCancel: false },
                        ),
                        (selectedCards) => {
                          if (selectedCards.length > 0) {
                            selectedCards.forEach((card) => {
                              MOVE_CARD_TO(state, card, slots[index]);
                              slots[index].tools.push(card);
                            });
                          }
                          SHUFFLE_DECK(store, state, player);
                        },
                      );
                    }
                  });
                });
              }
              SHUFFLE_DECK(store, state, player);
            },
          );
        }
      });
    }
    return state;
  }
}
