import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { GameMessage } from '../../../game/game-message';
import { ShuffleDeckPrompt } from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Wurmple extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.GRASS];
  public hp: number = 60;
  public weakness = [{ type: CardType.FIRE }];
  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Sting',
      cost: [CardType.GRASS],
      damage: 10,
      text: ''
    },
    {
      name: 'Creepy-Crawly Congregation',
      cost: [CardType.GRASS, CardType.GRASS, CardType.GRASS],
      damage: 0,
      text: 'Search your deck for any number of Wurmple, Silcoon, Beautifly, Cascoon, and Dustox, reveal them, and put them into your hand. Then, shuffle your deck.'
    }
  ];

  public regulationMark: string = 'F';
  public set: string = 'LOR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Wurmple';
  public fullName: string = 'Wurmple LOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard &&
          !['Wurmple', 'Silcoon', 'Cascoon', 'Beautifly', 'Dustox'].includes(card.name)) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 0, max: 59, blocked }
      ), cards => {
        cards = cards || [];
        cards.forEach(card => MOVE_CARDS(store, state, player.deck, player.hand, { cards: [card], sourceCard: this }));

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          return player.deck.applyOrder(order);
        });
      });
    }
    return state;
  }
}
