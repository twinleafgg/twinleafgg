import { PokemonCard,
  CardTag,
  Stage,
  CardType,
  PowerType,
  StoreLike,
  State,
  ConfirmPrompt,
  GameMessage,
  SuperType,
  PlayerType,
  AttachEnergyPrompt,
  SlotType,
  StateUtils,
  EnergyCard,
  CardTarget,
  EnergyType, pokemonHasCardType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EvolveEffect } from '../../../game/store/effects/game-effects';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { THIS_POKEMON_HAS_NO_WEAKNESS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Archaludonex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Duraludon';
  public cardType: CardType[] = [M];
  public hp: number = 300;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Assemble Alloy',
      powerType: PowerType.ABILITY,
      text: 'When you play this Pokémon from your hand to evolve 1 of your Pokemon during your turn, you may attach 2 Basic [M] Energy from your discard pile to your [M] Pokémon in any way you like.',
    },
  ];

  public attacks = [
    {
      name: 'Metal Defender',
      cost: [M, M, M],
      damage: 220,
      text: "During your opponent's next turn, this Pokemon has no Weakness.",
    },
  ];

  public regulationMark = 'H';
  public set: string = 'SSP';
  public setNumber: string = '130';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Archaludon ex';
  public fullName: string = 'Archaludon ex SSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EvolveEffect && effect.pokemonCard === this) {
      const player = effect.player;

      const hasMetalEnergyInDiscard = player.discard.cards.some((c) => {
        return c instanceof EnergyCard && c.name === 'Metal Energy';
      });
      if (!hasMetalEnergyInDiscard) {
        return state;
      }

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (!pokemonHasCardType(card, M)) {
          blocked2.push(target);
        }
      });

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      return store.prompt(
        state,
        new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            state = store.prompt(
              state,
              new AttachEnergyPrompt(
                player.id,
                GameMessage.ATTACH_ENERGY_TO_ACTIVE,
                player.discard,
                PlayerType.BOTTOM_PLAYER,
                [SlotType.ACTIVE, SlotType.BENCH],
                { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Metal Energy' },
                { allowCancel: false, min: 0, max: 2, blockedTo: blocked2 },
              ),
              (transfers) => {
                transfers = transfers || [];

                if (transfers.length === 0) {
                  return state;
                }

                for (const transfer of transfers) {
                  const target = StateUtils.getTarget(state, player, transfer.to);
                  MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
                }
              },
            );
          }
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      return THIS_POKEMON_HAS_NO_WEAKNESS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}
