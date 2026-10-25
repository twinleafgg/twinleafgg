import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, SWITCH_ACTIVE_WITH_BENCHED, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Raikou extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    // Roar
    name: 'Roar',
    cost: [C],
    damage: 0,
    text: 'Your opponent switches the Defending Pokémon with 1 of his or her Benched Pokémon, if any.'
  }, {
    // Thunder
    name: 'Thunder',
    cost: [L, L, C],
    damage: 50,
    text: 'Flip a coin. If tails, Raikou does 20 damage to itself.'
  }];

  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Raikou';
  public fullName: string = 'Raikou P2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Roar
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.opponent);
    }
    // Thunder
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 20);
        }
      });
    }
    return state;
  }
}
