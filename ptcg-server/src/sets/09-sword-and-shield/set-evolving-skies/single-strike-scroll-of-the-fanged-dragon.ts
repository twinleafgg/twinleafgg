import { Attack } from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonAttacksEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';

import {
  DISCARD_ALL_ENERGY_FROM_POKEMON,
  IS_TOOL_BLOCKED,
} from '../../../game/store/prefabs/prefabs';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class SingleStrikeScrollOfTheFangedDragon extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  protected _tags = [CardTag.SINGLE_STRIKE];
  public regulationMark = 'E';
  public set: string = 'EVS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '158';
  public name: string = 'Single Strike Scroll of the Fanged Dragon';
  public fullName: string = 'Single Strike Scroll of the Fanged Dragon EVS';

  public attacks: Attack[] = [
    {
      name: 'Superstrong Slash',
      cost: [F, M, M, C, C],
      damage: 300,
      text: 'Discard all Energy from this Pokémon.',
    },
  ];

  public text: string =
    'The Single Strike Pokémon this card is attached to can use the attack on this card. (You still need the necessary Energy to use this attack.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof CheckPokemonAttacksEffect &&
      effect.player.active.getPokemonCard()?.tools.includes(this) &&
      !effect.attacks.includes(this.attacks[0]) &&
      effect.player.active.getPokemonCard()?.hasTag(CardTag.SINGLE_STRIKE)
    ) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      effect.attacks.push(this.attacks[0]);
    }

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, this);
    }

    return state;
  }
}
