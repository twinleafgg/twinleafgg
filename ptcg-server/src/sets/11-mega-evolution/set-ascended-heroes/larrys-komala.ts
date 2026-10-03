import {
  PokemonCard,
  Stage,
  CardTag,
  CardType,
  PowerType,
  StoreLike,
  State,
  GameError,
  GameMessage,
  AttachEnergyPrompt,
  PlayerType,
  SlotType,
  SuperType,
  StateUtils,
  SpecialCondition,
} from '../../../game';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {ABILITY_USED,
  WAS_ATTACK_USED,
  DRAW_CARDS,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LarrysKomala extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.LARRYS];
  public cardType: CardType[] = [C];
  public hp: number = 90;
  public weakness = [{ type: L }];
  public resistance = [];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Lethargic Charge',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: "Once during your turn, if this Pokémon is on your Bench, you may use this Ability. Attach an Energy card from your hand to your Active Larry's Pokémon.",
    },
  ];

  public attacks = [
    {
      name: 'Dozing Draw',
      cost: [C],
      damage: 0,
      text: 'This Pokémon is now Asleep. Draw 2 cards.',
    },
  ];

  public regulationMark = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '175';
  public name: string = "Larry's Komala";
  public fullName: string = "Larry's Komala MC";

  public readonly LETHARGIC_CHARGE_MARKER = 'LETHARGIC_CHARGE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lethargic Charge ability
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      // Check if this Pokemon is on Bench
      let isOnBench = false;
      player.bench.forEach((benchSlot) => {
        if (benchSlot.getPokemonCard() === this) {
          isOnBench = true;
        }
      });

      if (!isOnBench) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.LETHARGIC_CHARGE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      // Check if player has Active Larry's Pokemon
      const activePokemon = player.active.getPokemonCard();
      if (!activePokemon || !activePokemon.name.startsWith("Larry's")) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_ACTIVE,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: true, min: 0, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          if (transfers.length > 0) {
            for (const transfer of transfers) {
              const target = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
            }
            player.marker.addMarker(this.LETHARGIC_CHARGE_MARKER, this);
            ABILITY_USED(player, this);
          }
        },
      );
    }

    // Drowsy Draw attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Apply Asleep
      const specialConditionEffect = new AddSpecialConditionsEffect(effect, [
        SpecialCondition.ASLEEP,
      ]);
      specialConditionEffect.target = player.active;
      store.reduceEffect(state, specialConditionEffect);

      // Draw 2 cards
      DRAW_CARDS(store, state, player, 2);
    }

    // Reset marker at end of turn
    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.LETHARGIC_CHARGE_MARKER, this)
    ) {
      effect.player.marker.removeMarker(this.LETHARGIC_CHARGE_MARKER, this);
    }

    return state;
  }
}
