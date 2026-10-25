import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_PROMPT, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Blissey2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Chansey';
  public hp: number = 130;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Energy Link',
    cost: [C],
    damage: 10,
    text: 'Search your discard pile for an Energy card and attach it to Blissey.'
  },
  {
    name: 'Double-edge',
    cost: [C, C, C],
    damage: 80,
    text: 'Blissey does 40 damage to itself.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '36';
  public name: string = 'Blissey';
  public fullName: string = 'Blissey HS2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Link
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (!player.discard.cards.some(card => card.superType === SuperType.ENERGY)) {
        return state;
      }
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DISCARD,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 1, max: 1, sameTarget: true },
      );
    }

    // Double-edge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 40);
    }

    return state;
  }
}
