import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Luxio extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Shinx';
  public hp: number = 80;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Kick',
    cost: [C],
    damage: 20,
    text: ''
  }, {
    name: 'Discharge',
    cost: [L, C, C],
    damage: 40,
    damageCalculation: 'x',
    text: 'Discard all Lightning Energy attached to Luxio. Flip a coin for each Energy card you discarded. This attack does 40 damage times the number of heads.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '43';
  public name: string = 'Luxio';
  public fullName: string = 'Luxio AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Discharge
    if (WAS_ATTACK_USED(effect, 1, this)) {
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
        return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, cards.length, results => {
          effect.damage = 40 * results.filter(r => r).length;
        });
      }
    }

    return state;
  }
}
