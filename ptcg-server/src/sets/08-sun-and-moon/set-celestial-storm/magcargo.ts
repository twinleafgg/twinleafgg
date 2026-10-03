import { PlayerType } from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Card } from '../../../game/store/card/card';
import { BoardEffect, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { CardList } from '../../../game/store/state/card-list';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useSmoothOver(next: Function, store: StoreLike, state: State,
  self: Magcargo, effect: PowerEffect): IterableIterator<State> {
  const player = effect.player;
  let cards: Card[] = [];

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }

  const deckTop = new CardList();

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARDS_TO_PUT_ON_TOP_OF_THE_DECK,
    player.deck,
    {},
    { min: 1, max: 1, allowCancel: false }
  ), selected => {
    cards = selected || [];
    next();
  });

  MOVE_CARDS(store, state, player.deck, deckTop, { cards: cards, sourceCard: self });

  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
    if (cardList.getPokemonCard() === self) {
      cardList.addBoardEffect(BoardEffect.ABILITY_USED);
    }
  });

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
    if (order === null) {
      return state;
    }
    deckTop.applyOrder(order);
    deckTop.moveToTopOfDestination(player.deck);
  });
}

export class Magcargo extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Slugma';
  public cardType: CardType[] = [CardType.FIRE];
  public hp: number = 90;
  public weakness = [{ type: CardType.WATER }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];
  public powers = [{
    name: 'Smooth Over',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may search your deck for a card, shuffle your deck, then put that card on top of it.'
  }];
  public attacks = [{
    name: 'Combustion',
    cost: [CardType.FIRE, CardType.COLORLESS, CardType.COLORLESS],
    damage: 50,
    text: ''
  }];
  public set: string = 'CES';
  public name: string = 'Magcargo';
  public fullName: string = 'Magcargo CES';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '24';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = useSmoothOver(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }
    return state;
  }
}