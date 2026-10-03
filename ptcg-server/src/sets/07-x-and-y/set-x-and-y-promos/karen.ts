import { PokemonCard, StateUtils, StoreLike, State } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class Karen extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'XYP';
  public name: string = 'Karen';
  public fullName: string = 'Karen XYP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '177';

  public text: string =
    'Each player shuffles all Pokémon in his or her discard pile into his or her deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-chilling-reign/spiritomb.ts (Ghostly Cries — move Pokemon from discard to deck, then shuffle)
    if (WAS_TRAINER_USED(effect, this)) {
      for (const player of [effect.player, StateUtils.getOpponent(state, effect.player)]) {
        const pokemonCards = player.discard.cards.filter((c) => c instanceof PokemonCard).slice();
        pokemonCards.forEach((card) => {
          MOVE_CARDS(store, state, player.discard, player.deck, {
            cards: [card],
            sourceCard: this,
          });
        });
        if (pokemonCards.length > 0) {
          state = SHUFFLE_DECK(store, state, player);
        }
      }
    }

    return state;
  }
}
