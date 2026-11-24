import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { Player } from '../../../game';

export class LevelBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public regulationMark = 'E';
  public set: string = 'BST';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '129';
  public name: string = 'Level Ball';
  public fullName: string = 'Level Ball BST';

  public text: string =
    'Search your deck for a Pokemon with 90 HP or less, reveal it, ' +
    'and put it into your hand. Shuffle your deck afterward.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.hp > 90) {
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
