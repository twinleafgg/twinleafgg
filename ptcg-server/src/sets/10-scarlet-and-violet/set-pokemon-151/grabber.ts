import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { CardList, ChooseCardsPrompt, GameMessage, Player, StateUtils } from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Grabber extends TrainerCard {
  public regulationMark = 'G';

  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'MEW';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '162';

  public name: string = 'Grabber';

  public fullName: string = 'Grabber MEW';

  public text: string =
    'Your opponent reveals their hand, and you put a Pokémon you find there on the bottom of their deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const deckBottom = new CardList();

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          opponent.hand,
          { superType: SuperType.POKEMON },
          { allowCancel: false, min: 0, max: 1 },
        ),
        (selectedCard) => {
          const selected = selectedCard || [];
          if (selectedCard === null || selected.length === 0) {
            MOVE_CARDS(store, state, player.supporter, player.discard, {
              cards: [this],
              sourceCard: this,
            });
            return;
          }

          MOVE_CARDS(store, state, opponent.hand, deckBottom, {
            cards: [selected[0]],
            sourceCard: this,
          });
          MOVE_CARDS(store, state, deckBottom, opponent.deck, { sourceCard: this });

          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [this],
            sourceCard: this,
          });
        },
      );
    }
    return state;
  }
}
