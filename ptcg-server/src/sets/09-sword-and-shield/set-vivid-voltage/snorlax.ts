import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SpecialCondition } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, GameError, GameMessage } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Snorlax extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 130;
  public retreat = [C, C, C];
  public weakness = [{ type: F }];

  public powers = [{
    name: 'Gormandize',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, if this Pokemon is in the Active Spot, ' +
    'you may draw cards until you have 7 cards in your hand. ' +
    'If you use this Ability, your turn ends.'
  }];

  public attacks = [{
    name: 'Body Slam',
    cost: [C, C, C, C],
    damage: 100,
    text: 'Flip a coin. If heads, your opponent\'s Active Pokemon is now Paralyzed.'
  }];

  public set: string = 'VIV';
  public name: string = 'Snorlax';
  public fullName: string = 'Snorlax VIV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '131';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Gormandize
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      // Snorlax is not active Pokemon
      if (player.active.getPokemonCard() !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const count = Math.max(0, 7 - player.hand.cards.length);
      if (count === 0 || player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: count, sourceCard: this });
      const endTurnEffect = new EndTurnEffect(player);
      store.reduceEffect(state, endTurnEffect);
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (result === true) {
          const specialConditionEffect = new AddSpecialConditionsEffect(effect, [SpecialCondition.PARALYZED]);
          store.reduceEffect(state, specialConditionEffect);
        }
      });
    }

    return state;
  }

}
