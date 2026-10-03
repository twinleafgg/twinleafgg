import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ConfirmPrompt, EnergyCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Jolteon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Eevee';
  public cardType: CardType[] = [L];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [];

  public attacks = [{
    name: 'Electrigun',
    cost: [C],
    damage: 20,
    damageCalculation: '+',
    text: 'You may discard a [L] Energy attached to this Pokémon. If you do, this attack does 40 more damage.'
  }, {
    name: 'Pin Missile',
    cost: [L, C, C],
    damage: 40,
    damageCalculation: 'x',
    text: 'Flip 4 coins. This attack does 40 damage times the number of heads.'
  }];

  public set: string = 'DEX';
  public setNumber: string = '37';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Jolteon';
  public fullName: string = 'Jolteon DEX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Electrigun - may discard Lightning energy for +40
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Check if has Lightning energy attached
      const hasLightningEnergy = player.active.cards.some(c =>
        c.superType === SuperType.ENERGY &&
        (c as EnergyCard).provides?.includes(CardType.LIGHTNING)
      );

      if (hasLightningEnergy) {
        return store.prompt(state, new ConfirmPrompt(
          player.id,
          GameMessage.WANT_TO_DEAL_MORE_DAMAGE
        ), result => {
          if (result) {
            // Find and discard a Lightning energy
            const lightningEnergy = player.active.cards.find(c =>
              c.superType === SuperType.ENERGY &&
              (c as EnergyCard).provides?.includes(CardType.LIGHTNING)
            );
            if (lightningEnergy) {
              MOVE_CARDS(store, state, player.active, player.discard, { cards: [lightningEnergy], sourceCard: this });
              effect.damage += 40;
            }
          }
        });
      }
    }

    // Pin Missile - flip 4 coins, 40x heads
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 4, results => {
        let heads = 0;
        results.forEach(r => { if (r) heads++; });
        effect.damage = 40 * heads;
      });
    }

    return state;
  }
}
