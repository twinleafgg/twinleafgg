import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  ConfirmPrompt,
  MoveEnergyPrompt,
  PlayerType,
  SlotType,
  StateUtils,
  PowerType,
  PokemonCardList,
  CardTarget,
} from '../../../game';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class IronLeavesex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex, CardTag.FUTURE];
  public cardType: CardType[] = [G];
  public hp: number = 220;
  public weakness = [{ type: R }];
  public retreat = [C];

  public powers = [
    {
      name: 'Rapid Vernier',
      powerType: PowerType.ABILITY,
      exemptFromInitialize: true,
      text: 'Once during your turn, when you play this Pokémon from your hand onto your Bench, you may switch this Pokémon with your Active Pokémon. If you do, you may move any number of Energy from your Benched Pokémon to this Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Prism Edge',
      cost: [G, G, C],
      damage: 180,
      text: "During your next turn, this Pokémon can't attack.",
    },
  ];

  public regulationMark = 'H';
  public set: string = 'TEF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Iron Leaves ex';
  public fullName: string = 'Iron Leaves ex TEF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard == this) {
      const player = effect.player;

      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
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

            const cardList = StateUtils.findCardList(state, this);
            const benchIndex = player.bench.indexOf(cardList as PokemonCardList);

            player.switchPokemon(player.bench[benchIndex], store, state);

            const blockedFrom: CardTarget[] = [];
            const blockedTo: CardTarget[] = [];

            let hasEnergyOnBench = false;
            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
              if (cardList === player.active) {
                blockedFrom.push(target);
                return;
              }
              blockedTo.push(target);
              if (cardList.cards.some((c) => c.superType === SuperType.ENERGY)) {
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
                [SlotType.BENCH, SlotType.ACTIVE], // Only allow moving to active
                { superType: SuperType.ENERGY },
                { allowCancel: false, blockedFrom, blockedTo },
              ),
              (transfers) => {
                if (!transfers) {
                  return;
                }

                for (const transfer of transfers) {
                  // Can only move energy to the active Pokemon
                  const target = player.active;
                  const source = StateUtils.getTarget(state, player, transfer.from);
                  transfers.forEach((transfer) => {
                    MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
                    return state;
                  });
                }
              },
            );
          }
        },
      );
    }

    // Prism Edge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      player.active.cannotAttackNextTurnPending = true;
    }

    return state;
  }
}
