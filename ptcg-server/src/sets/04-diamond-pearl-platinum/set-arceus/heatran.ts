import { EnergyCard, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Heatran extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Fire Fang',
    cost: [R, C],
    damage: 20,
    text: 'The Defending Pokémon is now Burned.'
  }, {
    name: 'Magma Mantle',
    cost: [R, R, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'Discard the top 3 cards of your deck. This attack does 60 damage plus 20 more damage for each Fire or Metal Energy card you discarded.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Heatran';
  public fullName: string = 'Heatran AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fire Fang
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
    }

    // Magma Mantle
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const amount = Math.min(3, player.deck.cards.length);
      const topCards = player.deck.cards.slice(0, amount);
      if (amount > 0) {
        MOVE_CARDS(store, state, player.deck, player.discard, { count: amount, sourceCard: this, sourceEffect: this.attacks[1] });
        const bonus = topCards.filter(c =>
          c instanceof EnergyCard && (c.name === 'Fire Energy' || c.name === 'Metal Energy')
        ).length;
        effect.damage += 20 * bonus;
      }
    }

    return state;
  }
}
