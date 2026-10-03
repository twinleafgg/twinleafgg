import { PokemonCard, CardTag, Stage, CardType, PowerType, StoreLike, State, SuperType, EnergyType, GameError, GameMessage, AttachEnergyPrompt, PlayerType, SlotType, BoardEffect, StateUtils } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { EndTurnEffect } from "../../../game/store/effects/game-phase-effects";
import {WAS_POWER_USED, WAS_ATTACK_USED, THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class Blazikenex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Combusken';
  public cardType: CardType[] = [R];
  public hp: number = 320;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Seething Spirit',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, you may attach a Basic Energy card from your discard pile to 1 of your Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Burning Assault',
      cost: [R, C],
      damage: 200,
      text: "During your next turn, this Pokemon can't attack.",
    },
  ];

  public regulationMark = 'H';
  public set: string = 'JTG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '24';
  public name: string = 'Blaziken ex';
  public fullName: string = 'Blaziken ex JTG';

  public readonly OVERFLOWING_SPIRIT_MARKER = 'OVERFLOWING_SPIRIT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.OVERFLOWING_SPIRIT_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC;
      });

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.OVERFLOWING_SPIRIT_MARKER, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_ACTIVE,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 1, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          player.marker.addMarker(this.OVERFLOWING_SPIRIT_MARKER, this);

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });

          if (transfers.length === 0) {
            return;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
          return state;
        },
      );
    }

    // Burning Assault
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    return state;
  }
}
