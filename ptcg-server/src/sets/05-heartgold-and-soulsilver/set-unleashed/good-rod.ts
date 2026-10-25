import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { Card, CardList, ChooseCardsPrompt, GameMessage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, MOVE_CARDS, SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class GoodRod extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'UL';
  public name: string = 'Good Rod';
  public fullName: string = 'Good Rod UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';
  public text: string = 'Flip a coin. If heads, search your discard pile for a Pokémon, show it to your opponent, and put it on top of your deck. If tails, search your discard pile for a Trainer card, show it to your opponent, and put it on top of your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      COIN_FLIP_PROMPT(store, state, player, result => {
        const filter = result
          ? { superType: SuperType.POKEMON }
          : { superType: SuperType.TRAINER };
        const hasCard = player.discard.cards.some(c =>
          result ? c.superType === SuperType.POKEMON : c.superType === SuperType.TRAINER
        );
        if (!hasCard) {
          return;
        }

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          player.discard,
          filter,
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const cards: Card[] = selected || [];
          if (cards.length === 0) {
            return;
          }
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          const deckTop = new CardList();
          MOVE_CARDS(store, state, player.discard, deckTop, { cards, sourceCard: this });
          deckTop.moveToTopOfDestination(player.deck);
        });
      });
    }

    return state;
  }
}
