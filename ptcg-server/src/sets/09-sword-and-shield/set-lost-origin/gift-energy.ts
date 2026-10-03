import { CardType, EnergyType } from '../../../game/store/card/card-types';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { StoreLike } from '../../../game/store/store-like';
import { State, GamePhase } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import {IS_SPECIAL_ENERGY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GiftEnergy extends EnergyCard {

  public provides: CardType[] = [CardType.COLORLESS];

  public energyType = EnergyType.SPECIAL;

  public set: string = 'LOR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '171';

  public regulationMark = 'F';

  public name = 'Gift Energy';

  public fullName = 'Gift Energy LOR';

  public readonly GIFT_ENERGY_MARKER = 'GIFT_ENERGY_MARKER';

  public text =
    'As long as this card is attached to a Pokémon, it provides [C] Energy. ' +
    ' ' +
    'If the Pokémon this card is attached to is Knocked Out by damage from an attack from your opponent\'s Pokémon, draw cards until you have 7 cards in your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this)) {
      const player = effect.player;

      // Do not activate between turns, or when it's not opponents turn.
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      if (IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, effect.target)) {
        return state;
      }

      const target = effect.target;
      const cards = target.getPokemons();
      cards.forEach(card => {
        player.marker.addMarker(this.GIFT_ENERGY_MARKER, card);
      });
    }

    if (effect instanceof BetweenTurnsEffect) {
      state.players.forEach(player => {

        if (!player.marker.hasMarker(this.GIFT_ENERGY_MARKER)) {
          return;
        }

        while (player.hand.cards.length < 7) {
          if (player.deck.cards.length === 0) {
            break;
          }
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
        }
        player.marker.removeMarker(this.GIFT_ENERGY_MARKER);
      });
    }
    return state;
  }
}
