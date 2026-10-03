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
import {ADD_PARALYZED_TO_PLAYER_ACTIVE,
  AFTER_ATTACK,
  COIN_FLIP_PROMPT,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class HolonsVoltorb extends PokemonCard implements EnergyCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.HOLONS];
  public cardType: CardType[] = [L];
  public hp: number = 40;
  public weakness = [{ type: F }];
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
      name: 'Thundershock',
      cost: [L],
      damage: 10,
      text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.',
    },
  ];

  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '71';
  public name: string = "Holon's Voltorb";
  public fullName: string = "Holon's Voltorb DS";

  public provides: CardType[] = [C];

  public energyType = EnergyType.SPECIAL;
  // EnergyCard interface properties

  public text: string = '';

  public isBlocked = false;

  public energyEffect: any = undefined;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Auto-detect if we've been removed from energies and reset superType back to POKEMON
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

    // Provide energy when attached as energy and included in CheckProvidedEnergyEffect
    if (
      effect instanceof CheckProvidedEnergyEffect &&
      effect.source.energies.cards.includes(this)
    ) {
      effect.energyMap.push({ card: this, provides: this.provides });
    }

    // Thundershock
    if (AFTER_ATTACK(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          ADD_PARALYZED_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
        }
      });
    }

    return state;
  }
}
