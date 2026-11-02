import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_DECK_FOR_CARDS_TO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Mareep extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 60;
  public weakness = [{ type: F, value: +10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Minor Errand-Running',
    cost: [],
    damage: 0,
    text: 'Search your deck for a basic Energy card, show it to your opponent, and put it into your hand. Shuffle your deck afterward.'
  }, {
    name: 'Expand',
    cost: [L],
    damage: 10,
    text: 'During your opponent\'s next turn, any damage done to Mareep by attacks is reduced by 10 (after applying Weakness and Resistance).'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '82';
  public name: string = 'Mareep';
  public fullName: string = 'Mareep PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Minor Errand-Running
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_DECK_FOR_CARDS_TO_HAND(store, state, effect.player, this, { superType: SuperType.ENERGY, energyType: EnergyType.BASIC }, { min: 0, max: 1, allowCancel: false });
    }

    // Expand
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.player.active.damageReductionNextTurn = 10;
    }

    return state;
  }
}
