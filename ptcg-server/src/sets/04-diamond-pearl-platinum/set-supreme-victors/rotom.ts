import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Rotom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: D, value: +20 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Discharge',
    cost: [L],
    damage: 40,
    damageCalculation: 'x',
    text: 'Discard all Lightning Energy attached to Rotom. Flip a coin for each Energy card you discarded. This attack does 40 damage times the number of heads.'
  }, {
    name: 'Uproar',
    cost: [C, C],
    damage: 0,
    text: 'This attack does 10 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '82';
  public name: string = 'Rotom';
  public fullName: string = 'Rotom SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Discharge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const cards = [...new Set(
        checkProvidedEnergy.energyMap
          .filter(em => em.provides.includes(L) || em.provides.includes(CardType.ANY))
          .map(em => em.card)
      )];
      effect.damage = 0;
      if (cards.length > 0) {
        const discardEnergy = new DiscardCardsEffect(effect, cards);
        discardEnergy.target = player.active;
        store.reduceEffect(state, discardEnergy);
        MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, cards.length, results => {
          effect.damage = 40 * results.filter(r => r).length;
        });
      }
    }

    // Uproar
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state);
    }

    return state;
  }
}
