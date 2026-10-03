import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, BoardEffect } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, StateUtils, ConfirmPrompt, Card, GameError, PlayerType, PowerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { CardList } from '../../../game/store/state/card-list';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

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
  public cardType: CardType[] = [R];
  public hp: number = 80;
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Smooth Over',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may search your deck for a card. Shuffle your deck, then put that card on top of your deck. This power can\'t be used if Magcargo is affected by a Special Condition.'
  }];

  public attacks = [
    {
      name: 'Knock Over',
      cost: [C],
      damage: 10,
      text: 'You may discard any Stadium card in play.'
    },
    {
      name: 'Combustion',
      cost: [R, C, C],
      damage: 50,
      text: ''
    }
  ];

  public set: string = 'DX';
  public setNumber: string = '20';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Magcargo';
  public fullName: string = 'Magcargo DX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = useSmoothOver(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard !== undefined) {
        state = store.prompt(state, new ConfirmPrompt(
          effect.player.id,
          GameMessage.WANT_TO_DISCARD_STADIUM,
        ), wantToUse => {
          if (wantToUse) {
            const cardList = StateUtils.findCardList(state, stadiumCard);
            const player = StateUtils.findOwner(state, cardList);
            MOVE_CARDS(store, state, cardList, player.discard, { sourceCard: this });
          }
          return state;
        });
      }
    }
    return state;
  }
} 