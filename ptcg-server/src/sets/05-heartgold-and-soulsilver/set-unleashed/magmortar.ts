import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { CardList, EnergyCard, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Magmortar extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Magmar';
  public hp: number = 110;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Hard Crush',
    cost: [R, C, C],
    damage: 50,
    damageCalculation: 'x',
    text: 'Discard the top 3 cards from your deck. This attack does 50 damage times the number of Energy cards you discarded.'
  },
  {
    name: 'Mantle Bazooka',
    cost: [R, R, C, C],
    damage: 100,
    text: 'Discard 2 Fire Energy attached to Magmortar.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Magmortar';
  public fullName: string = 'Magmortar UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hard Crush
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const deckTop = new CardList();
      const count = Math.min(3, player.deck.cards.length);
      if (count === 0) {
        effect.damage = 0;
        return state;
      }
      MOVE_CARDS(store, state, player.deck, deckTop, { count, sourceCard: this });
      const energyCount = deckTop.cards.filter(c => c instanceof EnergyCard).length;
      MOVE_CARDS(store, state, deckTop, player.discard, { cards: [...deckTop.cards], sourceCard: this });
      effect.damage = energyCount * 50;
    }

    // Mantle Bazooka
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 2, CardType.FIRE);
    }

    return state;
  }
}
