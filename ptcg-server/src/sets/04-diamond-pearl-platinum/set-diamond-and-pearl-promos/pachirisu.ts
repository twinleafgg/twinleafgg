import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { EnergyType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Pachirisu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Minor Errand-Running',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a basic Energy card, show it to your opponent, and put it into your hand. Shuffle your deck afterward.'
  },
  {
    name: 'Thunder Jolt',
    cost: [L],
    damage: 20,
    text: 'Flip a coin. If tails, Pachirisu does 10 damage to itself.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP04';
  public name: string = 'Pachirisu';
  public fullName: string = 'Pachirisu DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Minor Errand-Running
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        effect.player,
        this,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 0, max: 1, allowCancel: true },
        this.attacks[0],
      );
    }

    // Thunder Jolt
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
