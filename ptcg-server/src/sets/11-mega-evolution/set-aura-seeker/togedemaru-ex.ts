import { CardTag, CardType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { NEXT_TURN_ATTACK_BASE_DAMAGE_EFFECT } from '../../../game/store/prefabs/attack-effects';
import { IS_ABILITY_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class Togedemaruex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public hp: number = 170;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Dual Type',
    powerType: PowerType.ABILITY,
    text: 'As long as this Pokémon is in play, it is both [L] and [M] type.'
  }];

  public attacks = [{
    name: 'Full-Power Needle',
    cost: [M, M, C],
    damage: 180,
    text: 'During your next turn, this Pokémon\'s Full-Power Needle attack does 60 damage.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '59';
  public name: string = 'Togedemaru ex';
  public fullName: string = 'Togedemaru ex FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dual Type
    if (effect instanceof CheckPokemonTypeEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      if (!IS_ABILITY_BLOCKED(store, state, player, this)) {
        effect.cardTypes = [L, M];
      }
      return state;
    }

    // Full-Power Needle
    NEXT_TURN_ATTACK_BASE_DAMAGE_EFFECT(effect, {
      setupAttack: this.attacks[0],
      boostedAttack: this.attacks[0],
      source: this,
      baseDamage: 60,
    });

    return state;
  }
}
