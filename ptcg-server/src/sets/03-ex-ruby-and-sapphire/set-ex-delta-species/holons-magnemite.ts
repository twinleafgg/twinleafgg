import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { EnergyCard } from '../../../game/store/card/energy-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PowerType,
  PlayerType,
  SlotType,
  GameError,
  GameMessage,
  ChoosePokemonPrompt,
  PokemonCardList,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class HolonsMagnemite extends PokemonCard implements EnergyCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.HOLONS];
  public cardType: CardType[] = [M];
  public hp: number = 40;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Special Energy Effect',
      powerType: PowerType.HOLONS_SPECIAL_ENERGY_EFFECT,
      useFromHand: true,
      text: 'You may attach this as an Energy card from your hand to 1 of your Pokémon. While attached, this card is a Special Energy card and provides [C] Energy. [Click this effect to use it.]',
    },
  ];

  public attacks = [
    {
      name: 'Linear Attack',
      cost: [M],
      damage: 0,
      text: "Choose 1 of your opponent's Pokémon. This attack does 10 damage to that Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '70';
  public name: string = "Holon's Magnemite";
  public fullName: string = "Holon's Magnemite DS";

  // EnergyCard interface properties
  public provides: CardType[] = [CardType.COLORLESS];
  public energyType = EnergyType.SPECIAL;
  public text: string = 'This card provides [C] Energy.';
  public isBlocked = false;
  public energyEffect: any = undefined;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Auto-detect if we've been removed from energies (e.g. discarded, returned to hand)
    // and reset superType back to POKEMON
    if (this.superType === SuperType.ENERGY) {
      const cardList = StateUtils.findCardList(state, this);
      if (!(cardList instanceof PokemonCardList) || !cardList.energies.cards.includes(this)) {
        this.superType = SuperType.POKEMON;
      }
    }

    // The Special Energy Stuff
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.energyPlayedTurn === state.turn) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      player.energyPlayedTurn = state.turn;

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return;
          }

          // Moving it onto the pokemon - first to main cards array, then to energies
          effect.preventDefault = true;
          MOVE_CARDS(store, state, player.hand, targets[0], { cards: [this], sourceCard: this });
          if (!targets[0].energies.cards.includes(this)) {
            targets[0].energies.cards.push(this);
          }
          this.superType = SuperType.ENERGY;
        },
      );
    }

    // Provide energy when attached as energy
    if (
      effect instanceof CheckProvidedEnergyEffect &&
      effect.source.energies.cards.includes(this)
    ) {
      effect.energyMap.push({ card: this, provides: this.provides });
    }

    // Linear Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state);
    }

    return state;
  }
}
