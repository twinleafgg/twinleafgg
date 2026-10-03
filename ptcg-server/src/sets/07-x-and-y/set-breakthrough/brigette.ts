import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  PokemonCard,
  PokemonCardList,
  ShuffleDeckPrompt,
  State,
  StoreLike,
} from '../../../game';
import { CardTag, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Brigette extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'BKT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '134';

  public regulationMark = 'E';

  public name: string = 'Brigette';

  public fullName: string = 'Brigette BKT';

  public text: string =
    'Search your deck for 1 Basic Pokémon-EX or 3 Basic Pokémon (except for Pokémon-EX) and put them onto your Bench. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      // Allow player to search deck and choose up to 2 Basic Pokemon
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      } else {
        // Check if bench has open slots
        const openSlots = player.bench.filter((b) => b.cards.length === 0);

        if (openSlots.length === 0) {
          // No open slots, throw error
          throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
        }

        const blocked: number[] = [];
        player.deck.cards.forEach((c, index) => {
          // Block any card that is not a Basic Pokémon (EX or non-EX allowed)
          if (c instanceof PokemonCard && c.stage === Stage.BASIC) {
            // allowed
          } else {
            blocked.push(index);
          }
        });

        MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
        // We will discard this card after prompt confirmation
        effect.preventDefault = true;

        let cards: Card[] = [];

        const maxCards = Math.min(3, openSlots.length);

        return store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
            player.deck,
            { superType: SuperType.POKEMON, stage: Stage.BASIC },
            { min: 0, max: maxCards, allowCancel: false, blocked },
          ),
          (selectedCards) => {
            cards = selectedCards || [];

            // If an EX was chosen together with other cards, re-prompt to choose a single Basic Pokémon (EX or non-EX)
            if (
              cards.length > 1 &&
              cards.some((card) => (card as PokemonCard).hasTag(CardTag.POKEMON_EX))
            ) {
              return store.prompt(
                state,
                new ChooseCardsPrompt(
                  player,
                  GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
                  player.deck,
                  { superType: SuperType.POKEMON, stage: Stage.BASIC },
                  { min: 1, max: 1, allowCancel: false, blocked },
                ),
                (singleCards) => {
                  const chosen = singleCards || [];
                  if (chosen.length === 0) {
                    return state;
                  }

                  MOVE_CARDS(store, state, player.deck, slots[0], {
                    cards: [chosen[0]],
                    sourceCard: this,
                  });
                  slots[0].pokemonPlayedTurn = state.turn;

                  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                    player.deck.applyOrder(order);
                  });
                },
              );
            }

            // Move each selected card specifically (don't move the whole deck)
            cards.forEach((card, index) => {
              MOVE_CARDS(store, state, player.deck, slots[index], {
                cards: [card],
                sourceCard: this,
              });
              slots[index].pokemonPlayedTurn = state.turn;
            });

            return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
              player.deck.applyOrder(order);
            });
          },
        );
      }
    }

    return state;
  }
}
