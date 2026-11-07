import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class JangmoO extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 70;
  public weakness = [];
  public retreat = [C];

  public attacks = [{
    name: 'Hard Head',
    cost: [L, F],
    damage: 30,
    text: 'During your opponent\'s next turn, this Pokémon takes 30 less damage from attacks(after applying Weakness and Resistance).'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '73';
  public name: string = 'Jangmo-o';
  public fullName: string = 'Jangmo-o M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hard Head
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.player.active.damageReductionNextTurn = 30;
    }

    return state;
  }
}
