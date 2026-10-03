import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RapidStrikeStyleMustard extends TrainerCard {
  public regulationMark = 'E';

  protected _tags = [CardTag.RAPID_STRIKE];

  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '132';

  public name: string = 'Rapid Strike Style Mustard';

  public fullName: string = 'Rapid Strike Style Mustard BST';

  public text: string = `You can play this card only when it is the last card in your hand.

Put a Rapid Strike Pokémon from your discard pile onto your Bench. If you do, draw 5 cards.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const cards = player.hand.cards.filter((c) => c !== this);

      const hasPokemon = player.discard.cards.some((c) => {
        return c instanceof PokemonCard && c.hasTag(CardTag.RAPID_STRIKE);
      });

      const blocked: number[] = [];
      player.discard.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && !card.hasTag(CardTag.RAPID_STRIKE)) {
          blocked.push(index);
        }
      });

      const slot = player.bench.find((b) => b.cards.length === 0);
      const hasEffect = (hasPokemon && slot) || player.deck.cards.length > 0;

      if (cards.length !== 0 || !hasEffect) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.discard,
          { superType: SuperType.POKEMON },
          { min: 1, max: 1, allowCancel: false, blocked: blocked },
        ),
        (selected) => {
          const cards = selected || [];
          MOVE_CARDS(store, state, player.discard, slot!, { cards: cards, sourceCard: this });
          slot!.pokemonPlayedTurn = state.turn;
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 5, sourceCard: this });
        },
      );
    }

    return state;
  }
}
