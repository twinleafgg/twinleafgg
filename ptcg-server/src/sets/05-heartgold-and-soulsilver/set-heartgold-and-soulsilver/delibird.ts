import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { DAMAGE_OPPONENT_POKEMON, DRAW_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Delibird extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Snowy Present',
    cost: [W],
    damage: 0,
    text: 'Draw a card for each Water Energy attached to all of your Pokémon.'
  },
  {
    name: 'Hail',
    cost: [W, C],
    damage: 0,
    text: 'This attack does 10 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '39';
  public name: string = 'Delibird';
  public fullName: string = 'Delibird HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Snowy Present
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let waterEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);
        waterEnergy += checkProvidedEnergy.energyMap.reduce((sum, em) => {
          return sum + em.provides.filter(p => p === CardType.WATER || p === CardType.ANY).length;
        }, 0);
      });
      DRAW_CARDS(store, state, player, waterEnergy);
    }

    // Hail
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      const targets = [opponent.active, ...opponent.bench.filter(b => b.cards.length > 0)];
      DAMAGE_OPPONENT_POKEMON(store, state, effect, 10, targets);
    }

    return state;
  }
}
