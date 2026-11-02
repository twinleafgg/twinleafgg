import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AFTER_ATTACK, CONFIRMATION_PROMPT, SWITCH_ACTIVE_WITH_BENCHED } from '../../../game/store/prefabs/prefabs';

export class Beldum extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Reaction',
    cost: [P],
    damage: 10,
    text: 'You may switch Beldum with 1 of your Benched Pokémon.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '44';
  public name: string = 'Beldum';
  public fullName: string = 'Beldum UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reaction
    if (AFTER_ATTACK(effect, 0, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, wantToSwitch => {
        if (wantToSwitch) {
          SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.player);
        }
      }, GameMessage.WANT_TO_SWITCH_POKEMON);
    }

    return state;
  }
}
