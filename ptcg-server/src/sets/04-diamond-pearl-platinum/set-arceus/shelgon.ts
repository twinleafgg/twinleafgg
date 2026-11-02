import { EnergyCard, State, StoreLike } from '../../../game';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { PREVENT_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Shelgon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Bagon';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Scrunch',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, prevent all damage done to Shelgon during your opponent\'s next turn.'
  }, {
    name: 'Dragon Bump',
    cost: [C, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'If Shelgon has any basic Fire Energy and any basic Water Energy attached to it, this attack does 40 damage plus 20 more damage.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '48';
  public name: string = 'Shelgon';
  public fullName: string = 'Shelgon AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Scrunch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          PREVENT_DAMAGE(store, state, effect, this);
        }
      });
    }

    // Dragon Bump
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const attached = effect.source.cards;
      const hasFire = attached.some(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Fire Energy');
      const hasWater = attached.some(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Water Energy');
      if (hasFire && hasWater) {
        effect.damage += 20;
      }
    }

    return state;
  }
}
