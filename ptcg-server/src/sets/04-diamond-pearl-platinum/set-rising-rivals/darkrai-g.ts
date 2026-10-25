import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';

export class DarkraiG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Eerie Aura',
    powerType: PowerType.POKEBODY,
    text: 'Put 1 damage counter on each of your opponent\'s Pokémon that remains Asleep between turns.'
  }];

  public attacks = [{
    name: 'Darkness Sleep',
    cost: [D, C, C],
    damage: 50,
    text: 'If the Defending Pokémon already has any damage counters on it, that Pokémon is now Asleep.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Darkrai G';
  public fullName: string = 'Darkrai G RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Eerie Aura
    if (effect instanceof BetweenTurnsEffect) {
      const player = effect.player;
      let inPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          inPlay = true;
        }
      });
      if (!inPlay || IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const opponent = StateUtils.getOpponent(state, player);
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList.specialConditions.includes(SpecialCondition.ASLEEP)) {
          store.reduceEffect(state, new PlaceDamageCountersEffect(player, cardList, 10, this, this.powers[0]));
        }
      });
    }

    // Darkness Sleep
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.opponent.active.damage > 0) {
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
      }
    }

    return state;
  }
}
