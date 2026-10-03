import { CardTag, CardTarget, CardType, ConfirmPrompt, GameLog, GameMessage, MoveEnergyPrompt, PlayerType, PokemonCard, PowerType, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { MovedToActiveEffect } from "../../../game/store/effects/game-effects";
import {REMOVE_MARKER_AT_END_OF_TURN, MOVED_TO_ACTIVE_THIS_TURN, IS_ABILITY_BLOCKED, WAS_ATTACK_USED, THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class XerneasPrismStar extends PokemonCard {
  protected _tags = [CardTag.PRISM_STAR];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [Y];
  public hp: number = 160;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Path of Life',
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, when this Pokémon moves from your Bench to become your Active Pokémon, you may move any number of Energy from your other Pokémon to it.',
  }];

  public attacks = [{
    name: 'Bright Horns',
    cost: [Y, Y, Y],
    damage: 160,
    text: "This Pokémon can't use Bright Horns during your next turn.",
  }];

  public set: string = 'LOT';
  public setNumber: string = '144';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Xerneas Prism Star';
  public fullName: string = 'Xerneas \u25C7 LOT';

  public readonly ABILITY_USED_MARKER = 'XERNEAS_LOT_ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);

    const player = state.players[state.activePlayer];
    if (
      effect instanceof MovedToActiveEffect &&
      effect.pokemonCard === this &&
      state.players[state.activePlayer] === effect.player &&
      MOVED_TO_ACTIVE_THIS_TURN(effect.player, this)
    ) {
      if (player.marker.hasMarker(this.ABILITY_USED_MARKER, this)) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      state = store.prompt(
        state,
        new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (!wantToUse) {
            player.marker.addMarker(this.ABILITY_USED_MARKER, this);
            return;
          }

          store.log(state, GameLog.LOG_PLAYER_USES_ABILITY, {
            name: player.name,
            ability: 'Path of Life',
          });

          const blockedFrom: CardTarget[] = [];
          const blockedTo: CardTarget[] = [];

          let hasEnergyOnOther = false;
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
            if (cardList === player.active) {
              blockedFrom.push(target);
              return;
            }
            blockedTo.push(target);
            if (cardList.cards.some((c) => c.superType === SuperType.ENERGY)) {
              hasEnergyOnOther = true;
            }
          });

          if (!hasEnergyOnOther) {
            player.marker.addMarker(this.ABILITY_USED_MARKER, this);
            return;
          }

          return store.prompt(
            state,
            new MoveEnergyPrompt(
              player.id,
              GameMessage.MOVE_ENERGY_CARDS,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.BENCH, SlotType.ACTIVE],
              { superType: SuperType.ENERGY },
              { allowCancel: true, blockedFrom, blockedTo },
            ),
            (transfers) => {
              player.marker.addMarker(this.ABILITY_USED_MARKER, this);

              if (!transfers) {
                return;
              }

              for (const transfer of transfers) {
                const source = StateUtils.getTarget(state, player, transfer.from);
                MOVE_CARDS(store, state, source, player.active, { cards: [transfer.card], sourceCard: this });
              }
            },
          );
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, effect.attack);
    }

    return state;
  }
}
