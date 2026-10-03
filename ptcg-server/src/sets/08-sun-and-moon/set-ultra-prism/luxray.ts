import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, StateUtils } from '../../../game';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class Luxray extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Luxio';
  public cardType: CardType[] = [L];
  public hp: number = 150;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Intimidating Fang',
    powerType: PowerType.ABILITY,
    text: 'As long as this Pokémon is your Active Pokémon, your opponent\'s Active Pokémon\'s attacks do 30 less damage (before applying Weakness and Resistance).'
  }];

  public attacks = [
    {
      name: 'Volt Bolt',
      cost: [L, L, C],
      damage: 0,
      text: 'Discard all [L] Energy from this Pokémon. This attack does 150 damage to 1 of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
    }
  ];

  public set: string = 'UPR';
  public setNumber: string = '48';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Luxray';
  public fullName: string = 'Luxray UPR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Intimidating Fang (passive - reduce opponent's attack damage by 30)
    // Ref: AGENTS-patterns.md (Damage Prevention/Reduction)
    if (effect instanceof DealDamageEffect && effect.target.cards.includes(this)) {
      const pokemonCard = effect.target.getPokemonCard();
      if (pokemonCard !== this) {
        return state;
      }

      const player = StateUtils.findOwner(state, effect.target);
      const opponent = StateUtils.findOwner(state, effect.source);

      // Only reduce damage from opponent's attacks
      if (player === opponent) {
        return state;
      }

      // Only works when this Pokemon is active
      if (player.active !== effect.target) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      effect.damage = Math.max(0, effect.damage - 30);
    }

    // Attack 1: Volt Bolt
    // Ref: set-primal-clash/manectric.ts (discard all [L] Energy), set-breakpoint/ferrothorn.ts (damage to 1 of opponent's Pokemon)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Discard all [L] Energy from this Pokemon
      const cards = player.active.cards.filter(c => c instanceof EnergyCard && c.provides.includes(CardType.LIGHTNING));
      cards.forEach(c => { MOVE_CARDS(store, state, player.active, player.discard, { cards: [c], sourceCard: this }); });

      // This attack does 150 damage to 1 of opponent's Pokemon
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(150, effect, store, state);
    }

    return state;
  }
}
