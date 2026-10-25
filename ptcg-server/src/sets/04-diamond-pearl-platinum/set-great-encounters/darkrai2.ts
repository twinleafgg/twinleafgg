import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { SuperType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Darkrai2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [{
    // Reach Over
    name: 'Reach Over',
    cost: [],
    damage: 0,
    text: 'Search your deck for an Energy card, show it to your opponent, and put it into your hand. Shuffle your deck afterward.'
  }, {
    // Darkness Pursuit
    name: 'Darkness Pursuit',
    cost: [D, D, D],
    damage: 50,
    text: 'If the Defending Pokémon is Cresselia, this attack\'s base damage is 100.'
  }];

  public set: string = 'GE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Darkrai';
  public fullName: string = 'Darkrai GE2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reach Over
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_DECK_FOR_CARDS_TO_HAND(store, state, effect.player, this, { superType: SuperType.ENERGY }, { min: 0, max: 1, allowCancel: true });
    }

    // Darkness Pursuit
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.getPokemonCard()?.name === 'Cresselia') {
        effect.damage = 100;
      }
    }

    return state;
  }
}
