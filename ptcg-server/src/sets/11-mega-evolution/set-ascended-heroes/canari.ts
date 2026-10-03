import {
  StoreLike,
  State,
  StateUtils,
  GameError,
  GameMessage,
  CardList,
  ChooseCardsPrompt,
  PokemonCard,
  CardType,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  TrainerCard,
  TrainerType,
  Player,
  Card,
  pokemonHasCardType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: Canari,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  const supporterTurn = player.supporterTurn;

  if (supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  // Check if player has at least 1 other card in hand (excluding Canari)
  const otherCards = player.hand.cards.filter((c) => c !== self);
  if (otherCards.length < 1) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;
  MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: self });

  // Prepare card list without Canari for discard prompt
  const handTemp = new CardList();
  handTemp.cards = player.hand.cards.filter((c) => c !== self);

  let discardCards: Card[] = [];
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
      discardCards = selected || [];
      next();
    },
  );

  // Operation canceled by the user
  if (discardCards.length === 0) {
    return state;
  }

  MOVE_CARDS(store, state, player.hand, player.discard, { cards: discardCards, sourceCard: self });

  // Build blocked indices array for non-Lightning Pokemon
  let lightningPokemonCount = 0;
  const blocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (card instanceof PokemonCard && pokemonHasCardType(card, CardType.LIGHTNING)) {
      lightningPokemonCount += 1;
    } else {
      blocked.push(index);
    }
  });

  // Search deck for up to 4 Lightning Pokemon
  let cards: Card[] = [];
  const maxCards = Math.min(lightningPokemonCount, 4);

  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      {},
      { min: 0, max: maxCards, allowCancel: false, blocked },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: self });

  if (cards.length > 0) {
    yield store.prompt(
      state,
      new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
      () => next(),
    );
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class Canari extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '185';
  public name: string = 'Canari';
  public fullName: string = 'Canari M2a';
  public text: string = `You can use this card only if you discard another card from your hand.
  
  Search your deck for up to 4 [L] Pokémon, reveal them, and put them into your hand. Then, shuffle your deck.`;

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    const otherCards = player.hand.cards.filter((c) => c !== this);
    if (otherCards.length < 1) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      effect.player.playedCanari = true;
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.playedCanari = false;
    }

    return state;
  }
}
