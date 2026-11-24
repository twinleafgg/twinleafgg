import {
  GameError,
  GameMessage,
  Player,
  State,
  StoreLike,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { CardTag, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class HeavyBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'NXD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '88';
  public name: string = 'Heavy Ball';
  public fullName: string = 'Heavy Ball NXD';

  public text: string =
    'Search your deck for a Pokemon with a Retreat Cost of 3 or more, ' +
    'reveal it, and put it into your hand. Shuffle your deck afterward.';

  public canPlay(_store: StoreLike, _state: State, player: Player): boolean {
    return player.deck.cards.length > 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.retreat.length < 3) {
          blocked.push(index);
        }
      });

      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.POKEMON },
        { min: 0, max: 1, allowCancel: false, blocked },
      );
    }
    return state;
  }
}
