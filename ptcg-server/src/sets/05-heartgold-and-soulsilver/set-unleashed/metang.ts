import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Metang extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Beldum';
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Energy Crane',
    cost: [P],
    damage: 0,
    text: 'Search your discard pile for up to 2 Psychic Energy cards and attach them to your Pokémon in any way you like.'
  },
  {
    name: 'Psypunch',
    cost: [P, C, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '33';
  public name: string = 'Metang';
  public fullName: string = 'Metang UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Crane
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergy = player.discard.cards.some(c => c.name === 'Psychic Energy');
      if (!hasEnergy) {
        return state;
      }
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DISCARD,
        [SlotType.ACTIVE, SlotType.BENCH],
        { energyType: EnergyType.BASIC, name: 'Psychic Energy' },
        { allowCancel: false, min: 0, max: 2 }
      );
    }

    return state;
  }
}
