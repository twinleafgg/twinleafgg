import {
  CardTag,
  CardType,
  EnergyType,
  SpecialCondition,
} from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  AddSpecialConditionsPowerEffect,
  CheckProvidedEnergyEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { GameError, GameMessage, PlayerType, StateUtils } from '../../../game';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import {IS_SPECIAL_ENERGY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class SpiralEnergy extends EnergyCard {
  protected _tags = [CardTag.RAPID_STRIKE];

  public regulationMark = 'E';

  public provides: CardType[] = [CardType.COLORLESS];

  public energyType = EnergyType.SPECIAL;

  public set: string = 'CRE';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '159';

  public name = 'Spiral Energy';

  public fullName = 'Spiral Energy CRE';

  public text =
    'This card can only be attached to a Rapid Strike Pokémon. If this card is attached to anything other than a Rapid Strike Pokémon, discard this card.' +
    '\n\n' +
    "As long as this card is attached to a Pokémon, it provides every type of Energy but provides only 1 Energy at a time. The Pokémon this card is attached to can't be Paralyzed, and if it is already Paralyzed, it recovers from that Special Condition.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Provide energy when attached to Single Strike Pokemon
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      const pokemon = effect.source;

      if (pokemon.getPokemonCard()?.hasTag(CardTag.RAPID_STRIKE)) {
        effect.energyMap.push({ card: this, provides: [CardType.ANY] });
      }
      return state;
    }

    // Prevent attaching to non Rapid Strike Pokemon
    if (effect instanceof AttachEnergyEffect) {
      if (
        effect.energyCard === this &&
        !effect.target.getPokemonCard()?.hasTag(CardTag.RAPID_STRIKE)
      ) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Heal Paralysis, discard card when not attached to Rapid Strike Pokemon
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (
            !cardList.cards.includes(this) ||
            IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, cardList)
          ) {
            return;
          }

          // Remove Paralysis before discarding as per ruling
          cardList.removeSpecialCondition(SpecialCondition.PARALYZED);

          if (!cardList.getPokemonCard()?.hasTag(CardTag.RAPID_STRIKE)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }

    // Prevent Paralysis
    if (
      effect instanceof AddSpecialConditionsEffect ||
      effect instanceof AddSpecialConditionsPowerEffect
    ) {
      const player = StateUtils.findOwner(state, effect.target);

      if (
        !effect.target.cards.includes(this) ||
        IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, effect.target)
      ) {
        return state;
      }

      effect.specialConditions = effect.specialConditions.filter(
        (condition) => condition !== SpecialCondition.PARALYZED,
      );
    }

    return state;
  }
}
