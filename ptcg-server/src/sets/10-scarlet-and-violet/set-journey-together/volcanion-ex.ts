import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  SpecialCondition,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PowerType,
  AttachEnergyPrompt,
  GameMessage,
  PlayerType,
  SlotType,
  StateUtils,
  GameError,
} from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AddSpecialConditionsPowerEffect } from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Volcanionex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.FIRE];
  public hp: number = 220;
  public weakness = [{ type: CardType.WATER }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Scorching Steam',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: "Once during your turn, if this Pokemon is in your Active Spot, you may make your opponent's Active Pokémon Burned.",
    },
  ];

  public attacks = [
    {
      name: 'Heat Cyclone',
      cost: [CardType.FIRE, CardType.FIRE, CardType.COLORLESS],
      damage: 160,
      text: 'Move an Energy from this Pokémon to 1 of your Benched Pokémon.',
    },
  ];

  public set: string = 'JTG';
  public regulationMark = 'I';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '31';
  public name: string = 'Volcanion ex';
  public fullName: string = 'Volcanion ex JTG';

  public readonly SCORCHING_STEAM = 'SCORCHING_STEAM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      effect.player.marker.removeMarker(this.SCORCHING_STEAM, this);
    }

    // Scorching Steam
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.active.getPokemonCard() !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.SCORCHING_STEAM, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const specialCondition = new AddSpecialConditionsPowerEffect(
        opponent,
        this,
        opponent.active,
        [SpecialCondition.BURNED],
      );
      store.reduceEffect(state, specialCondition);

      player.marker.addMarker(this.SCORCHING_STEAM, this);
      return store.reduceEffect(state, specialCondition);
    }

    // Heat Cyclone
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasBench = player.bench.some((b) => b.cards.length > 0);

      if (hasBench === false) {
        return state;
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.active,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 1, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.SCORCHING_STEAM, this);
    }

    return state;
  }
}
