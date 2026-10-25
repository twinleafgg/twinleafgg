import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { AFTER_ATTACK, CONFIRMATION_PROMPT, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Swablu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L, value: +10 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Sing',
    cost: [C],
    damage: 0,
    text: 'The Defending Pokémon is now Asleep.'
  }, {
    name: 'Run Around',
    cost: [C],
    damage: 10,
    text: 'You may switch Swablu with 1 of your Benched Pokémon.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '97';
  public name: string = 'Swablu';
  public fullName: string = 'Swablu PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sing
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
    }

    // Run Around
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

    return state;
  }
}
