import { PokemonCard } from '../../game';
import { Stage } from '../../game';
import { CardTag } from '../../game';
import { CardType } from '../../game';
import { State } from '../../game';
import { StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class ArmaldoEx extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  protected _tags = [CardTag.POKEMON_ex];
  public evolvesFrom: string = 'Anorith';
  public hp: number = 160;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public attacks = [{
    // Twin-blade
    name: 'Twin-blade',
    cost: [F, C],
    damage: 30,
    text: 'Does 30 damage to each Defending Pokémon.'
  }, {
    // Supersonic Claws
    name: 'Supersonic Claws',
    cost: [F, F, C, C, C],
    damage: 80,
    text: 'This attack\'s damage is not affected by Resistance.'
  }];

  public set: string = 'P1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Armaldo ex';
  public fullName: string = 'Armaldo ex P1';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Supersonic Claws
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.ignoreResistance = true;
    }

    return state;
  }
}
