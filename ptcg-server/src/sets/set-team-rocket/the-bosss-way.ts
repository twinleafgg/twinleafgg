import { PokemonCard } from '../../game';
import { CardTag, Stage, TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND } from '../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class TheBosssWay extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'TR';
  public setNumber = '73';
  public name: string = "The Boss's Way";
  public fullName: string = "The Boss's Way TR";
  public cardImage: string = 'assets/cardback.png';

  public text: string =
    'Search your deck for an Evolution card with Dark in its name. Show it to your opponent and put it into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      effect.preventDefault = true;

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        // eslint-disable-next-line no-empty
        if (
          card instanceof PokemonCard &&
          card.evolvesFrom !== '' &&
          card.stage !== Stage.LV_X &&
          card.hasTag(CardTag.DARK)
        ) {
          // Valid card
        } else {
          blocked.push(index);
        }
      });

      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
        store,
        state,
        player,
        {},
        { blocked, min: 0, max: 1 },
      );
    }

    return state;
  }
}
