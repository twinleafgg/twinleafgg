import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  Card,
  ChooseCardsPrompt,
  PokemonCard,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  StateUtils,
} from '../../../game';

import { COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class CapturingAroma extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'SIT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '153';

  public regulationMark = 'F';

  public name: string = 'Capturing Aroma';
  public fullName: string = 'Capturing Aroma SIT';

  public text: string =
    'Flip a coin. If heads, search your deck for an Evolution Pokémon, reveal it, and put it into your hand. If tails, search your deck for a Basic Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && (card.evolvesFrom === '' || card.stage === Stage.LV_X)) {
          blocked.push(index);
        }
      });

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      return COIN_FLIP_PROMPT(store, state, player, (flipResult) => {
        if (flipResult) {
          let cards: Card[] = [];
          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_HAND,
              player.deck,
              { superType: SuperType.POKEMON },
              { min: 0, max: 1, allowCancel: false, blocked },
            ),
            (selectedCards) => {
              cards = selectedCards || [];

              // Operation canceled by the user
              if (cards.length === 0) {
                MOVE_CARDS(store, state, player.supporter, player.discard, {
                  cards: [this],
                  sourceCard: this,
                });
                return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                  player.deck.applyOrder(order);
                });
              }

              if (cards.length > 0) {
                MOVE_CARDS(store, state, player.supporter, player.discard, {
                  cards: [this],
                  sourceCard: this,
                });
                state = store.prompt(
                  state,
                  new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
                  () => state,
                );
              }

              cards.forEach((card) => {
                MOVE_CARDS(store, state, player.deck, player.hand, {
                  cards: [card],
                  sourceCard: this,
                });
              });
              return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                player.deck.applyOrder(order);
              });
            },
          );
        }
        if (!flipResult) {
          let cards: Card[] = [];
          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_HAND,
              player.deck,
              { superType: SuperType.POKEMON, stage: Stage.BASIC },
              { min: 0, max: 1, allowCancel: false },
            ),
            (selectedCards) => {
              cards = selectedCards || [];

              // Operation canceled by the user
              if (cards.length === 0) {
                MOVE_CARDS(store, state, player.supporter, player.discard, {
                  cards: [this],
                  sourceCard: this,
                });
                return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                  player.deck.applyOrder(order);
                });
              }

              if (cards.length > 0) {
                MOVE_CARDS(store, state, player.supporter, player.discard, {
                  cards: [this],
                  sourceCard: this,
                });
                state = store.prompt(
                  state,
                  new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
                  () => state,
                );
              }
              cards.forEach((card) => {
                MOVE_CARDS(store, state, player.deck, player.hand, {
                  cards: [card],
                  sourceCard: this,
                });
              });
              return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                player.deck.applyOrder(order);
              });
            },
          );
        }
        return state;
      });
    }
    return state;
  }
}
