import { PokemonCard, pokemonHasCardType } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Cherrim extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Cherubi';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Cloudy Sky',
    powerType: PowerType.POKEBODY,
    text: 'If any of your Grass Pokémon or Fire Pokémon would be damaged by an attack, reduce that damage by 10 (after applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Worry Seed',
    cost: [G, C],
    damage: 30,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Confused.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Cherrim';
  public fullName: string = 'Cherrim AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cloudy Sky
    if (effect instanceof PutDamageEffect) {
      const owner = StateUtils.findOwner(state, effect.target);
      let hasCherrim = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          hasCherrim = true;
        }
      });
      if (hasCherrim && !IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        const target = effect.target.getPokemonCard();
        if (target && (pokemonHasCardType(target, CardType.GRASS) || pokemonHasCardType(target, CardType.FIRE))) {
          effect.damage = Math.max(0, effect.damage - 10);
        }
      }
    }

    // Worry Seed
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
        }
      });
    }

    return state;
  }
}
