import { TrainerCard, TrainerType, StoreLike, State, PokemonCard } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { MOVE_CARDS, SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND } from "../../../game/store/prefabs/prefabs";
import { WAS_TRAINER_USED } from "../../../game/store/prefabs/trainer-prefabs";

export class BeginningDoor extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'AR';
  public setNumber: string = '82';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Beginning Door';
  public fullName: string = 'Beginning Door AR';
  public text: string = 'Search your deck for Arceus, show it to your opponent, and put it into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      const blocked: number[] = [];
      effect.player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name === 'Arceus') {
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
