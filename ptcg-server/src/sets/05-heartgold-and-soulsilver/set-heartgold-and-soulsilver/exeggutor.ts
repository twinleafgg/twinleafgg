import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { ATTACH_ENERGY_PROMPT, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Exeggutor extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Exeggcute';
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Energy Absorption',
    cost: [C],
    damage: 0,
    text: 'Search your discard pile for up to 2 Energy cards and attach them to Exeggutor.'
  },
  {
    name: 'Big Eggsplosion',
    cost: [P],
    damage: 40,
    damageCalculation: 'x',
    text: 'Flip a coin for each Energy attached to Exeggutor. This attack does 40 damage times the number of heads.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Exeggutor';
  public fullName: string = 'Exeggutor HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Absorption
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (!player.discard.cards.some(c => c.superType === SuperType.ENERGY)) {
        return state;
      }
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DISCARD,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY },
        { min: 0, max: 2, allowCancel: false, sameTarget: true },
      );
    }

    // Big Eggsplosion
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergyEffect);
      const energyCount = checkProvidedEnergyEffect.energyMap.reduce((sum, em) => sum + em.provides.length, 0);
      if (energyCount > 0) {
        MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, energyCount, results => {
          effect.damage = results.filter(r => r).length * 40;
        });
      } else {
        effect.damage = 0;
      }
    }

    return state;
  }
}
