import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  PokemonCard,
  StateUtils,
} from '../../../game';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {MOVE_CARDS_TO_HAND,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DISCARD_X_CARDS_FROM_YOUR_HAND } from '../../../game/store/prefabs/trainer-prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class HolonResearcher extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.DELTA_SPECIES];
  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Holon Researcher';
  public fullName: string = 'Holon Researcher DS';

  public text: string = `Discard a card from your hand. If you can't discard a card from your hand, you can't play this card.
    
Search your deck for a [M] Energy card or a Basic Pokémon (or Evolution card) that has delta on its card, show it to your opponent, and put it into your hand. Shuffle your deck afterward.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      DISCARD_X_CARDS_FROM_YOUR_HAND(effect, store, state, 1, 1);

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const blocked: number[] = [];
      player.deck.cards.forEach((c, index) => {
        if (c instanceof PokemonCard && c.hasTag(CardTag.DELTA_SPECIES)) {
          return;
        } else if (c.superType === SuperType.ENERGY && c.name === 'Metal Energy') {
          return;
        } else {
          blocked.push(index);
        }
      });

      let cards: Card[] = [];
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 0, max: 1, allowCancel: false, blocked },
        ),
        (selected) => {
          cards = selected || [];

          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          MOVE_CARDS_TO_HAND(store, state, player, cards);
          SHUFFLE_DECK(store, state, player);
        },
      );
      return state;
    }

    return state;
  }
}
