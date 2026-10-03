import { PokemonCard, CardTag, Stage, CardType, PowerType, StoreLike, State, CardTarget, PlayerType, SuperType, MoveEnergyPrompt, GameMessage, SlotType, EnergyType, CardTransfer, StateUtils, BoardEffect } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { MovedToActiveEffect } from "../../../game/store/effects/game-effects";
import {REMOVE_MARKER_AT_END_OF_TURN, MOVED_TO_ACTIVE_THIS_TURN, IS_ABILITY_BLOCKED, WAS_ATTACK_USED, THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class GalarianSirfetchdV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 210;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Resolute Spear',
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, when this Pokémon moves from your Bench to the Active Spot, you may move any amount of [F] Energy from your other Pokémon to it.',
    },
  ];

  public attacks = [
    {
      name: 'Meteor Smash',
      cost: [F, F, C],
      damage: 200,
      text: "During your next turn, this Pokémon can't attack.",
    },
  ];

  public regulationMark: string = 'D';
  public set: string = 'VIV';
  public setNumber: string = '174';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Galarian Sirfetch'd V";
  public fullName: string = "Galarian Sirfetch'd V VIV";

  public readonly ABILITY_USED_MARKER = 'GALARIAN_SIRFETCHD_V_ABILITY_USED_MARKER';

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

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];

      let hasFightingEnergyOnBench = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList === player.active) {
          blockedFrom.push(target);
          return;
        }
        blockedTo.push(target);
        if (cardList.cards.some((c) => c.superType === SuperType.ENERGY)) {
          hasFightingEnergyOnBench = true;
        }
      });

      if (!hasFightingEnergyOnBench) {
        return state;
      }

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
          { allowCancel: true, blockedTo, blockedFrom },
        ),
        (transfers) => {
          if (!transfers || transfers.length === 0) {
            return;
          }

          const validTransfers: CardTransfer[] = transfers || [];
          for (const transfer of validTransfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            MOVE_CARDS(store, state, source, player.active, { cards: [transfer.card], sourceCard: this });
          }

          player.marker.addMarker(this.ABILITY_USED_MARKER, this);

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    return state;
  }
}
