import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { GameError, GameMessage, Player, PokemonCard } from '../../../game';

export class CherishBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '191';
  public name: string = 'Cherish Ball';
  public fullName: string = 'Cherish Ball UNM';

  public text: string =
    'Search your deck for a Pokémon-GX, reveal it, and put it into your hand. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      // Can't play this card if no cards in deck
      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Can't search for non-Pokemon GX cards
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && !card.hasTag(CardTag.POKEMON_GX)) {
          blocked.push(index);
        }
      });

      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: true, blocked },
      );
    }

    return state;
  }
}
