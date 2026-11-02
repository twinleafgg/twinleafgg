import { GameError, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonTypeEffect, CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, ADD_MARKER, HAS_MARKER, IS_POKEPOWER_BLOCKED, REMOVE_MARKER_AT_END_OF_TURN, THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class FrostRotom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: D, value: +20 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Frost Shift',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may use this power. Frost Rotom\'s type is Water until the end of your turn.'
  }];

  public attacks = [{
    name: 'Hail',
    cost: [C, C],
    damage: 0,
    text: 'This attack does 10 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Crushing Ice',
    cost: [W, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Does 40 damage plus 10 more damage for each Colorless Energy in the Defending Pokémon\'s Retreat Cost (after applying effects to the Retreat Cost).'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'RT2';
  public name: string = 'Frost Rotom';
  public fullName: string = 'Frost Rotom RR';

  public readonly FROST_SHIFT_MARKER = 'FROST_SHIFT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FROST_SHIFT_MARKER, this);

    // Frost Shift
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (HAS_MARKER(this.FROST_SHIFT_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      ABILITY_USED(player, this);
      ADD_MARKER(this.FROST_SHIFT_MARKER, player, this);
    }

    if (effect instanceof CheckPokemonTypeEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      if (HAS_MARKER(this.FROST_SHIFT_MARKER, player, this)) {
        effect.cardTypes = [CardType.WATER];
      }
    }

    // Hail
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state);
    }

    // Crushing Ice
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      if (opponent.active.getPokemonCard()) {
        const checkRetreatCostEffect = new CheckRetreatCostEffect(opponent);
        store.reduceEffect(state, checkRetreatCostEffect);
        const colorless = checkRetreatCostEffect.cost.filter(c => c === CardType.COLORLESS).length;
        effect.damage += colorless * 10;
      }
    }

    return state;
  }
}
