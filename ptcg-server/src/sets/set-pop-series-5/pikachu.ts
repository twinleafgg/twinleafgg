import { PokemonCard, Stage, CardTag, CardType, StoreLike, State } from '../../game';
import { CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Pikachu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp: number = 40;
  public cardType: CardType[] = [M];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    // Electric Punch
    name: 'Electric Punch',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    // Heavy Metal
    name: 'Heavy Metal',
    cost: [C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin for each Metal Energy attached to Pikachu. This attack does 10 damage plus 20 more damage for each heads.'
  }];

  public set: string = 'P5';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Pikachu δ';
  public fullName: string = 'Pikachu δ P5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Heavy Metal
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergyEffect);
      let energyCount = 0;
      checkProvidedEnergyEffect.energyMap.forEach(em => {
        energyCount += em.provides.filter(t => t === M || t === CardType.ANY).length;
      });
      if (energyCount > 0) {
        MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, energyCount, results => {
          effect.damage += results.filter(r => r).length * 20;
        });
      }
    }
    return state;
  }
}
