import {
  ChooseCardsPrompt,
  GameError,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  StateUtils,
} from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { CardTag, EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { SelectOptionPrompt } from '../../../game/store/prompts/select-option-prompt';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: GuzmaAndHala,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  const supporterTurn = player.supporterTurn;

  if (supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: self });
  effect.preventDefault = true;

  // If player has less than 2 cards in hand (excluding this card), only allow stadium search
  if (player.hand.cards.length < 2) {
    // Search for stadium only
    const blocked: number[] = [];
    player.deck.cards.forEach((card, index) => {
      if (!(card instanceof TrainerCard && card.trainerType === TrainerType.STADIUM)) {
        blocked.push(index);
      }
    });

    state = store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        {},
        { allowCancel: false, min: 0, max: 1, maxStadiums: 1, blocked },
      ),
      (cards) => {
        cards = cards || [];
        MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: self });

        if (cards.length > 0) {
          state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
            return state;
          });
        }

        return store.prompt(
          state,
          new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
          () => state,
        );
      },
    );

    return state;
  }

  // Show options prompt for players with 2+ cards
  state = store.prompt(
    state,
    new SelectOptionPrompt(
      player.id,
      GameMessage.CHOOSE_OPTION,
      [
        'Search for a Stadium card from your deck',
        'Discard 2 cards from your hand. Search for a Pokemon Tool and Special Energy from your deck',
      ],
      {
        allowCancel: false,
        defaultValue: 0,
      },
    ),
    (choice) => {
      if (choice === 0) {
        // Option 1: Just search for stadium
        const blocked: number[] = [];
        player.deck.cards.forEach((card, index) => {
          if (!(card instanceof TrainerCard && card.trainerType === TrainerType.STADIUM)) {
            blocked.push(index);
          }
        });

        state = store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.deck,
            {},
            { allowCancel: false, min: 0, max: 1, maxStadiums: 1, blocked },
          ),
          (cards) => {
            cards = cards || [];
            MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: self });

            if (cards.length > 0) {
              state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                player.deck.applyOrder(order);
                return state;
              });
            }

            return store.prompt(
              state,
              new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
              () => state,
            );
          },
        );
      } else if (choice === 1) {
        // Option 2: Discard 2 cards and search for multiple card types
        state = store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            player.hand,
            {},
            { allowCancel: false, min: 2, max: 2 },
          ),
          (cards) => {
            cards = cards || [];
            MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: self });

            // Search for tool, special energy, and stadium
            const blocked: number[] = [];
            player.deck.cards.forEach((card, index) => {
              if (
                !(
                  (card.superType === SuperType.ENERGY && card.energyType === EnergyType.SPECIAL) ||
                  (card instanceof TrainerCard && card.trainerType === TrainerType.TOOL) ||
                  (card instanceof TrainerCard && card.trainerType === TrainerType.STADIUM)
                )
              ) {
                blocked.push(index);
              }
            });

            return store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.deck,
                {},
                {
                  allowCancel: false,
                  min: 0,
                  max: 3,
                  maxSpecialEnergies: 1,
                  maxTools: 1,
                  maxStadiums: 1,
                  blocked,
                },
              ),
              (cards) => {
                cards = cards || [];
                MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: self });

                if (cards.length > 0) {
                  state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                    player.deck.applyOrder(order);
                    return state;
                  });
                }

                return store.prompt(
                  state,
                  new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
                  () => state,
                );
              },
            );
          },
        );
      }
    },
  );

  return state;
}

export class GuzmaAndHala extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'CEC';

  protected _tags = [CardTag.TAG_TEAM];

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '193';

  public name: string = 'Guzma & Hala';

  public fullName: string = 'Guzma & Hala CEC';

  public text: string = `Search your deck for a Stadium card, reveal it, and put it into your hand. Then, shuffle your deck.

When you play this card, you may discard 2 other cards from your hand. If you do, you may also search for a Pokémon Tool card and a Special Energy card in this way.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }
    return state;
  }
}
