import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GamePhase, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AbstractAttackEffect } from '../../../game/store/effects/attack-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Dustox extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Cascoon';
  public hp: number = 130;
  public cardType: CardType[] = [P];
  public weakness = [{ type: R, value: +30 }];
  public retreat = [];

  public powers = [{
    name: 'Camouflage Pattern',
    powerType: PowerType.POKEBODY,
    text: 'Prevent all effects of attacks, including damage, done to Dustox by your opponent\'s Pokémon that is affected by 2 or more Special Conditions.'
  }];

  public attacks = [{
    name: 'Smogscreen',
    cost: [G, C],
    damage: 20,
    text: 'The Defending Pokémon is now Poisoned. If the Defending Pokémon tries to attack during your opponent\'s next turn, your opponent flips a coin. If tails, that attack does nothing.'
  }, {
    name: 'Chemical Scale',
    cost: [G, C, C],
    damage: 60,
    text: 'If the Defending Pokémon has any Poké-Powers or Poké-Bodies, the Defending Pokémon is now Burned and Confused.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Dustox';
  public fullName: string = 'Dustox PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Camouflage Pattern
    if (
      effect instanceof AbstractAttackEffect &&
      effect.target.cards.includes(this) &&
      state.phase === GamePhase.ATTACK
    ) {
      const owner = StateUtils.findOwner(state, effect.target);
      const attackerOwner = StateUtils.findOwner(state, effect.source);
      if (owner === attackerOwner) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      if (effect.source.specialConditions.length >= 2) {
        effect.preventDefault = true;
      }
    }

    // Smogscreen
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
      return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this);
    }

    // Chemical Scale
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const defending = effect.opponent.active.getPokemonCard();
      if (defending !== undefined && defending.powers.some(power =>
        power.powerType === PowerType.POKEPOWER || power.powerType === PowerType.POKEBODY
      )) {
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
      }
    }

    return state;
  }
}
