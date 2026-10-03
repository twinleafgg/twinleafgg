import { Card, PokemonCardList } from '../../../game';
import { CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import {IS_SPECIAL_ENERGY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class RecycleEnergy extends EnergyCard {

  public provides: CardType[] = [CardType.COLORLESS];

  public energyType = EnergyType.SPECIAL;

  public set: string = 'UNM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '212';

  public name = 'Recycle Energy';

  public fullName = 'Recycle Energy UNM';

  public text =
    `This card provides [C] Energy.
    
If this card is discarded from play, put it into your hand instead of the discard pile.`;

  public RECYCLE_ENERGY_MARKER = 'RECYCLE_ENERGY_MARKER';

  public attachedTo?: PokemonCardList;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof AttachEnergyEffect && effect.energyCard === this) {
      this.attachedTo = effect.target;
      effect.player.marker.addMarker(this.RECYCLE_ENERGY_MARKER, this);
    }

    if (effect instanceof CheckTableStateEffect && state.players.some(p => p.discard.cards.includes(this))) {
      state.players.forEach(player => {
        if (!player.marker.hasMarker(this.RECYCLE_ENERGY_MARKER, this)) {
          return;
        }

        if (this.attachedTo && IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, this.attachedTo)) {
          player.marker.removeMarker(this.RECYCLE_ENERGY_MARKER, this);
          return;
        }

        const rescued: Card[] = player.marker.markers
          .filter(m => m.name === this.RECYCLE_ENERGY_MARKER && m.source !== undefined)
          .map(m => m.source!);

        MOVE_CARDS(store, state, player.discard, player.hand, { cards: rescued, sourceCard: this });
        player.marker.removeMarker(this.RECYCLE_ENERGY_MARKER, this);
        this.attachedTo = undefined;
      });
    }
    return state;
  }

}
