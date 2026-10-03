import { State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Nuzleaf extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Seedot';
  public cardType: CardType[] = [D];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Pound',
    cost: [C],
    damage: 20,
    text: ''
  },
  {
    name: 'Plunder',
    cost: [D, C],
    damage: 30,
    text: 'Before doing damage, discard all Trainer cards attached to the Defending Pokémon.'
  }];

  public set: string = 'LM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';
  public name: string = 'Nuzleaf';
  public fullName: string = 'Nuzleaf LM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const activePokemon = opponent.active;
      if (activePokemon.tools.length > 0) {
        MOVE_CARDS(store, state, activePokemon, opponent.discard, { cards: [...activePokemon.tools], sourceCard: this });
      }
      opponent.active.cards.forEach(card => {
        if (card.superType === SuperType.TRAINER) {
          MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: [card], sourceCard: this });
        }
      });
      return state;
    }

    return state;
  }
}