import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  EnergyType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PlayerType,
  SlotType,
  PowerType,
  ConfirmPrompt,
  AttachEnergyPrompt,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { MovedToActiveEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import {MOVED_TO_ACTIVE_THIS_TURN,
  REMOVE_MARKER_AT_END_OF_TURN,
  SHUFFLE_DECK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Yanmegaex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public regulationMark = 'I';
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Yanma';
  public cardType: CardType[] = [G];
  public hp: number = 280;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Buzz Boost',
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, when this Pokémon moves from your Bench to the Active Spot, you may search your deck for up to 3 Basic [G] Energy and attach them to this Pokémon. Then, shuffle your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Jet Cyclone',
      cost: [G, G, G, C],
      damage: 210,
      text: 'Move 3 Energy from this Pokémon to 1 of your Benched Pokémon.',
    },
  ];

  public set: string = 'DRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Yanmega ex';
  public fullName: string = 'Yanmega ex DRI';

  public readonly BUZZ_BOOST_MARKER = 'BUZZ_BOOST_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.BUZZ_BOOST_MARKER, this);

    const player = state.players[state.activePlayer];
    if (
      effect instanceof MovedToActiveEffect &&
      effect.pokemonCard === this &&
      state.players[state.activePlayer] === effect.player &&
      MOVED_TO_ACTIVE_THIS_TURN(effect.player, this)
    ) {
      if (player.marker.hasMarker(this.BUZZ_BOOST_MARKER, this)) {
        return state;
      }

      state = store.prompt(
        state,
        new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (!wantToUse) {
            player.marker.addMarker(this.BUZZ_BOOST_MARKER, this);
            return;
          }

          try {
            const stub = new PowerEffect(
              player,
              {
                name: 'test',
                powerType: PowerType.ABILITY,
                text: '',
              },
              this,
            );
            store.reduceEffect(state, stub);
          } catch {
            return;
          }

          player.marker.addMarker(this.BUZZ_BOOST_MARKER, this);

          state = store.prompt(
            state,
            new AttachEnergyPrompt(
              player.id,
              GameMessage.ATTACH_ENERGY_TO_BENCH,
              player.deck,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.ACTIVE],
              { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Grass Energy' },
              { allowCancel: false, min: 0, max: 3 },
            ),
            (transfers) => {
              transfers = transfers || [];
              if (transfers.length === 0) {
                SHUFFLE_DECK(store, state, player);
                return;
              }

              for (const transfer of transfers) {
                const target = StateUtils.getTarget(state, player, transfer.to);
                MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
                SHUFFLE_DECK(store, state, player);
              }
            },
          );
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.active,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 3, max: 3, sameTarget: true },
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
    return state;
  }
}
