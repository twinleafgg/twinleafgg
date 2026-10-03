import {
  BoardEffect,
  CardTag,
  CardTarget,
  CardType,
  EnergyType,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  PokemonCard,
  PowerType,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MovedToActiveEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import {MOVED_TO_ACTIVE_THIS_TURN, REMOVE_MARKER_AT_END_OF_TURN, THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class IronMoth extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 130;
  public weakness = [{ type: W }];
  public retreat = [C, C];
  protected _tags = [CardTag.FUTURE];

  public powers = [
    {
      name: 'Thermal Reactor',
      useWhenInPlay: false,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, when this Pokémon moves from your Bench to the Active Spot, you may move any amount of [R] Energy from your other Pokémon to it.',
    },
  ];

  public attacks = [
    {
      name: 'Heat Ray',
      cost: [R, R, C],
      damage: 120,
      text: "During your next turn, this Pokémon can't use Heat Ray.",
    },
  ];

  public regulationMark = 'G';
  public set: string = 'PAR';
  public name: string = 'Iron Moth';
  public fullName: string = 'Iron Moth PAR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '28';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

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

      let hasEnergyOnBench = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList === player.active) {
          blockedFrom.push(target);
          return;
        }
        blockedTo.push(target);
        if (cardList.energies.cards.some((c) => c.superType === SuperType.ENERGY)) {
          hasEnergyOnBench = true;
        }
      });

      if (hasEnergyOnBench === false) {
        return state;
      }

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
          { allowCancel: true, blockedTo: blockedTo, blockedFrom: blockedFrom },
        ),
        (transfers) => {
          if (!transfers) {
            return;
          }

          for (const transfer of transfers) {
            const target = player.active;
            const source = StateUtils.getTarget(state, player, transfer.from);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
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
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, this.attacks[0]);
    }

    return state;
  }
}
