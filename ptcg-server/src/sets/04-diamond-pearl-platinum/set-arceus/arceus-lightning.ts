import { State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { AFTER_ATTACK, SWITCH_ACTIVE_WITH_BENCHED } from '../../../game/store/prefabs/prefabs';

export class ArceusLightning extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];
  protected _tags = [CardTag.ARCEUS];

  public attacks = [{
    name: 'Lightning Turn',
    cost: [L, C],
    damage: 30,
    text: 'Switch Arceus with 1 of your Benched Pokémon.',
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'AR6';
  public name: string = 'Arceus';
  public fullName: string = 'Arceus Lightning AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lightning Turn
    if (AFTER_ATTACK(effect, 0, this)) {
      SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.player);
    }

    return state;
  }
}
