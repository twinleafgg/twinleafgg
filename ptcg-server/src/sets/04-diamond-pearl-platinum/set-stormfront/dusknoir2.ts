import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { EnergyCard } from '../../../game';
import { PlayerType } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Dusknoir2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Dusclops';
  public hp: number = 120;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +30 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    // Spirit Pulse
    name: 'Spirit Pulse',
    powerType: PowerType.POKEBODY,
    text: 'As long as Dusknoir is your Active Pokémon, put 1 damage counter on each of your opponent\'s Pokémon that has any Energy attached to it between turns.'
  }];

  public attacks = [{
    // Darkness Mist
    name: 'Darkness Mist',
    cost: [P, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'If the Defending Pokémon already has 2 or more damage counters on it, this attack does 60 damage plus 20 more damage.'
  }];

  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Dusknoir';
  public fullName: string = 'Dusknoir SF2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Spirit Pulse
    if (effect instanceof BetweenTurnsEffect) {
      const player = effect.player;
      if (player.active.getPokemonCard() !== this) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const opponent = StateUtils.getOpponent(state, player);
      opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, list => {
        if (list.cards.some(c => c instanceof EnergyCard)) {
          list.damage += 10;
        }
      });
    }

    // Darkness Mist
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.opponent.active.damage >= 20) {
        effect.damage += 20;
      }
    }

    return state;
  }
}
