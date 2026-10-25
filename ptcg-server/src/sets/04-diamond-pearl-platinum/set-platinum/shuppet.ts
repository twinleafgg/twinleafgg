import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PUT_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_HAND, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { AFTER_ATTACK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Shuppet extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +10 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Hypnotic Gaze',
    cost: [],
    damage: 0,
    text: 'The Defending Pokémon is now Asleep.'
  }, {
    name: 'Fade Out',
    cost: [P],
    damage: 30,
    text: 'Return Shuppet and all cards attached to it to your hand. (If you don\'t have any Benched Pokémon, this attack does nothing.)'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '92';
  public name: string = 'Shuppet';
  public fullName: string = 'Shuppet PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hypnotic Gaze
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
    }

    // Fade Out
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (!effect.player.bench.some(b => b.cards.length > 0)) {
        effect.damage = 0;
      }
    }

    if (AFTER_ATTACK(effect, 1, this)) {
      if (effect.player.bench.some(b => b.cards.length > 0)) {
        PUT_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_HAND(store, state, effect);
      }
    }

    return state;
  }
}
