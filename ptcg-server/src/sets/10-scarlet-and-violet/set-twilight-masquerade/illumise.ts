import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ShuffleDeckPrompt, GameError, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Illumise extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 70;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Slowing Perfume ',
      cost: [C],
      damage: 0,
      text: 'You can use this attack only if you go second, and only during your first turn. Shuffle 1 of your opponent\'s Benched Pokémon and all attached cards into their deck.'
    },
    {
      name: 'Glide',
      cost: [G, C],
      damage: 30,
      text: ''
    }
  ];

  public regulationMark = 'H';
  public set: string = 'TWM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Illumise';
  public fullName: string = 'Illumise TWM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (state.turn != 2) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }
      else {
        const player = effect.player;
        const opponent = StateUtils.getOpponent(state, player);
        MOVE_CARDS(store, state, opponent.active, opponent.deck, { sourceCard: this });
        opponent.active.clearEffects();

        return store.prompt(state, new ShuffleDeckPrompt(opponent.id), order => {
          opponent.deck.applyOrder(order);
        });
      }

    }

    return state;
  }

}
