import { CardTag, CardType, EnergyCard, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { IS_POKEBODY_BLOCKED, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class VespiquenE4 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Royal Gain',
    powerType: PowerType.POKEBODY,
    text: 'When you attach a Grass Energy card from your hand to Vespiquen E4, remove 1 damage counter from Vespiquen E4.'
  }];

  public attacks = [{
    name: 'Leaf Needle',
    cost: [C, C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Flip a coin for each Grass Energy attached to Vespiquen E4. This attack does 30 damage plus 20 more damage for each heads.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '35';
  public name: string = 'Vespiquen E4';
  public fullName: string = 'Vespiquen E4 RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Royal Gain
    if (effect instanceof AttachEnergyEffect && effect.target.getPokemonCard() === this) {
      if (effect.energyCard.name !== 'Grass Energy') {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, effect.player, this)) {
        return state;
      }
      store.reduceEffect(state, new HealEffect(effect.player, effect.target, 10));
    }

    // Leaf Needle
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const coins = effect.player.active.cards.filter(c =>
        c instanceof EnergyCard && (c.name === 'Grass Energy' || c.provides.includes(CardType.GRASS))
      ).length;
      if (coins > 0) {
        MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, coins, results => {
          effect.damage += 20 * results.filter(r => r).length;
        });
      }
    }

    return state;
  }
}
