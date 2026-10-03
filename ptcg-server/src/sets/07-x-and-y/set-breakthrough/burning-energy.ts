import { GameError, GameMessage, PlayerType, State, StoreLike } from '../../../game';
import { CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect, CheckProvidedEnergyEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import {IS_SPECIAL_ENERGY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class BurningEnergy extends EnergyCard {
  public provides: CardType[] = [];
  public energyType = EnergyType.SPECIAL;
  public set: string = 'BKT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '151';
  public name = 'Burning Energy';
  public fullName = 'Burning Energy BKT';

  public text = `This card can only be attached to [R] Pokémon. This card provides [R] Energy only while this card is attached to a [R] Pokémon.

If this card is discarded by an attack of the [R] Pokémon this card is attached to, attach this card from your discard pile to that Pokémon after attacking.

(If this card is attached to anything other than a [R] Pokémon, discard this card.)`;

  public readonly BURNING_EXISTANCE_MARKER = 'BURNING_EXISTANCE_MARKER';
  public readonly BURNING_DISCARDED_MARKER = 'BURNING_DISCARDED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Provide energy when attached to Fire Pokemon
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      const checkPokemonType = new CheckPokemonTypeEffect(effect.source);
      store.reduceEffect(state, checkPokemonType);

      if (checkPokemonType.cardTypes.includes(CardType.FIRE)) {
        effect.energyMap.push({ card: this, provides: [CardType.FIRE] });
      }
    }

    // Prevent attaching to non Fire Pokemon
    if (effect instanceof AttachEnergyEffect && effect.energyCard === this) {
      const checkPokemonType = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkPokemonType);

      if (!checkPokemonType.cardTypes.includes(CardType.FIRE)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Discard card when not attached to Fire Pokemon
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach(player => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (!cardList.cards.includes(this) || IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, cardList)) {
            return;
          }

          const checkPokemonType = new CheckPokemonTypeEffect(cardList);
          store.reduceEffect(state, checkPokemonType);
          if (!checkPokemonType.cardTypes.includes(CardType.FIRE)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }

    if (effect instanceof AttackEffect && effect.source.cards.includes(this) && effect.player.active === effect.source) {
      if (IS_SPECIAL_ENERGY_BLOCKED(store, state, effect.player, this, effect.source)) {
        return state;
      }
      effect.player.marker.addMarker(this.BURNING_EXISTANCE_MARKER, this);
    }

    // checking if this card is discarded while attacking
    if (effect instanceof DiscardCardsEffect && effect.player.marker.hasMarker(this.BURNING_EXISTANCE_MARKER, this)) {
      if (IS_SPECIAL_ENERGY_BLOCKED(store, state, effect.player, this, effect.source)) {
        return state;
      }
      effect.player.marker.addMarker(this.BURNING_DISCARDED_MARKER, this);
    }

    // removing the markers and handling the reattaching of it
    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.BURNING_EXISTANCE_MARKER, this)) {
      effect.player.marker.removeMarker(this.BURNING_EXISTANCE_MARKER, this);

      // if this card was in the discard and triggered that earlier part, move it onto the acitve
      if (effect.player.marker.hasMarker(this.BURNING_DISCARDED_MARKER, this)) {
        effect.player.marker.removeMarker(this.BURNING_DISCARDED_MARKER, this);

        if (effect.player.active !== undefined) {
          effect.player.discard.cards.forEach(card => {
            if (card === this) {
              MOVE_CARDS(store, state, effect.player.discard, effect.player.active, { cards: [card], sourceCard: this });
            }
          });
        }
      }
    }
    return state;
  }
}