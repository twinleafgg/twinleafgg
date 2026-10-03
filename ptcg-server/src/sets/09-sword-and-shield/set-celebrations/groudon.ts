import { CardList, State, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Groudon extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 130;
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Magma Volcano',
    cost: [F, F, C],
    damage: 80,
    damageCalculation: 'x',
    text: 'Discard the top 5 cards of your deck. This attack does 80 damage for each Energy card you discarded in this way.'
  },
  {
    name: 'Massive Rend',
    cost: [F, F, C, C],
    damage: 120,
    text: ''
  }];

  public set: string = 'CEL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Groudon';
  public fullName: string = 'Groudon CEL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const deckTop = new CardList();

      // Move top 5 cards from deckTop
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 5, sourceCard: this });

      // Filter for Energy cards
      const energyCount = deckTop.cards.filter(c =>
        c.superType === SuperType.ENERGY
      );

      // Move all cards to discard
      MOVE_CARDS(store, state, deckTop, player.discard, { count: deckTop.cards.length, sourceCard: this });

      effect.damage = energyCount.length * 80;
    }

    return state;
  }
}