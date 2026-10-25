import { CardTag, CardType, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class TurtwigGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Overgrow',
    powerType: PowerType.POKEBODY,
    text: 'As long as Turtwig GL\'s remaining HP is 60 or less, each of Turtwig GL\'s attacks does 30 more damage to the Defending Pokémon (before applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Giga Drain',
    cost: [G, C, C],
    damage: 30,
    text: 'After your attack, remove from Turtwig GL the number of damage counters equal to the damage you did to the Defending Pokémon.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';
  public name: string = 'Turtwig GL';
  public fullName: string = 'Turtwig GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Overgrow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const cardList = effect.player.active;
      if (cardList.getPokemonCard() === this
        && !IS_POKEBODY_BLOCKED(store, state, effect.player, this)
        && this.hp - cardList.damage <= 60) {
        effect.damage += 30;
      }

      // Giga Drain
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, effect.damage);
    }

    return state;
  }
}
