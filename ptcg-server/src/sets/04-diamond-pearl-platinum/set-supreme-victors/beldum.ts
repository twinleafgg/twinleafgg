import { CardType, PokemonCard, Stage, State, StoreLike, SuperType, TrainerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_DECK_FOR_CARDS_TO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Beldum extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +10 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Pit Search',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a Stadium card, show it to your opponent, and put it into your hand. Shuffle your deck afterward.'
  }, {
    name: 'Ram',
    cost: [M],
    damage: 10,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '90';
  public name: string = 'Beldum';
  public fullName: string = 'Beldum SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Pit Search
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const filter = { superType: SuperType.TRAINER, trainerType: TrainerType.STADIUM };
      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        effect.player,
        this,
        filter,
        { min: 0, max: 1, allowCancel: true }
      );
    }

    return state;
  }
}
