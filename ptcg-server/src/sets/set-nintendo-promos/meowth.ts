import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType } from '../../game/store/card/card-types';
import { StoreLike, State, StateUtils, TrainerCard } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Meowth extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 50;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Plunder',
    cost: [C],
    damage: 10,
    text: 'Before doing damage, discard all Trainer cards attached to the Defending Pokémon (before they affect the damage).'
  },
  {
    name: 'Scratch',
    cost: [C, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'NP';
  public setNumber: string = '13';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Meowth';
  public fullName: string = 'Meowth NP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Discard active Pokemon's tool first
      const activePokemon = opponent.active;
      const toolsToDiscard = activePokemon.tools.filter(card => card instanceof TrainerCard && card.trainerType === TrainerType.TOOL);
      if (toolsToDiscard.length > 0) {
        MOVE_CARDS(store, state, activePokemon, opponent.discard, { cards: toolsToDiscard, sourceCard: this });
      }
    }
    return state;
  }
}