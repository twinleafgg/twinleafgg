import { TrainerCard } from '../../game/store/card/trainer-card';
import { Stage, SuperType, TrainerType } from '../../game/store/card/card-types';
import {
  StoreLike,
  State,
  ChooseCardsPrompt,
  GameMessage,
  GameError,
  StateUtils,
  SelectOptionPrompt,
  PokemonCard,
} from '../../game';
import { Effect } from '../../game/store/effects/effect';
import {
  PlayPokemonFromDeckEffect,
  TrainerEffect,
} from '../../game/store/effects/play-card-effects';
import { DRAW_CARDS, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { SHUFFLE_DECK } from '../../game/store/prefabs/prefabs';

export class Challenge extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'TR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public name: string = 'Challenge!';
  public fullName: string = 'Challenge! TR';

  public text: string =
    "Ask your opponent if he or she accepts your challenge. If your opponent declines (or if both Benches are full), draw 2 cards. If your opponent accepts, each of you searches your decks for any number of Basic Pokémon cards and puts them face down onto your Benches. (A player can't do this if his or her Bench is full.) When you both have finished, shuffle your decks and turn those cards face up.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      const playerOpenSlots = player.bench.filter((b) => b.cards.length === 0);
      const opponentOpenSlots = opponent.bench.filter((b) => b.cards.length === 0);

      if (playerOpenSlots.length === 0 && opponentOpenSlots.length === 0) {
        if (player.deck.cards.length === 0) {
          throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
        } else {
          DRAW_CARDS(store, state, player, 2);
        }
        return state;
      }

      state = store.prompt(
        state,
        new SelectOptionPrompt(
          opponent.id,
          GameMessage.CHOOSE_OPTION,
          ['I accept the challenge!', 'I decline the challenge!'],
          {
            allowCancel: false,
            defaultValue: 0,
          },
        ),
        (choice) => {
          if (choice === 0) {
            // Challenge accepted
            store.prompt(
              state,
              [
                new ChooseCardsPrompt(
                  player,
                  GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
                  player.deck,
                  { superType: SuperType.POKEMON, stage: Stage.BASIC },
                  { min: 0, max: playerOpenSlots.length, allowCancel: false },
                ),
                new ChooseCardsPrompt(
                  opponent,
                  GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
                  opponent.deck,
                  { superType: SuperType.POKEMON, stage: Stage.BASIC },
                  { min: 0, max: opponentOpenSlots.length, allowCancel: false },
                ),
              ],
              (results) => {
                const playerCards = results[0] || [];
                const opponentCards = results[1] || [];

                playerCards.forEach((card, index) => {
                  store.reduceEffect(
                    state,
                    new PlayPokemonFromDeckEffect(
                      player,
                      card as PokemonCard,
                      playerOpenSlots[index],
                    ),
                  );
                });

                opponentCards.forEach((card, index) => {
                  store.reduceEffect(
                    state,
                    new PlayPokemonFromDeckEffect(
                      opponent,
                      card as PokemonCard,
                      opponentOpenSlots[index],
                    ),
                  );
                });

                SHUFFLE_DECK(store, state, player);
                SHUFFLE_DECK(store, state, opponent);
              },
            );
          } else {
            // Challenge declined
            DRAW_CARDS(store, state, player, 2);
          }
        },
      );
    }
    return state;
  }
}
