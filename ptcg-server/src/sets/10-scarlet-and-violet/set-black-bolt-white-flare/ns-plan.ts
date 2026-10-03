import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { Effect } from '../../../game/store/effects/effect';
import {
  GameError,
  GameMessage,
  MoveEnergyPrompt,
  Player,
  StateUtils,
  PlayerType,
  SlotType,
} from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class NsPlan extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'I';
  public set: string = 'BLK';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = "N's Plan";
  public fullName: string = "N's Plot SV11B";
  public text: string = 'Move up to 2 Energy from your Benched Pokémon to your Active Pokémon.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    let hasEnergy = false;
    let pokemonCount = 0;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      pokemonCount += 1;
      const energyAttached = cardList.cards.some((c) => c.superType === SuperType.ENERGY);
      hasEnergy = hasEnergy || energyAttached;
    });
    if (!hasEnergy || pokemonCount <= 1) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      // Player has no Basic Energy in the discard pile
      let hasEnergy = false;
      let pokemonCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        pokemonCount += 1;
        const basicEnergyAttached = cardList.cards.some((c) => {
          return c.superType === SuperType.ENERGY;
        });
        hasEnergy = hasEnergy || basicEnergyAttached;
      });

      if (!hasEnergy || pokemonCount <= 1) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      // Prepare blockedMap for MoveEnergyPrompt
      const blockedMap: { source: any; blocked: number[] }[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (target.slot === SlotType.ACTIVE) {
          // Block all energy on Active (can't move from Active)
          blockedMap.push({
            source: target,
            blocked: Array.from({ length: cardList.cards.length }, (_, i) => i),
          });
        }
      });

      // Only allow moving to Active
      const blockedTargets: any[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (target.slot !== SlotType.ACTIVE) {
          blockedTargets.push(target);
        }
      });

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 1, max: 2, blockedMap, blockedTo: blockedTargets },
        ),
        (transfers) => {
          if (transfers && transfers.length > 0) {
            for (const transfer of transfers) {
              const source = StateUtils.getTarget(state, player, transfer.from);
              if (source) {
                const target = player.active;
                MOVE_CARDS(store, state, source, target, {
                  cards: [transfer.card],
                  sourceCard: this,
                });
              }
            }
          }
        },
      );
    }
    return state;
  }
}
