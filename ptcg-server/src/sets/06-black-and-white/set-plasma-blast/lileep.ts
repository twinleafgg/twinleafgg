import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, GameError, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class Lileep extends PokemonCard {
  public stage: Stage = Stage.RESTORED;
  public evolvesFrom: string = 'Root Fossil Lileep';
  public cardType: CardType[] = [G];
  public hp: number = 80;
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Prehistoric Call',
    useFromDiscard: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), if this Pok\u00e9mon is in your discard pile, you may put this Pok\u00e9mon on the bottom of your deck.'
  }];

  public attacks = [
    {
      name: 'Spiral Drain',
      cost: [G, C],
      damage: 20,
      text: 'Heal 10 damage from this Pok\u00e9mon.'
    }
  ];

  public set: string = 'PLB';
  public setNumber: string = '3';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Lileep';
  public fullName: string = 'Lileep PLB';

  public readonly PREHISTORIC_CALL_MARKER = 'PREHISTORIC_CALL_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (!player.discard.cards.includes(this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.PREHISTORIC_CALL_MARKER, this);
      ABILITY_USED(player, this);

      // Move to bottom of deck
      MOVE_CARDS(store, state, player.discard, player.deck, { cards: [this], sourceCard: this });
      // Move to bottom: remove from current position and push to end
      const index = player.deck.cards.indexOf(this);
      if (index !== -1) {
        player.deck.cards.splice(index, 1);
        player.deck.cards.push(this);
      }
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.PREHISTORIC_CALL_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(10, effect, store, state);
    }

    return state;
  }
}
