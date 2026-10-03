import { State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Lombre extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Lotad';
  public cardType: CardType[] = [W];
  public hp: number = 70;
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    name: 'Plunder',
    cost: [C, C],
    damage: 30,
    text: 'Before doing damage, discard all Trainer cards attached to the Defending Pokémon.'
  },
  {
    name: 'Wave Splash',
    cost: [W, C, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'CG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '37';
  public name: string = 'Lombre';
  public fullName: string = 'Lombre CG';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
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