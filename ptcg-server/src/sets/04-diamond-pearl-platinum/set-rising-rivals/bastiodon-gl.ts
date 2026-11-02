import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, SWITCH_OUT_OPPONENT_ACTIVE_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class BastiodonGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Bounce Back',
    cost: [M, C, C],
    damage: 30,
    text: 'Your opponent switches the Defending Pokémon with 1 of his or her Benched Pokémon.'
  }, {
    name: 'Smack Attack',
    cost: [M, C, C, C],
    damage: 60,
    text: 'Remove 1 damage counter from Bastiodon GL.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Bastiodon GL';
  public fullName: string = 'Bastiodon GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bounce Back
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SWITCH_OUT_OPPONENT_ACTIVE_POKEMON(store, state, effect.player, { sourceEffect: effect });
    }

    // Smack Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 10);
    }

    return state;
  }
}
