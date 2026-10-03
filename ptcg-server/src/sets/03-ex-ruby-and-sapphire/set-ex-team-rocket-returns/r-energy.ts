import { GameError, GameMessage, PlayerType, StateUtils } from '../../../game';
import { CardTag, CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import {ADD_MARKER, REMOVE_MARKER, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class REnergy extends EnergyCard {
  public provides: CardType[] = [CardType.COLORLESS];
  public energyType = EnergyType.SPECIAL;
  public set: string = 'TRR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name = 'R Energy';
  public fullName = 'R Energy TRR';

  public text =
    "R Energy can be attached only to a Pokémon that has Dark or Rocket's in its name. While in play, R Energy provides 2 [D] Energy. (Doesn't count as a basic Energy card.) If the Pokémon R Energy is attached to attacks, the attack does 10 more damage to the Active Pokémon (before applying Weakness and Resistance). When your turn ends, discard R Energy.";

  public R_MARKER = 'R_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttachEnergyEffect && effect.energyCard === this) {
      if (
        !effect.target.getPokemonCard()?.hasTag(CardTag.DARK) &&
        !effect.target.getPokemonCard()?.hasTag(CardTag.ROCKETS)
      ) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      ADD_MARKER(this.R_MARKER, effect.player, this);
    }

    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      const attachedTo = effect.source.getPokemonCard();
      if (!!attachedTo && attachedTo instanceof PokemonCard) {
        effect.energyMap.push({ card: this, provides: [CardType.DARK, CardType.DARK] });
      }

      return state;
    }

    if (
      effect instanceof BetweenTurnsEffect &&
      effect.player.marker.hasMarker(this.R_MARKER, this)
    ) {
      const player = effect.player;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList.cards.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          REMOVE_MARKER(this.R_MARKER, effect.player, this);
        }
      });
    }

    if (effect instanceof DealDamageEffect) {
      if (effect.source.cards.includes(this)) {
        const player = effect.player;
        const opponent = StateUtils.getOpponent(state, player);
        if (effect.target !== opponent.active) {
          return state;
        }

        effect.damage += 10;
      }
    }

    return state;
  }
}
