import { PokemonCard, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Chatot extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L, value: +10 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Call for Family',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a Basic Pokémon and put it onto your Bench. Shuffle your deck afterward.'
  }, {
    name: 'Nosedive',
    cost: [C, C],
    damage: 30,
    text: 'Flip a coin. If tails, Chatot does 10 damage to itself.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Chatot';
  public fullName: string = 'Chatot SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Call for Family
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(store, state, effect.player, { stage: Stage.BASIC });
    }

    // Nosedive
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
        }
      });
    }

    return state;
  }
}
