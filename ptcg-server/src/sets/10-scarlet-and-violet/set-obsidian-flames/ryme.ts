import {
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  Player,
  PlayerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { Stage, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { SupporterEffect, TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Ryme extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'OBF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '194';

  public regulationMark = 'G';

  public name: string = 'Ryme';

  public fullName: string = 'Ryme OBF';

  public text: string =
    "Draw 3 cards. Switch out your opponent's Active Pokémon to the Bench. (Your opponent chooses the new Active Pokémon.)";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
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

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      // Draw 3 cards
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });

      // Get opponent
      const opponent = StateUtils.getOpponent(state, player);

      if (!opponent.bench.some((c) => c.cards.length > 0)) {
        return state;
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          opponent.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false },
        ),
        (results) => {
          const cardList = results && results[0];
          if (!cardList) {
            return state;
          }

          if (cardList.isStage(Stage.BASIC)) {
            try {
              const supporterEffect = new SupporterEffect(player, effect.trainerCard);
              store.reduceEffect(state, supporterEffect);
            } catch {
              return state;
            }
          }

          if (results.length > 0) {
            opponent.active.clearEffects();
            opponent.switchPokemon(results[0]);
          }

          return state;
        },
      );
    }
    return state;
  }
}
