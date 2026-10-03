import { CardTarget, PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { AttachEnergyPrompt, ChoosePokemonPrompt, GameError, StateUtils } from '../../../game';
import {SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ElesasSparkle extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public regulationMark = 'E';

  protected _tags = [CardTag.FUSION_STRIKE];

  public set: string = 'FST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '233';

  public name: string = "Elesa's Sparkle";

  public fullName: string = "Elesa's Sparkle FST";

  public text: string =
    'Choose up to 2 of your Fusion Strike Pokémon. For each of those Pokémon, search your deck for a Fusion Strike Energy card and attach it to that Pokémon. Then, shuffle your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      // Check if player has any Fusion Strike Pokemon in play
      let hasFusionStrike = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (card.hasTag(CardTag.FUSION_STRIKE)) {
          hasFusionStrike = true;
        }
      });

      if (!hasFusionStrike) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (!card.hasTag(CardTag.FUSION_STRIKE)) {
          blocked2.push(target);
        }
      });

      state = store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { min: 1, max: 2, blocked: blocked2 },
        ),
        (chosen) => {
          if (!chosen) {
            return;
          }

          const allowedTargets = chosen;

          const notAllowedTargets: CardTarget[] = [];
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
            if (
              !allowedTargets.some(
                (pokemon) =>
                  pokemon ===
                  (target.slot === SlotType.ACTIVE ? player.active : player.bench[target.index]),
              )
            ) {
              notAllowedTargets.push(target);
            }
          });

          state = store.prompt(
            state,
            new AttachEnergyPrompt(
              player.id,
              GameMessage.ATTACH_ENERGY_TO_ACTIVE,
              player.deck,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.BENCH, SlotType.ACTIVE],
              { superType: SuperType.ENERGY, name: 'Fusion Strike Energy' },
              {
                allowCancel: false,
                min: 0,
                max: 2,
                blockedTo: notAllowedTargets,
                differentTargets: true,
              },
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
              }
              SHUFFLE_DECK(store, state, player);
            },
          );
        },
      );
    }
    return state;
  }
}
