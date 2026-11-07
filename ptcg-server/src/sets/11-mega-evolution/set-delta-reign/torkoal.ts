import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Torkoal extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 130;
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Searing Flame',
    cost: [R, C],
    damage: 30,
    text: 'Your opponent\'s Active Pokemon is now Burned.'
  },
  {
    name: 'Combustion Blast',
    cost: [R, R, C],
    damage: 120,
    text: 'During your next turn, this Pokémon can\'t use Combustion Blast.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';
  public name: string = 'Torkoal';
  public fullName: string = 'Torkoal M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Searing Flame
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
    }

    // Combustion Blast
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.player.active.cannotUseAttacksNextTurnPending.push('Combustion Blast');
    }

    return state;
  }
}
