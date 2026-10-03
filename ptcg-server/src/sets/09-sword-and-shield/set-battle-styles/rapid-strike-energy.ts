import { CardTag, CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  CheckProvidedEnergyEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { PlayerType } from '../../../game';
import { EnergyEffect } from '../../../game/store/effects/play-card-effects';
import {IS_SPECIAL_ENERGY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RapidStrikeEnergy extends EnergyCard {
  protected _tags = [CardTag.RAPID_STRIKE];
  public regulationMark = 'E';
  public provides: CardType[] = [C];
  public energyType = EnergyType.SPECIAL;
  public set: string = 'BST';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '140';
  public name = 'Rapid Strike Energy';
  public fullName = 'Rapid Strike Energy BST';

  public text = `This card can only be attached to a Rapid Strike Pokémon. If this card is attached to anything other than a Rapid Strike Pokémon, discard this card.

As long as this card is attached to a Pokémon, it provides 2 in any combination of [W] Energy and [F] Energy.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      try {
        const energyEffect = new EnergyEffect(effect.player, this);
        store.reduceEffect(state, energyEffect);
      } catch {
        return state;
      }

      const choosable = [CardType.FIGHTING, CardType.WATER];
      effect.energyMap.push({ card: this, provides: [...choosable] });
      effect.energyMap.push({ card: this, provides: [...choosable] });
    }

    // Discard card when not attached to Rapid Strike Pokemon
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (
            !cardList.cards.includes(this) ||
            IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, cardList)
          ) {
            return;
          }

          if (!cardList.getPokemonCard()?.hasTag(CardTag.RAPID_STRIKE)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}
