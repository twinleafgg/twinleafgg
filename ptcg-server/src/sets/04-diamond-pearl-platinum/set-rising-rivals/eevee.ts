import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AFTER_ATTACK, SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Eevee extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Signs of Evolution',
    cost: [],
    damage: 0,
    text: 'Search your deck for up to 2 cards that evolve from Eevee, show them to your opponent, and put them into your hand. Shuffle your deck afterward.'
  }, {
    name: 'Bounce',
    cost: [C],
    damage: 10,
    text: 'Switch Eevee with 1 of your Benched Pokémon.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '59';
  public name: string = 'Eevee';
  public fullName: string = 'Eevee RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Signs of Evolution
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
        store, state, effect.player, { evolvesFrom: 'Eevee' }, { min: 0, max: 2, allowCancel: true },
      );
    }

    // Bounce
    if (AFTER_ATTACK(effect, 1, this)) {
      SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.player);
    }

    return state;
  }
}
