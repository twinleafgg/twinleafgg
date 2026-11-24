import { Player } from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { CardTag, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import {
  MULTIPLE_COIN_FLIPS_PROMPT,
  SEARCH_DECK_FOR_CARDS_TO_HAND,
} from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class TimerBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'SUM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '134';
  public name: string = 'Timer Ball';
  public fullName: string = 'Timer Ball SUM';

  public text: string =
    'Flip 2 coins. For each heads, search your deck for an Evolution Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.';

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

      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, (results) => {
        const heads = results.filter((r) => r).length;

        if (heads === 0) {
          return;
        }

        const blocked: number[] = [];
        player.deck.cards.forEach((card, index) => {
          if (
            !(card instanceof PokemonCard && card.evolvesFrom !== '' && card.stage !== Stage.LV_X)
          ) {
            blocked.push(index);
          }
        });

        SEARCH_DECK_FOR_CARDS_TO_HAND(
          store,
          state,
          player,
          this,
          { superType: SuperType.POKEMON },
          { min: 0, max: heads, allowCancel: false, blocked },
        );
      });
    }

    return state;
  }
}
