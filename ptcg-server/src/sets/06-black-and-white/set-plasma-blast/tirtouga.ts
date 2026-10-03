import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PowerType, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {IS_ABILITY_BLOCKED, MULTIPLE_COIN_FLIPS_PROMPT, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Tirtouga extends PokemonCard {
  public stage: Stage = Stage.RESTORED;
  public evolvesFrom: string = 'Cover Fossil';
  public cardType: CardType[] = [W];
  public hp: number = 90;
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Prehistoric Call',
    useFromDiscard: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), if this Pokémon is in your discard pile, you may put this Pokémon on the bottom of your deck.'
  }];

  public attacks = [{
    name: 'Slam',
    cost: [W, C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 30 damage times the number of heads.'
  }];

  public set: string = 'PLB';
  public setNumber: string = '27';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Tirtouga';
  public fullName: string = 'Tirtouga PLB';

  public readonly PREHISTORIC_CALL_MARKER = 'PREHISTORIC_CALL_MARKER_TIRTOUGA';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.PREHISTORIC_CALL_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      if (!player.discard.cards.includes(this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.PREHISTORIC_CALL_MARKER, this);
      ABILITY_USED(player, this);

      // Move to bottom of deck
      MOVE_CARDS(store, state, player.discard, player.deck, { cards: [this], sourceCard: this });
      const index = player.deck.cards.indexOf(this);
      if (index !== -1) {
        player.deck.cards.splice(index, 1);
        player.deck.cards.push(this);
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        const heads = results.filter(r => r).length;
        effect.damage = 30 * heads;
      });
    }

    return state;
  }
}
