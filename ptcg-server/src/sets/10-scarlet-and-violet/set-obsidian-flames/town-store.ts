import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { Card, ChooseCardsPrompt, ShowCardsPrompt, ShuffleDeckPrompt } from '../../../game';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useStadium(
  next: Function,
  store: StoreLike,
  state: State,
  effect: UseStadiumEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  } else {
    // handle no open slots

    let cards: Card[] = [];
    return store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.TRAINER, trainerType: TrainerType.TOOL },
        { min: 0, max: 1, allowCancel: true },
      ),
      (selectedCards) => {
        cards = selectedCards || [];

        // Operation canceled by the user
        if (cards.length === 0) {
          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
            return state;
          });
        }

        cards.forEach((card, index) => {
          MOVE_CARDS(store, state, player.deck, player.hand, {
            cards: [card],
            sourceCard: effect.stadium,
          });
        });

        if (cards.length > 0) {
          state = store.prompt(
            state,
            new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
            () => next(),
          );
        }

        return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
          player.deck.applyOrder(order);
          return state;
        });
      },
    );
  }
}

export class TownStore extends TrainerCard {
  public regulationMark = 'G';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '196';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'OBF';

  public name = 'Town Store';

  public fullName = 'Town Store OBF';

  public text =
    "Once during each player's turn, that player may search their deck for a Pokémon Tool card, reveal it, and put it into their hand. Then, that player shuffles their deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const generator = useStadium(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
