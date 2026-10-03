import { Card, CardType, ChooseCardsPrompt, GameMessage, PokemonCard, ShowCardsPrompt, ShuffleDeckPrompt, Stage, State, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useBugHunch(next: Function, store: StoreLike, state: State, effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;
  const opponent = effect.opponent;

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.deck,
    { superType: SuperType.POKEMON, stage: Stage.BASIC, cardType: [CardType.GRASS] },
    { min: 0, max: 2, allowCancel: true }
  ), selected => {
    cards = selected || [];
    next();
  });

  MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: effect.source.getPokemonCard()! });

  if (cards.length > 0) {
    yield store.prompt(state, new ShowCardsPrompt(
      opponent.id,
      GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
      cards
    ), () => next());
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export class Weedle extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 40;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Bug Hunch',
      cost: [G],
      damage: 0,
      text: 'Search your deck for up to 2 [G] Pokémon, reveal them, and put them into your hand. Then, shuffle your deck.'
    },
  ];

  public regulationMark: string = 'D';
  public set = 'VIV';
  public setNumber = '1';
  public cardImage = 'assets/cardback.png';
  public name = 'Weedle';
  public fullName = 'Weedle VIV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Bug Hunch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useBugHunch(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}