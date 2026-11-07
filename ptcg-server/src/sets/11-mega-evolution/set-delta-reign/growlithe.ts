import { CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AFTER_ATTACK, SWITCH_ACTIVE_WITH_BENCHED } from '../../../game/store/prefabs/prefabs';

export class Growlithe extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 80;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Roar',
    cost: [C],
    damage: 0,
    text: 'Switch out your opponent\'s Active Pokémon to the Bench. (Your opponent chooses the new Active Pokémon.) '
  },
  {
    name: 'Rear Kick',
    cost: [R, C, C],
    damage: 50,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Growlithe';
  public fullName: string = 'Growlithe M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Roar
    if (AFTER_ATTACK(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      if (opponent.bench.some(b => b.cards.length > 0)) {
        SWITCH_ACTIVE_WITH_BENCHED(store, state, opponent);
      }
    }

    return state;
  }
}
