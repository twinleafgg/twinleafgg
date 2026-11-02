import { PokemonCard, Stage, CardTag, CardType, StoreLike, State } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Zangoose extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp: number = 70;
  public cardType: CardType[] = [M];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    // Detect
    name: 'Detect',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, prevent all effects of an attack, including damage, done to Zangoose during your opponent\'s next turn.'
  }, {
    // Scratch
    name: 'Scratch',
    cost: [M, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'P5';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Zangoose δ';
  public fullName: string = 'Zangoose δ P5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Detect
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }
    return state;
  }
}
