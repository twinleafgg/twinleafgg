import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ShuffleDeckPrompt, ChooseCardsPrompt, GameError, Card, CardList, OrderCardsPrompt } from '../../../game';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useTimeControl(next: Function, store: StoreLike, state: State,
  effect: AttackEffect): IterableIterator<State> {

  const player = effect.player;
  let cards: Card[] = [];

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const deckTop = new CardList();

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.deck,
    {},
    { min: 2, max: 2, allowCancel: false }
  ), selected => {
    cards = selected || [];
    next();
  });

  MOVE_CARDS(store, state, player.deck, deckTop, { cards: cards, sourceCard: effect.source.getPokemonCard()! });

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);

    return store.prompt(state, new OrderCardsPrompt(
      player.id,
      GameMessage.CHOOSE_CARDS_ORDER,
      deckTop,
      { allowCancel: false },
    ), order => {
      if (order === null) {
        return state;
      }
      deckTop.applyOrder(order);
      deckTop.moveToTopOfDestination(player.deck);
    });
  });
}

export class Dialga extends PokemonCard {

  public regulationMark = 'H';

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 130;

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Time Manipulation',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'Search your deck for 2 cards. Shuffle the rest of your deck and place those two cards on top of your deck in any order.'
    },
    {
      name: 'Buster Tail',
      cost: [CardType.PSYCHIC, CardType.METAL, CardType.COLORLESS],
      damage: 160,
      text: ''
    },
  ];

  public set: string = 'SSP';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '135';

  public name: string = 'Dialga';

  public fullName: string = 'Dialga SSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useTimeControl(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}