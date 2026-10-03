import { PokemonCard, Stage, CardTag, CardType, PowerType, StoreLike, State, ConfirmPrompt, GameMessage, CardTarget, PlayerType, EnergyCard, MoveEnergyPrompt, SlotType, SuperType, StateUtils } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { MovedToActiveEffect, PowerEffect } from "../../../game/store/effects/game-effects";
import {REMOVE_MARKER_AT_END_OF_TURN, MOVED_TO_ACTIVE_THIS_TURN, WAS_ATTACK_USED, THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class Cobalionex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [M];
  public hp: number = 210;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Metal Road',
    useWhenInPlay: false,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, when this Pokémon moves from your Bench to the Active Spot, you may use this Ability. Move any amount of [M] Energy from your other Pokémon to this Pokémon.',
  }];

  public attacks = [{
    name: 'Power Tackle',
    cost: [M, M, C],
    damage: 200,
    text: "During your next turn, this Pokémon can't attack.",
  }];

  public regulationMark: string = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '64';
  public name: string = 'Cobalion ex';
  public fullName: string = 'Cobalion ex M4';

  public readonly METAL_ROAD_MARKER = 'METAL_ROAD_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.METAL_ROAD_MARKER, this);

    const player = state.players[state.activePlayer];
    if (
      effect instanceof MovedToActiveEffect &&
      effect.pokemonCard === this &&
      state.players[state.activePlayer] === effect.player &&
      MOVED_TO_ACTIVE_THIS_TURN(effect.player, this)
    ) {
      if (player.marker.hasMarker(this.METAL_ROAD_MARKER, this)) {
        return state;
      }

      state = store.prompt(
        state,
        new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (!wantToUse) {
            player.marker.addMarker(this.METAL_ROAD_MARKER, this);
            return;
          }

          // Try to reduce PowerEffect, to check if something is blocking our ability
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
            return state;
          }

          const blockedFrom: CardTarget[] = [];
          const blockedTo: CardTarget[] = [];
          const blockedMap: {
            source: CardTarget;
            blocked: number[];
          }[] = [];

          let hasMetalOrAnyEnergy = false;
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
            if (cardList === player.active) {
              blockedFrom.push(target);
              return;
            }
            blockedTo.push(target);

            // Block cards that do NOT provide Metal or Any (Colorless)
            const blocked: number[] = [];
            cardList.cards.forEach((c, index) => {
              const providesMetalOrAny =
                c instanceof EnergyCard &&
                (c.provides.includes(CardType.METAL) || c.provides.includes(CardType.ANY));
              if (!providesMetalOrAny) {
                blocked.push(index);
              } else {
                hasMetalOrAnyEnergy = true;
              }
            });
            if (blocked.length > 0) {
              blockedMap.push({ source: target, blocked });
            }
          });

          if (!hasMetalOrAnyEnergy) {
            return state;
          }

          return store.prompt(
            state,
            new MoveEnergyPrompt(
              player.id,
              GameMessage.MOVE_ENERGY_CARDS,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.BENCH, SlotType.ACTIVE], // Only allow moving to active
              { superType: SuperType.ENERGY },
              { allowCancel: true, blockedFrom, blockedTo, blockedMap },
            ),
            (transfers) => {
              // Add marker whether user moved energy or cancelled - once-per-turn consumed
              player.marker.addMarker(this.METAL_ROAD_MARKER, this);

              if (!transfers || transfers.length === 0) {
                return;
              }

              const target = player.active;
              for (const transfer of transfers) {
                const source = StateUtils.getTarget(state, player, transfer.from);
                MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
              }
            },
          );
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    return state;
  }
}
