import { CardTag, CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import {
  CheckProvidedEnergyEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect, EnergyEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { GameError, GameMessage, PlayerType } from '../../../game';
import {IS_SPECIAL_ENERGY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TeamRocketsEnergy extends EnergyCard {
  public provides: CardType[] = [CardType.COLORLESS];
  protected _tags = [CardTag.TEAM_ROCKET];
  public energyType = EnergyType.SPECIAL;
  public regulationMark = 'I';
  public set: string = 'DRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '182';
  public name = "Team Rocket's Energy";
  public fullName = "Team Rocket's Energy DRI";

  public text = `This card can only be attached to a Team Rocket's Pokémon. If this card is attached to anything other than a Team Rocket's Pokémon, discard this card.

As long as this card is attached to a Pokémon, it provides 2 in any combination of [P] Energy and [D] Energy.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Prevent attaching to non Team Rocket's Pokemon
    if (effect instanceof AttachEnergyEffect) {
      if (
        effect.energyCard === this &&
        !effect.target.getPokemonCard()?.hasTag(CardTag.TEAM_ROCKET)
      ) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Discard card when not attached to Team Rocket's Pokemon
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (
            !cardList.cards.includes(this) ||
            IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, cardList)
          ) {
            return;
          }

          const pokemonCard = cardList.getPokemonCard();
          if (pokemonCard && !pokemonCard.hasTag(CardTag.TEAM_ROCKET)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }

    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      try {
        const energyEffect = new EnergyEffect(effect.player, this);
        store.reduceEffect(state, energyEffect);
      } catch {
        return state;
      }

      const choosable = [CardType.PSYCHIC, CardType.DARK];
      effect.energyMap.push({ card: this, provides: [...choosable] });
      effect.energyMap.push({ card: this, provides: [...choosable] });
    }
    return state;
  }
}
