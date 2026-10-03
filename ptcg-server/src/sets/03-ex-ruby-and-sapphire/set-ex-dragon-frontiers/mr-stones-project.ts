import {
  StoreLike,
  State,
  GameError,
  GameMessage,
  Card,
  ChooseCardsPrompt,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  StateUtils,
  SelectPrompt,
} from '../../../game';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MrStonesProject extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'DF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '77';
  public name: string = "Mr. Stone's Project";
  public fullName: string = "Mr. Stone's Project DF";
  public text =
    'Search your deck for up to 2 Basic cards, show them to your opponent, and put them into your hand. Shuffle your deck afterward. Or, search your discard pile for up to 2 Basic cards, show them to your opponent, and put them into your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      const options: { message: GameMessage; action: () => void }[] = [
        {
          message: GameMessage.CHOOSE_ENERGY_FROM_DECK,
          action: () => {
            let cards: Card[] = [];
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.deck,
                { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
                { min: 0, max: 2, allowCancel: false },
              ),
              (selected) => {
                cards = selected || [];

                if (cards.length > 0) {
                  store.prompt(
                    state,
                    new ShowCardsPrompt(
                      opponent.id,
                      GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                      cards,
                    ),
                    () => {},
                  );
                }

                MOVE_CARDS(store, state, player.deck, player.hand, {
                  cards: cards,
                  sourceCard: this,
                });

                store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                  player.deck.applyOrder(order);
                });
              },
            );

            return state;
          },
        },
        {
          message: GameMessage.CHOOSE_ENERGY_FROM_DISCARD,
          action: () => {
            let cards: Card[] = [];
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.discard,
                { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
                { min: 0, max: 2, allowCancel: false },
              ),
              (selected) => {
                cards = selected || [];

                if (cards.length > 0) {
                  store.prompt(
                    state,
                    new ShowCardsPrompt(
                      opponent.id,
                      GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                      cards,
                    ),
                    () => {},
                  );
                }

                MOVE_CARDS(store, state, player.discard, player.hand, {
                  cards: cards,
                  sourceCard: this,
                });
              },
            );

            return state;

          }
        }
      ];

      return store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.CHOOSE_OPTION,
          options.map((opt) => opt.message),
          { allowCancel: false },
        ),
        (choice) => {
          const option = options[choice];
          option.action();
        },
      );
    }

    return state;
  }
}
