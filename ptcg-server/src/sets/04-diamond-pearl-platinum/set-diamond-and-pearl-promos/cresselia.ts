import { PlayerType } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Cresselia extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public powers = [{
    name: 'Lunar Aura',
    powerType: PowerType.POKEBODY,
    text: 'If you have Darkrai in play, remove 1 damage counter from Cresselia between turns.'
  }];

  public attacks = [{
    name: 'Lunar Flight',
    cost: [P, P, C],
    damage: 80,
    damageCalculation: '-',
    text: 'Does 80 damage minus 10 damage for each damage counter on Cresselia.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP51';
  public name: string = 'Cresselia';
  public fullName: string = 'Cresselia DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lunar Aura
    if (effect instanceof BetweenTurnsEffect) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() !== this) {
          return;
        }
        if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
          return;
        }
        let hasDarkrai = false;
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
          if (card.name === 'Darkrai') {
            hasDarkrai = true;
          }
        });
        if (hasDarkrai && cardList.damage > 0) {
          store.reduceEffect(state, new HealEffect(player, cardList, 10));
        }
      });
    }

    // Lunar Flight
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage = Math.max(0, 80 - effect.player.active.damage);
    }

    return state;
  }
}
