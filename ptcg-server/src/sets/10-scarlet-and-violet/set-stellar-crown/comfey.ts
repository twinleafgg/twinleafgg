import { PokemonCard, Stage, CardType, StoreLike, State, GameError, GameMessage, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Comfey extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 70;
  public weakness = [{ type: M }];
  public retreat = [C];

  public attacks = [{
    name: 'Flower Shower',
    cost: [P],
    damage: 0,
    text: 'Each player draws 3 cards.',
  }, {
    name: 'Play Rough',
    cost: [P],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 more damage.',
  }];

  public regulationMark = 'H';

  public set: string = 'SCR';
  public name: string = 'Comfey';
  public fullName: string = 'Comfey SCR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '63';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      if (opponent.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
      MOVE_CARDS(store, state, opponent.deck, opponent.hand, { count: 3, sourceCard: this });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      return COIN_FLIP_PROMPT(store, state, player, result => {
          if (result === true) {
            effect.damage += 20;
          }
        },
      );
    }

    return state;
  }
}
