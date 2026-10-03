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
import {DRAW_UP_TO_X_CARDS,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class HolonsCastform extends PokemonCard implements EnergyCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.HOLONS];
  public cardType: CardType[] = [C];
  public hp: number = 50;
  public weakness = [{ type: F }];
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
      name: 'Delta Draw',
      cost: [C],
      damage: 0,
      text: 'Count the number of Pokémon you have in play that has δ on its card. Draw up to that many cards.',
    },
  ];

  public set: string = 'HP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '44';
  public name: string = "Holon's Castform";
  public fullName: string = "Holon's Castform HP";

  // Which energies this provides when not attached as an energy
  public provides: CardType[] = [CardType.COLORLESS];
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
      effect.energyMap.push({ card: this, provides: [CardType.ANY, CardType.ANY] });
    }

    // Delta Draw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let deltasInPlay = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (card) => {
        if (card.getPokemonCard()?.hasTag(CardTag.DELTA_SPECIES)) {
          deltasInPlay++;
        }
      });

      DRAW_UP_TO_X_CARDS(store, state, player, deltasInPlay);
    }

    return state;
  }
}
