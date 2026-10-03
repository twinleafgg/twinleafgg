import { GameError, SelectOptionPrompt, StateUtils } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { Card } from '../../../game/store/card/card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  MOVE_CARDS,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK,
} from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class HolonTransceiver extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '98';
  public name: string = 'Holon Transceiver';
  public fullName: string = 'Holon Transceiver DS';
  public text: string =
    'Search your deck for a Supporter card that has Holon in its name, show it to your opponent, and put it into your hand. Shuffle your deck afterward. Or, search your discard pile for a Supporter card that has Holon in its name, show it to your opponent, and put it into your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const holonInDiscard = player.discard.cards.some(
        (c) =>
          c instanceof TrainerCard &&
          c.trainerType === TrainerType.SUPPORTER &&
          c.name.includes('Holon'),
      );

      if (player.deck.cards.length === 0 && holonInDiscard === false) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const options: { message: GameMessage; action: () => void }[] = [];

      if (player.deck.cards.length > 0) {
        options.push({
          message: GameMessage.CHOOSE_CARD_FROM_DECK,
          action: () => {
            let cards: Card[] = [];

            const blocked = player.deck.cards
              .filter((c) => !c.name.includes('Holon'))
              .map((c) => player.deck.cards.indexOf(c));

            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.deck,
                { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
                { min: 0, max: 1, allowCancel: false, blocked },
              ),
              (selected) => {
                cards = selected || [];
                SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
                MOVE_CARDS(store, state, player.deck, player.hand, {
                  cards: cards,
                  sourceCard: this,
                });
                SHUFFLE_DECK(store, state, player);
              },
            );
          },
        });
      }

      if (holonInDiscard) {
        options.push({
          message: GameMessage.CHOOSE_CARD_FROM_DISCARD,
          action: () => {
            let cards: Card[] = [];

            const blocked = player.discard.cards
              .filter((c) => !c.name.includes('Holon'))
              .map((c) => player.discard.cards.indexOf(c));

            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.discard,
                { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
                { min: 1, max: 1, allowCancel: false, blocked },
              ),
              (selected) => {
                cards = selected || [];
                SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
                MOVE_CARDS(store, state, player.discard, player.hand, {
                  cards: cards,
                  sourceCard: this,
                });
              },
            );
          },
        });
      }

      if (options.length === 1) {
        options[0].action();
      } else {
        return store.prompt(
          state,
          new SelectOptionPrompt(
            player.id,
            GameMessage.CHOOSE_OPTION,
            [
              'Search your deck for a Supporter card that has Holon in its name',
              'Search your discard pile for a Supporter card that has Holon in its name',
            ],
            {
              allowCancel: true,
            },
          ),
          (choice) => {
            const option = options[choice];
            option.action();
          },
        );
      }
    }
    return state;
  }
}
