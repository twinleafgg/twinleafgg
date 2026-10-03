import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PowerType,
  PlayerType,
  SlotType,
  GameError,
  StateUtils,
  EnergyCard,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { DiscardEnergyPrompt } from '../../../game/store/prompts/discard-energy-prompt';
import {ABILITY_USED,
  ADD_MARKER,
  DRAW_CARDS_UNTIL_CARDS_IN_HAND,
  REMOVE_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Magnezone extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Magneton';
  protected _tags = [CardTag.PRIME];
  public cardType: CardType[] = [L];
  public hp: number = 140;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Magnetic Draw',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn (before your attack), you may draw cards until you have 6 cards in your hand. This power can't be used if Magnezone is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Lost Burn',
      cost: [L, C],
      damage: 50,
      damageCalculation: 'x',
      text: 'Put as many Energy cards attached to your Pokémon as you like in the Lost Zone. This attack does 50 damage times the number of Energy cards put in the Lost Zone in this way.',
    },
  ];

  public set: string = 'TM';
  public setNumber: string = '96';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Magnezone';
  public fullName: string = 'Magnezone TM';

  public readonly MAGNETIC_DRAW_MARKER = 'MAGNETIC_DRAW_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      REMOVE_MARKER(this.MAGNETIC_DRAW_MARKER, effect.player, this);
    }

    // Magnetic Draw
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.hand.cards.length >= 6) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.MAGNETIC_DRAW_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 6);

      ADD_MARKER(this.MAGNETIC_DRAW_MARKER, player, this);
      ABILITY_USED(player, this);

      return state;
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.MAGNETIC_DRAW_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let totalEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const energyCount = cardList.cards.filter((card) => card instanceof EnergyCard).length;
        totalEnergy += energyCount;
      });

      return store.prompt(
        state,
        new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { min: 1, max: totalEnergy, allowCancel: false },
        ),
        (transfers) => {
          if (transfers === null) {
            return state;
          }

          // Move all selected energies to lost zone
          transfers.forEach((transfer) => {
            const source = StateUtils.getTarget(state, player, transfer.from);
            MOVE_CARDS(store, state, source, player.lostzone, { cards: [transfer.card], sourceCard: this });
          });

          // Set damage based on number of discarded cards
          effect.damage = transfers.length * 50;
          return state;
        },
      );
    }
    return state;
  }
}
