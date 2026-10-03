import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, Card, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SpecialCondition } from '../../../game/store/card/card-types';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';

import {BLOCK_IF_DISCARD_EMPTY, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Oranguru extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 120;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Resource Management',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'Put 3 cards from your discard pile on the bottom of your deck in any order.'
    },
    {
      name: 'Profound Knowledge',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 60,
      text: 'Your opponent\'s Active Pokémon is now Confused.'
    },
  ];

  public set: string = 'UPR';

  public setNumber = '114';

  public cardImage = 'assets/cardback.png';

  public name: string = 'Oranguru';

  public fullName: string = 'Oranguru UPR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Resource Management
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      BLOCK_IF_DISCARD_EMPTY(player);

      let cards: Card[] = [];
      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        {},
        { min: 0, max: 3, allowCancel: false }
      ), selected => {
        cards = selected || [];
        MOVE_CARDS(store, state, player.discard, player.deck, { cards: cards, sourceCard: this });
      });
    }

    // Profound Knowledge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.CONFUSED]);
      return store.reduceEffect(state, specialCondition);
    }

    return state;
  }
}