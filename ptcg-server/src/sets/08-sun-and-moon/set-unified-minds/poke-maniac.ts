import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ChooseCardsPrompt } from '../../../game';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class PokeManiac extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'UNM';
  public setNumber: string = '204';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Pok\u00e9 Maniac';
  public fullName: string = 'Pok\u00e9 Maniac UNM';
  public text: string =
    'Search your deck for up to 3 Pok\u00e9mon that have a Retreat Cost of exactly 4, reveal them, and put them into your hand. Then, shuffle your deck. You may play only 1 Supporter card during your turn (before your attack).';

  // Ref: set-cosmic-eclipse/steelix.ts (Thumping Fall - retreat cost 4 filter)
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.retreat.length === 4) {
          return;
        }
        blocked.push(index);
      });

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 0, max: 3, allowCancel: true, blocked },
        ),
        (cards) => {
          cards = cards || [];
          cards.forEach((card) => {
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: [card], sourceCard: this });
          });

          return SHUFFLE_DECK(store, state, player);
        },
      );
    }

    return state;
  }
}
