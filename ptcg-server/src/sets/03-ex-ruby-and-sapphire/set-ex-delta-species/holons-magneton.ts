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
  CardTarget,
  SlotType,
  GameError,
  GameMessage,
  ChoosePokemonPrompt,
  ChooseEnergyPrompt,
  Card,
  PokemonCardList,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {DEAL_MORE_DAMAGE_IF_OPPONENT_ACTIVE_HAS_CARD_TAG,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class HolonsMagneton extends PokemonCard implements EnergyCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = "Holon's Magnemite";
  protected _tags = [CardTag.HOLONS];
  public cardType: CardType[] = [M];
  public hp: number = 70;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Special Energy Effect',
      powerType: PowerType.HOLONS_SPECIAL_ENERGY_EFFECT,
      useFromHand: true,
      text: 'You may attach this as an Energy card from your hand to 1 of your Pokémon that already has an Energy card attached to it. When you attach this card, return an Energy card attached to that Pokémon to your hand. While attached, this card is a Special Energy card and provides every type of Energy but 2 Energy at a time. (Has no effect other than providing Energy.) [Click this effect to use it.]',
    },
  ];

  public attacks = [
    {
      name: 'Extra Ball',
      cost: [M, C],
      damage: 30,
      damageCalculation: '+',
      text: 'If the Defending Pokémon is Pokémon-ex, this attack does 30 damage plus 20 more damage.',
    },
  ];

  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';
  public name: string = "Holon's Magneton";
  public fullName: string = "Holon's Magneton DS";

  // Which energies this provides when attached as an energy
  public provides: CardType[] = [CardType.ANY, CardType.ANY];
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

      let isEnergyOnBench = false;
      let isEnergyOnActive = false;

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      state = store.reduceEffect(state, checkProvidedEnergy);
      const activeEnergyCount = checkProvidedEnergy.energyMap.length;

      if (activeEnergyCount > 0) {
        isEnergyOnActive = true;
      }

      const blockedTo: CardTarget[] = [];
      if (!isEnergyOnActive) {
        const target: CardTarget = {
          player: PlayerType.BOTTOM_PLAYER,
          slot: SlotType.ACTIVE,
          index: 0,
        };
        blockedTo.push(target);
      }

      player.bench.forEach((bench, index) => {
        if (bench.cards.length === 0) {
          return;
        }

        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, bench);
        state = store.reduceEffect(state, checkProvidedEnergy);
        const energyCount = checkProvidedEnergy.energyMap.length;

        if (energyCount > 0) {
          isEnergyOnBench = true;
        } else {
          const target: CardTarget = {
            player: PlayerType.BOTTOM_PLAYER,
            slot: SlotType.BENCH,
            index,
          };
          blockedTo.push(target);
        }
      });

      if (!isEnergyOnActive && !isEnergyOnBench) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, blocked: blockedTo },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return;
          }

          const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, targets[0]);
          state = store.reduceEffect(state, checkProvidedEnergy);

          return store.prompt(
            state,
            new ChooseEnergyPrompt(
              player.id,
              GameMessage.CHOOSE_ENERGIES_TO_HAND,
              checkProvidedEnergy.energyMap,
              [CardType.COLORLESS],
              { allowCancel: false },
            ),
            (energy) => {
              const cards: Card[] = (energy || []).map((e) => e.card);
              MOVE_CARDS(store, state, targets[0], player.hand, { cards: cards, sourceCard: this });

              // Moving it onto the pokemon - first to main cards array, then to energies
              effect.preventDefault = true;
              MOVE_CARDS(store, state, player.hand, targets[0], { cards: [this], sourceCard: this });
              if (!targets[0].energies.cards.includes(this)) {
                targets[0].energies.cards.push(this);
              }
              this.superType = SuperType.ENERGY;
            },
          );
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

    // Extra Ball
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DEAL_MORE_DAMAGE_IF_OPPONENT_ACTIVE_HAS_CARD_TAG(effect, state, 20, CardTag.POKEMON_ex);
    }

    return state;
  }
}
