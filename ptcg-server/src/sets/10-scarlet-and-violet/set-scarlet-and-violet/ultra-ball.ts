import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { CardList } from '../../../game/store/state/card-list';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';
import { StateUtils } from '../../../game/store/state-utils';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { Player } from '../../../game/store/state/player';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: UltraBall,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  if (player.hand.cards.filter((c) => c !== self).length < 2 || player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const handTemp = new CardList();
  handTemp.cards = player.hand.cards.filter((c) => c !== self);

  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DISCARD,
      handTemp,
      {},
      { min: 2, max: 2, allowCancel: false },
    ),
    (selected) => {
      if (selected) {
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: selected });
      }
      next();
    },
  );

  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      { superType: SuperType.POKEMON },
      { min: 0, max: 1, allowCancel: false },
    ),
    (selected) => {
      if (selected && selected.length > 0) {
        MOVE_CARDS(store, state, player.deck, player.hand, { cards: selected, sourceCard: self });

        store.prompt(
          state,
          new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, selected),
          () => next(),
        );
      } else {
        next();
      }
    },
  );

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class UltraBall extends TrainerCard {
  public regulationMark = 'G';

  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'SVI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '196';

  public name: string = 'Ultra Ball';

  public fullName: string = 'Ultra Ball SVI';

  public text: string = `You can use this card only if you discard 2 other cards from your hand.

Search your deck for a Pokemon, reveal it, and put it into your hand. Then, shuffle your deck.`;

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    // Check if player has at least 2 other cards in hand (excluding Ultra Ball)
    const otherCards = player.hand.cards.filter((c) => c !== this);
    if (otherCards.length < 2) {
      return false;
    }

    // Check if deck has cards
    if (player.deck.cards.length === 0) {
      return false;
    }

    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }
    return state;
  }
}
