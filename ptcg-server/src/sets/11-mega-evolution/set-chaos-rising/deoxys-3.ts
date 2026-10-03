import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Deoxys3 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 130;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Psy Protection',
      cost: [P, P, C],
      damage: 80,
      text: "During your opponent's next turn, prevent all damage done to this Pokémon by attacks from Pokémon that have an Ability.",
    },
  ];

  public regulationMark: string = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '33';
  public name: string = 'Deoxys';
  public fullName: string = 'Deoxys M4 33';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Psy Protection — damage only, not other effects of attacks.
    // Ref: set-lost-thunder/carbink-2.ts (sourceHasAbility)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      PREVENT_DAMAGE(store, state, effect, this, { sourceHasAbility: true });
    }

    return state;
  }
}
