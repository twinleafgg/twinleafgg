import { CardTag, CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Mankey extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Extra Punch',
    cost: [F],
    damage: 10,
    damageCalculation: '+',
    text: 'If the Defending Pokémon is a Pokémon LV.X, this attack does 10 damage plus 50 more damage.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '112';
  public name: string = 'Mankey';
  public fullName: string = 'Mankey SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Extra Punch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const defending = effect.opponent.active.getPokemonCard();
      if (defending && (defending.stage === Stage.LV_X || defending.hasTag(CardTag.POKEMON_LV_X))) {
        effect.damage += 50;
      }
    }

    return state;
  }
}
