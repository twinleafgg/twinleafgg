import { PokemonCard, Stage, CardType, StoreLike, State } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Combusken extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Torchic';
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    // Smokescreen
    name: 'Smokescreen',
    cost: [R],
    damage: 10,
    text: 'If the Defending Pokémon tries to attack during your opponent\'s next turn, your opponent flips a coin. If tails, that attack does nothing.'
  }, {
    // Sky Uppercut
    name: 'Sky Uppercut',
    cost: [R, C, C],
    damage: 40,
    text: 'This attack\'s damage isn\'t affected by Resistance.'
  }];

  public set: string = 'P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Combusken';
  public fullName: string = 'Combusken P4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Smokescreen
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this);
    }
    // Sky Uppercut
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.ignoreResistance = true;
    }
    return state;
  }
}
