import { GameError, GameMessage, PlayerType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import {
  CheckProvidedEnergyEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {
  EffectOfAbilityEffect,
  PlaceDamageCountersEffect,
} from '../../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import {IS_SPECIAL_ENERGY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class FusionStrikeEnergy extends EnergyCard {
  public provides: CardType[] = [CardType.COLORLESS];

  protected _tags = [CardTag.FUSION_STRIKE];

  public energyType = EnergyType.SPECIAL;

  public set: string = 'FST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '244';

  public regulationMark = 'E';

  public name = 'Fusion Strike Energy';

  public fullName = 'Fusion Strike Energy FST';

  public text =
    'This card can only be attached to a Fusion Strike Pokémon. If this card is attached to anything other than a Fusion Strike Pokémon, discard this card.' +
    '\n\n' +
    "As long as this card is attached to a Pokémon, it provides every type of Energy but provides only 1 Energy at a time. Prevent all effects of your opponent's Pokémon's Abilities done to the Pokémon this card is attached to.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Provide energy when attached to Fusion Strike Pokemon
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      const pokemon = effect.source;

      if (pokemon.getPokemonCard()?.hasTag(CardTag.FUSION_STRIKE)) {
        effect.energyMap.push({ card: this, provides: [CardType.ANY] });
      }
    }

    // Prevent effects of abilities from opponent's Pokemon
    if (effect instanceof EffectOfAbilityEffect && effect.target?.cards.includes(this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);

      // Check for Fusion Strike Energy on the opposing side from the player using the ability
      if (
        opponent.getPokemonInPlay().includes(effect.target) &&
        effect.target.cards.includes(this)
      ) {
        // Check if Fusion Strike Energy has any effects
        if (!IS_SPECIAL_ENERGY_BLOCKED(store, state, opponent, this, effect.target, true)) {
          effect.target = undefined;
        }
      }
    }

    if (
      effect instanceof PlaceDamageCountersEffect &&
      effect.target.energies.cards.includes(this)
    ) {
      effect.preventDefault = true;
    }

    // Prevent attaching to non Fusion Strike Pokemon
    if (effect instanceof AttachEnergyEffect) {
      if (
        effect.energyCard === this &&
        !effect.target.getPokemonCard()?.hasTag(CardTag.FUSION_STRIKE)
      ) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Discard card when not attached to Fusion Strike Pokemon
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (
            !cardList.cards.includes(this) ||
            IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, cardList)
          ) {
            return;
          }

          if (!cardList.getPokemonCard()?.hasTag(CardTag.FUSION_STRIKE)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}
