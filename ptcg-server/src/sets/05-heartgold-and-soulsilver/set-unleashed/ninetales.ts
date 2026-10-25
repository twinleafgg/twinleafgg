import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';
import { ATTACH_ENERGY_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Ninetales extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Vulpix';
  public hp: number = 90;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    name: 'Heat Acceleration',
    cost: [R],
    damage: 0,
    text: 'Search your discard pile for up to 3 Fire Energy cards and attach them to 1 of your Pokémon.'
  },
  {
    name: 'Searing Flame',
    cost: [R, C],
    damage: 30,
    text: 'The Defending Pokémon is now Burned.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '20';
  public name: string = 'Ninetales';
  public fullName: string = 'Ninetales UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Heat Acceleration
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasFire = player.discard.cards.some(c => c.name === 'Fire Energy');
      if (!hasFire) {
        return state;
      }
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DISCARD,
        [SlotType.ACTIVE, SlotType.BENCH],
        { energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { min: 0, max: 3, allowCancel: false, sameTarget: true }
      );
    }

    // Searing Flame
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
    }

    return state;
  }
}
