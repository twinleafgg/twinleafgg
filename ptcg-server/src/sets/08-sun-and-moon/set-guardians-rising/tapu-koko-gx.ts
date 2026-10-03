import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { Stage, CardType, SuperType, CardTag } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  GameMessage,
  PlayerType,
  SlotType,
  MoveEnergyPrompt,
  ConfirmPrompt,
  PokemonCardList,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { CardTarget } from '../../../game';
import {BLOCK_IF_GX_ATTACK_USED,
  IS_ABILITY_BLOCKED,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TapuKokoGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 170;
  public retreat = [C, C];

  public powers = [
    {
      name: 'Aero Trail',
      powerType: PowerType.ABILITY,
      text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may move any number of [L] Energy from your other Pokémon to this Pokémon. If you do, switch this Pokémon with your Active Pokémon.',
    },
  ];
  public attacks = [
    {
      name: 'Sky-High Claws',
      cost: [L, L, C],
      damage: 130,
      text: '',
    },

    {
      name: 'Tapu Thunder-GX',
      cost: [L, L, C],
      damage: 50,
      damageCalculation: 'x',
      gxAttack: true,
      text: "This attack does 50 damage times the amount of Energy attached to all of your opponent's Pokémon. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'GRI';
  public setNumber: string = '47';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Tapu Koko-GX';
  public fullName: string = 'Tapu Koko-GX GRI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Aero Trail
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            const blockedFrom: CardTarget[] = [];
            const blockedTo: CardTarget[] = [];

            let hasEnergyOnBench = false;
            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
              if (card === this) {
                blockedFrom.push(target);
                return;
              }
              blockedTo.push(target);
              if (
                cardList.cards.some(
                  (c) => c.superType === SuperType.ENERGY && c.name === 'Lightning Energy',
                )
              ) {
                hasEnergyOnBench = true;
              }
            });

            if (hasEnergyOnBench === false) {
              return state;
            }

            return store.prompt(
              state,
              new MoveEnergyPrompt(
                effect.player.id,
                GameMessage.MOVE_ENERGY_TO_ACTIVE,
                PlayerType.BOTTOM_PLAYER,
                [SlotType.ACTIVE, SlotType.BENCH],
                { superType: SuperType.ENERGY, name: 'Lightning Energy' },
                { min: 1, allowCancel: false, blockedFrom, blockedTo },
              ),
              (result) => {
                const transfers = result || [];
                transfers.forEach((transfer) => {
                  const source = StateUtils.getTarget(state, player, transfer.from);
                  const target = StateUtils.getTarget(state, player, transfer.to);
                  MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
                });

                let bench: PokemonCardList | undefined;
                player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
                  if (card === this && target.slot === SlotType.BENCH) {
                    bench = cardList;
                  }
                });
                if (bench) {
                  player.switchPokemon(bench);
                }
              },
            );
          }
        },
      );
    }

    // Tapu Thunder-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if player has used GX attack
      BLOCK_IF_GX_ATTACK_USED(player);
      // set GX attack as used for game
      player.usedGX = true;

      let energies = 0;

      opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        const opponentEnergy = new CheckProvidedEnergyEffect(opponent, cardList);
        state = store.reduceEffect(state, opponentEnergy);

        opponentEnergy.energyMap.forEach((em) => {
          energies++;
        });
      });

      effect.damage = 50 * energies;
    }
    return state;
  }
}
