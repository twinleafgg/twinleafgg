import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { EnergyCard, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON, COIN_FLIP_PROMPT, THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Dialga3 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +30 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Energy Stream',
    cost: [C, C],
    damage: 20,
    text: 'Flip a coin. If heads, search your discard pile for a basic Energy card and attach it to Dialga.'
  }, {
    name: 'Diamond Blow',
    cost: [M, M, M, C],
    damage: 100,
    text: 'Dialga can\'t attack during your next turn.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '23';
  public name: string = 'Dialga';
  public fullName: string = 'Dialga PL3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Stream
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        const hasBasicEnergy = player.discard.cards.some(c =>
          c instanceof EnergyCard && c.energyType === EnergyType.BASIC
        );
        if (!hasBasicEnergy) {
          return;
        }
        ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON(store, state, player, 1, undefined, {
          destinationSlots: [SlotType.ACTIVE],
          energyFilter: { energyType: EnergyType.BASIC },
          min: 1,
          allowCancel: false,
        });
      });
    }

    // Diamond Blow
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    return state;
  }
}
