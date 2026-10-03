import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameLog,
  GameMessage,
  PlayerType,
  StateUtils,
} from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LysandrePrismStar extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.PRISM_STAR];
  public set: string = 'FLI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '110';
  public name: string = 'Lysandre Prism Star';
  public fullName: string = 'Lysandre Prism Star FLI';

  public text: string =
    "For each of your [R] Pokémon in play, put a card from your opponent's discard pile in the Lost Zone.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.discard.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      let firesInPlay = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        const pokemonType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, pokemonType);
        if (pokemonType.cardTypes.includes(R)) {
          firesInPlay++;
        }
      });

      if (!firesInPlay) {
        MOVE_CARDS(store, state, player.supporter, player.lostzone, { cards: [this], sourceCard: this });
        return state;
      }

      let cards: Card[] = [];
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.discard,
          {},
          {
            min: Math.min(opponent.discard.cards.length, firesInPlay),
            max: Math.min(opponent.discard.cards.length, firesInPlay),
            allowCancel: false,
          },
        ),
        (selected) => {
          cards = selected || [];

          // Operation canceled by the user
          if (cards.length === 0) {
            return state;
          }

          MOVE_CARDS(store, state, opponent.discard, opponent.lostzone, { cards: cards, sourceCard: this });
          MOVE_CARDS(store, state, player.supporter, player.lostzone, { cards: [this], sourceCard: this });

          store.log(state, GameLog.LOG_PLAYER_DRAWS_CARD, { name: player.name });
        },
      );
    }
    return state;
  }
}
