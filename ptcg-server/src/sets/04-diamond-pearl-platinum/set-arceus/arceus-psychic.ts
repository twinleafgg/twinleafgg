import { State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { ADD_CONFUSION_TO_PLAYER_ACTIVE, AFTER_ATTACK } from '../../../game/store/prefabs/prefabs';

export class ArceusPsychic extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: P }];
  public retreat = [C];
  protected _tags = [CardTag.ARCEUS];

  public attacks = [{
    name: 'Mind Bend',
    cost: [P, C, C],
    damage: 40,
    text: 'The Defending Pokémon is now Confused.',
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'AR7';
  public name: string = 'Arceus';
  public fullName: string = 'Arceus Psychic AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Mind Bend
    if (AFTER_ATTACK(effect, 0, this)) {
      ADD_CONFUSION_TO_PLAYER_ACTIVE(
        store,
        state,
        StateUtils.getOpponent(state, effect.player),
        this,
      );
    }

    return state;
  }
}
