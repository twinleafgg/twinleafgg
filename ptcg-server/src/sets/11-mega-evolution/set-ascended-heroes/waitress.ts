import {
  TrainerCard,
  TrainerType,
  StoreLike,
  State,
  GameError,
  GameMessage,
  CardList,
  ChooseCardsPrompt,
  SuperType,
  EnergyType,
  AttachEnergyPrompt,
  PlayerType,
  SlotType,
  StateUtils,
  Player,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class Waitress extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '215';
  public name: string = 'Waitress';
  public fullName: string = 'Waitress MC';

  public text: string =
    'Look at the top 6 cards of your deck, and attach a Basic Energy you find there to 1 of your Pokémon. Shuffle the other cards back into your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const deckTop = new CardList();
      const cardsToLook = Math.min(6, player.deck.cards.length);
      MOVE_CARDS(store, state, player.deck, deckTop, { count: cardsToLook, sourceCard: this });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          deckTop,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: 1, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length > 0) {
            // Attach the selected energy
            return store.prompt(
              state,
              new AttachEnergyPrompt(
                player.id,
                GameMessage.ATTACH_ENERGY_CARDS,
                deckTop,
                PlayerType.BOTTOM_PLAYER,
                [SlotType.ACTIVE, SlotType.BENCH],
                {},
                { allowCancel: false, min: 1, max: 1 },
              ),
              (transfers) => {
                transfers = transfers || [];
                if (transfers.length > 0) {
                  for (const transfer of transfers) {
                    const target = StateUtils.getTarget(state, player, transfer.to);
                    MOVE_CARDS(store, state, deckTop, target, {
                      cards: [transfer.card],
                      sourceCard: this,
                    });
                  }
                }
                // Put remaining cards back into deck
                MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: this });
                SHUFFLE_DECK(store, state, player);
              },
            );
          } else {
            // No energy selected, put all cards back
            MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: this });
            SHUFFLE_DECK(store, state, player);
          }
        },
      );
    }
    return state;
  }
}
