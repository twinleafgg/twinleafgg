import { GameError } from '../../game/game-error';
import { GameMessage } from '../../game/game-message';
import { Effect } from '../../game/store/effects/effect';
import { PokemonCard, PokemonCardList, StateUtils } from '../../game';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Stage, TrainerType, SuperType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { ChooseCardsPrompt } from '../../game/store/prompts/choose-cards-prompt';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class ErikasPerfume extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'G1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '110';
  public name: string = "Erika's Perfume";
  public fullName: string = "Erika's Perfume G1";

  public text: string =
    "Look at your opponent's hand. If he or she has any Basic Pokémon cards there, you may put any number of them onto your opponent's Bench (as long as there's room).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const slots: PokemonCardList[] = opponent.bench.filter((b) => b.cards.length === 0);

      if (slots.length === 0) {
        // No open slots, throw error
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (opponent.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const max = Math.min(
        opponent.hand.cards.filter(
          (card) => card instanceof PokemonCard && card.stage === Stage.BASIC,
        ).length,
        slots.length,
      );

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          opponent.hand,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 0, max, allowCancel: true },
        ),
        (selected) => {
          const cards = selected || [];

          // Operation canceled by the user
          if (cards.length === 0) {
            return;
          }

          cards.forEach((card, index) => {
            MOVE_CARDS(store, state, opponent.hand, slots[index], {
              cards: [card],
              sourceCard: this,
            });
            slots[index].pokemonPlayedTurn = state.turn;
          });
        },
      );
    }

    return state;
  }
}
