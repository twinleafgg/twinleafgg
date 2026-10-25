import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Drifloon extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +10 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Reckless Charge',
    cost: [C],
    damage: 20,
    text: 'Drifloon does 10 damage to itself.'
  }, {
    name: 'Collect',
    cost: [P],
    damage: 0,
    text: 'Draw a card.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '103';
  public name: string = 'Drifloon';
  public fullName: string = 'Drifloon SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reckless Charge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
    }

    // Collect
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DRAW_CARDS(store, state, effect.player, 1);
    }

    return state;
  }
}
