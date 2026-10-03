import { CardList, EnergyCard, GameLog } from '../../../game';
import { EnergyType, TrainerType, SuperType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class EnergyPouch extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'FCO';

  public name: string = 'Energy Pouch';

  public fullName: string = 'Energy Pouch FCO';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '97';

  public text: string =
    "If the Pokémon this card is attached to is Knocked Out by damage from an opponent's attack, put all basic Energy attached to that Pokémon into your hand.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof KnockOutEffect &&
      effect.target.tools.includes(this) &&
      effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)
    ) {
      const player = effect.player;

      const target = effect.target;

      const removedCards = [];

      const pokemonIndices = effect.target.cards.map((card, index) => index);

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      for (let i = pokemonIndices.length - 1; i >= 0; i--) {
        const removedCard = target.cards.splice(pokemonIndices[i], 1)[0];
        removedCards.push(removedCard);
        target.damage = 0;
      }

      const basicEnergy = new CardList();
      basicEnergy.cards = removedCards.filter(
        (c) =>
          c.superType === SuperType.ENERGY && (c as EnergyCard).energyType === EnergyType.BASIC,
      );

      basicEnergy.cards.forEach((c) => {
        store.log(state, GameLog.LOG_PLAYER_RETURNS_CARD_TO_HAND, {
          name: player.name,
          card: c.name,
        });
      });

      MOVE_CARDS(store, state, basicEnergy, player.hand, { sourceCard: this });

      return state;
    }
    return state;
  }
}
