import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  AttachEnergyPrompt,
  CardList,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  Player,
  PlayerType,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  SlotType,
  StateUtils,
} from '../../../game';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Crispin extends TrainerCard {
  public regulationMark = 'H';

  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'SCR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '133';

  public name: string = 'Crispin';

  public fullName: string = 'Crispin SCR';

  public text: string =
    'Search your deck for up to 2 Basic Energy cards of different types, reveal them, and put 1 of them into your hand. Attach the other to 1 of your Pokémon. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const cardList = new CardList();
      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: 2, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length > 1) {
            if (cards[0].name === cards[1].name) {
              throw new GameError(GameMessage.CAN_ONLY_SELECT_TWO_DIFFERENT_ENERGY_TYPES);
            }
          }

          store.prompt(
            state,
            new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, selected),
            () => state,
          );

          MOVE_CARDS(store, state, player.deck, cardList, { cards: cards, sourceCard: this });

          if (cardList.cards.length === 2) {
            state = store.prompt(
              state,
              new AttachEnergyPrompt(
                player.id,
                GameMessage.ATTACH_ENERGY_CARDS,
                cardList,
                PlayerType.BOTTOM_PLAYER,
                [SlotType.BENCH, SlotType.ACTIVE],
                { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
                { allowCancel: false, min: 1, max: 1, differentTargets: true },
              ),
              (transfers) => {
                transfers = transfers || [];

                for (const transfer of transfers) {
                  const target = StateUtils.getTarget(state, player, transfer.to);
                  MOVE_CARDS(store, state, cardList, target, {
                    cards: [transfer.card],
                    sourceCard: this,
                  });
                }

                // Move the remaining card to the player's hand
                const remainingCard = cardList.cards[0];
                MOVE_CARDS(store, state, cardList, player.hand, {
                  cards: [remainingCard],
                  sourceCard: this,
                });
              },
            );
          }

          if (cardList.cards.length === 1) {
            const remainingCard = cardList.cards[0];
            MOVE_CARDS(store, state, cardList, player.hand, {
              cards: [remainingCard],
              sourceCard: this,
            });
          }

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
            return state;
          });
        },
      );
    }
    return state;
  }
}
