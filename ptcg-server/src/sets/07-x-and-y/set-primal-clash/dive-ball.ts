import { CardTag, CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import {
  State,
  StoreLike,
  TrainerCard,
  GameError,
  GameMessage,
  Player,
  PokemonCard,
} from '../../../game';
import { MOVE_CARDS, SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class DiveBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'PRC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '125';
  public name: string = 'Dive Ball';
  public fullName: string = 'Dive Ball PRC';

  public text: string =
    'Search your deck for a [W] Pokémon, reveal it, and put it into your hand. Shuffle your deck afterward.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return player.deck.cards.length > 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.POKEMON, cardType: [CardType.WATER] } as Partial<PokemonCard>,
        { min: 0, max: 1, allowCancel: true },
      );
    }

    return state;
  }
}
