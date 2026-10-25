import { PlayerType } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Darkrai2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Darkness Aura',
    powerType: PowerType.POKEBODY,
    text: 'If you have Cresselia in play, each of Darkrai\'s attack does 20 more damage to the Defending Pokémon (before applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Hypnoblast',
    cost: [D, D, C],
    damage: 60,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Asleep.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP52';
  public name: string = 'Darkrai';
  public fullName: string = 'Darkrai DPP2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Darkness Aura
    if (effect instanceof AttackEffect && effect.source.getPokemonCard() === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (effect.target === opponent.active && !IS_POKEBODY_BLOCKED(store, state, player, this)) {
        let hasCresselia = false;
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
          if (card.name === 'Cresselia') {
            hasCresselia = true;
          }
        });
        if (hasCresselia) {
          effect.damage += 20;
        }
      }
    }

    // Hypnoblast
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
        }
      });
    }

    return state;
  }
}
