import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Onix extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 120;
  public weakness = [{ type: G }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Guard Press',
    cost: [C, C, C],
    damage: 80,
    text: 'During your opponent\'s next turn, this Pokémon takes 30 less damage from attacks (after applying Weakness and Resistance).'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '51';
  public name: string = 'Onix';
  public fullName: string = 'Onix M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Guard Press
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.player.active.damageReductionNextTurn = 30;
    }

    return state;
  }
}
