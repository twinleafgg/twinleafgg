import { CardTag, Stage, TrainerType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  GameError,
  GameMessage,
  Card,
  TrainerCard,
  ChooseCardsPrompt,
  CardList,
  Player,
  State,
  StoreLike,
} from '../../../game';
import {
  MOVE_CARDS,
  SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND,
} from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: QuickBall,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  let cards: Card[] = [];

  cards = player.hand.cards.filter((c) => c !== self);
  if (cards.length < 1) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }
  if (cards.length === 1) {
    MOVE_CARDS(store, state, player.hand, player.discard, { cards: [cards[0]], sourceCard: self });
  }

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;
  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: self,
  });

  // prepare card list without Junk Arm
  const handTemp = new CardList();
  handTemp.cards = player.hand.cards.filter((c) => c !== self);
  if (cards.length > 1) {
    yield store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        handTemp,
        {},
        { min: 1, max: 1, allowCancel: false },
      ),
      (selected) => {
        cards = selected || [];

        next();
      },
    );
  }

  // Operation canceled by the user
  if (cards.length === 0) {
    return state;
  }

  MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: self });

  SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
    store,
    state,
    player,
    { stage: Stage.BASIC },
    { min: 0, max: 1, allowCancel: false },
  );

  return state;
}

export class QuickBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public regulationMark = 'D';
  public set: string = 'SSH';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '179';
  public name: string = 'Quick Ball';
  public fullName: string = 'Quick Ball SSH';

  public text: string =
    'You can play this card only if you discard another card from your hand. ' +
    'Search your deck for a Basic Pokemon, reveal it, and put it into your ' +
    'hand. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const otherCards = player.hand.cards.filter((c) => c !== this);
    if (otherCards.length < 1) {
      return false;
    }
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}
