import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { PlayerType } from '../../../game/store/actions/play-card-action';
import { CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import {
  CheckPokemonTypeEffect,
  CheckProvidedEnergyEffect,
  CheckTableStateEffect
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import {IS_SPECIAL_ENERGY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class StrongEnergy extends EnergyCard {

  public provides: CardType[] = [];

  public energyType = EnergyType.SPECIAL;

  public set: string = 'FFI';

  public name = 'Strong Energy';

  public fullName = 'Strong Energy FFI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '104';

  public readonly STRONG_ENERGY_MAREKER = 'STRONG_ENERGY_MAREKER';

  public text =
    'This card can only be attached to [F] Pokemon. This card provides [F] Energy only while this card is attached to a [F] Pokemon.' +
    '\n\n' +
    'The attacks of the [F] Pokemon this card is attached to do 20 more damage to your opponent\'s Active Pokemon (before applying Weakness and Resistance).' +
    '\n\n' +
    '(If this card is attached to anything other than a [F] Pokemon, discard this card.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Provide energy when attached to Fighting Pokemon
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      const checkPokemonType = new CheckPokemonTypeEffect(effect.source);
      store.reduceEffect(state, checkPokemonType);

      if (checkPokemonType.cardTypes.includes(CardType.FIGHTING)) {
        effect.energyMap.push({ card: this, provides: [CardType.FIGHTING] });
      }
    }

    // Prevent attaching to non Fighting Pokemon
    if (effect instanceof AttachEnergyEffect && effect.energyCard === this) {
      const checkPokemonType = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkPokemonType);

      if (!checkPokemonType.cardTypes.includes(CardType.FIGHTING)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Discard card when not attached to Fighting Pokemon
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach(player => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (!cardList.cards.includes(this) || IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, cardList)) {
            return;
          }

          const checkPokemonType = new CheckPokemonTypeEffect(cardList);
          store.reduceEffect(state, checkPokemonType);
          if (!checkPokemonType.cardTypes.includes(CardType.FIGHTING)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }

    // +20 Damage
    if (effect instanceof DealDamageEffect && effect.source.cards.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (effect.target !== opponent.active || IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, effect.source)) {
        return state;
      }

      effect.damage += 20;
    }

    return state;
  }

}
