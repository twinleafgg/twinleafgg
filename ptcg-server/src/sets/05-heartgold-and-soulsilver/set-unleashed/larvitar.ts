import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, MOVE_CARDS, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Larvitar extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Mountain Eater',
    cost: [C],
    damage: 0,
    text: 'Discard the top card of your opponent\'s deck. Then, remove 2 damage counters from Larvitar.'
  },
  {
    name: 'Reckless Charge',
    cost: [C],
    damage: 20,
    text: 'Larvitar does 10 damage to itself.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '50';
  public name: string = 'Larvitar';
  public fullName: string = 'Larvitar UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Mountain Eater
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      if (opponent.deck.cards.length > 0) {
        MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: 1, sourceCard: this });
      }
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 20);
    }

    // Reckless Charge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
    }

    return state;
  }
}
