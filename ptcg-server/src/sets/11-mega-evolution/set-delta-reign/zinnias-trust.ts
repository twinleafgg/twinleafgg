import { TrainerCard, TrainerType, StoreLike, State, Player, GameError, GameMessage, ChoosePokemonPrompt, PlayerType, SlotType, SuperType, ChooseCardsPrompt } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { TrainerEffect } from "../../../game/store/effects/play-card-effects";
import { MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class ZinniasTrust extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '103';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Zinnia's Trust";
  public fullName: string = "Zinnia's Trust M6";
  public text: string = 'Switch your Active Pokémon with 1 of your Benched Pokémon. If you do, move an Energy from the Pokémon you moved to your Bench to the new Active Pokémon.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (!player.bench.some((b) => b.cards.length > 0)) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const hasBench = player.bench.some((b) => b.cards.length > 0);
      if (!hasBench) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_NEW_ACTIVE_POKEMON,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false, min: 1, max: 1 },
        ),
        (selected) => {
          if (!selected || selected.length === 0) {
            return state;
          }

          const previousActive = player.active;
          player.switchPokemon(selected[0], store, state);

          const hasEnergy = previousActive.cards.some((c) => c.superType === SuperType.ENERGY);
          if (!hasEnergy) {
            MOVE_CARDS(store, state, player.supporter, player.discard, {
              cards: [effect.trainerCard],
              sourceCard: this,
            });
            return state;
          }

          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.ATTACH_ENERGY_TO_BENCH,
              previousActive,
              { superType: SuperType.ENERGY },
              { allowCancel: false, min: 1, max: 1 },
            ),
            (cards) => {
              cards = cards || [];
              if (cards.length > 0) {
                MOVE_CARDS(store, state, previousActive, player.active, {
                  cards: cards,
                  sourceCard: this,
                });
              }
              MOVE_CARDS(store, state, player.supporter, player.discard, {
                cards: [effect.trainerCard],
                sourceCard: this,
              });
              return state;
            },
          );
        },
      );
    }

    return state;
  }
}
