import { GameMessage } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { BEFORE_DAMAGE } from '../../../game/store/prefabs/prefabs';
import { CONFIRMATION_PROMPT } from '../../../game/store/prefabs/prefabs';
import { SWITCH_IN_OPPONENT_BENCHED_POKEMON } from '../../../game/store/prefabs/prefabs';
import { THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Regigigas extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Drag Off',
    cost: [C, C, C],
    damage: 30,
    text: 'Before doing damage, you may choose 1 of your opponent\'s Benched Pokémon and switch it with the Defending Pokémon.'
  },
  {
    name: 'Giga Hammer',
    cost: [C, C, C, C],
    damage: 80,
    text: 'Regigigas can\'t use Giga Hammer during your next turn.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP40';
  public name: string = 'Regigigas';
  public fullName: string = 'Regigigas DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Drag Off
    if (BEFORE_DAMAGE(effect, 0, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          SWITCH_IN_OPPONENT_BENCHED_POKEMON(store, state, effect.player, {
            allowCancel: true,
            sourceEffect: effect.attackEffect,
          });
        }
      }, GameMessage.WANT_TO_SWITCH_POKEMON);
    }

    // Giga Hammer
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, this.attacks[1]);
    }

    return state;
  }
}
