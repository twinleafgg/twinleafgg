import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { AFTER_ATTACK, COIN_FLIP_PROMPT, CONFIRMATION_PROMPT, HEAL_X_DAMAGE_FROM_THIS_POKEMON, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Seviper extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Shed Skin',
    cost: [],
    damage: 0,
    text: 'Remove 4 damage counters from Seviper.'
  }, {
    name: 'Bite and Escape',
    cost: [P],
    damage: 20,
    text: 'You may switch Seviper with 1 of your Benched Pokémon.'
  }, {
    name: 'Paralyze Poison',
    cost: [P, C, C],
    damage: 40,
    text: 'The Defending Pokémon is now Poisoned. Flip a coin. If heads, the Defending Pokémon is now Paralyzed and Poisoned.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '61';
  public name: string = 'Seviper';
  public fullName: string = 'Seviper PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shed Skin
    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 40);
    }

    // Bite and Escape
    if (AFTER_ATTACK(effect, 1, this)) {
      const player = effect.player;
      if (player.bench.some(b => b.cards.length > 0)) {
        CONFIRMATION_PROMPT(store, state, player, wantToSwitch => {
          if (wantToSwitch) {
            SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
          }
        }, GameMessage.WANT_TO_SWITCH_POKEMON);
      }
    }

    // Paralyze Poison
    if (WAS_ATTACK_USED(effect, 2, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }

    return state;
  }
}
