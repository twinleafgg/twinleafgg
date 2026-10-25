import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_UP_TO_X_ENERGY_FROM_DECK_TO_Y_OF_YOUR_POKEMON, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Growlithe extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Stoke',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a Fire Energy card and attach it to Growlithe. Shuffle your deck afterward.'
  }, {
    name: 'Take Down',
    cost: [R, C, C],
    damage: 50,
    text: 'Growlithe does 10 damage to itself.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '63';
  public name: string = 'Growlithe';
  public fullName: string = 'Growlithe RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Stoke
    if (WAS_ATTACK_USED(effect, 0, this)) {
      ATTACH_UP_TO_X_ENERGY_FROM_DECK_TO_Y_OF_YOUR_POKEMON(store, state, effect.player, 1, 1, {
        destinationSlots: [SlotType.ACTIVE],
        energyFilter: { energyType: EnergyType.BASIC, name: 'Fire Energy' },
        min: 0,
        allowCancel: true,
      });
    }

    // Take Down
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
    }

    return state;
  }
}
