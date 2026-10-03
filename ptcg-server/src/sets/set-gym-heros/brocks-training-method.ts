import { TrainerCard } from '../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { PokemonCard } from '../../game';

export class BrocksTrainingMethod extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'G1';
  public setNumber: string = '106';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Brock's Training Method";
  public fullName: string = "Brock's Training Method G1";

  public text: string =
    'Search your deck for a Basic Pokémon or Evolution card with Brock in its name. Show that card to your opponent, then put it into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const blocked: number[] = [];
      effect.player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.hasTag(CardTag.BROCKS)) {
          return;
        } else {
          blocked.push(index);
        }
      });

      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
        store,
        state,
        effect.player,
        {},
        { min: 0, max: 1, blocked },
      );
    }

    return state;
  }
}
