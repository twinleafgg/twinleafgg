import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, StateUtils, Card, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Unfezant extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Tranquill';
  public cardType: CardType[] = [C];
  public hp: number = 150;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [];
  public attacks = [{
    name: 'Opposing Winds',
    cost: [C, C],
    damage: 70,
    text: 'You may put 2 Energy attached to your opponent\'s Active Pokémon into their hand.'
  },
  {
    name: 'Boundless Power',
    cost: [C, C, C],
    damage: 180,
    text: 'During your next turn, this Pokémon can\'t attack.'
  }];

  public regulationMark: string = 'H';
  public set: string = 'TEF';
  public setNumber = '135';
  public cardImage = 'assets/cardback.png';
  public name: string = 'Unfezant';
  public fullName: string = 'Unfezant TEF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Opposing Winds
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let cards: Card[] = [];
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        opponent.active,
        { superType: SuperType.ENERGY },
        { min: 0, max: 2, allowCancel: false },
      ), selected => {
        cards = selected || [];
        MOVE_CARDS(store, state, opponent.active, opponent.hand, { cards: cards, sourceCard: this });
      });
    }

    // Boundless Power
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      // Legacy implementation:
      // - Set player.active.cannotAttackNextTurnPending = true directly.
      //
      // Converted to prefab version (THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN).
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(player);
    }

    return state;
  }
}
