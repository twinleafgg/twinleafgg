import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import {
  CardList,
  GameMessage,
  ShuffleDeckPrompt,
  ChooseCardsPrompt,
  ShowCardsPrompt,
  StateUtils,
  GameError,
} from '../../../game';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MasterBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'DX';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '88';
  public name: string = 'Master Ball';
  public fullName: string = 'Master Ball DX';

  public text: string =
    'Look at the top 7 cards from your deck. Choose a Basic Pokémon or Evolution card from those cards, show it to your opponent, and put it into your hand. Put the other 6 cards back on top of your deck. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const temp = new CardList();

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      MOVE_CARDS(store, state, player.deck, temp, { count: 7, sourceCard: this });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          temp,
          { superType: SuperType.POKEMON },
          { allowCancel: false, min: 0, max: 1 },
        ),
        (chosenCards) => {
          if (chosenCards.length <= 0) {
            // No Pokemon chosen, shuffle all back
            temp.cards.forEach((card) => {
              MOVE_CARDS(store, state, temp, player.deck, { sourceCard: this });
              MOVE_CARDS(store, state, player.supporter, player.discard, {
                cards: [this],
                sourceCard: this,
              });
            });
          }

          if (chosenCards.length > 0) {
            // Move chosen Pokemon to hand
            const pokemon = chosenCards[0];
            MOVE_CARDS(store, state, temp, player.hand, { cards: [pokemon], sourceCard: this });
            MOVE_CARDS(store, state, temp, player.deck, { sourceCard: this });
            MOVE_CARDS(store, state, player.supporter, player.discard, {
              cards: [this],
              sourceCard: this,
            });

            if (chosenCards.length > 0) {
              state = store.prompt(
                state,
                new ShowCardsPrompt(
                  opponent.id,
                  GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                  chosenCards,
                ),
                () => state,
              );
            }
          }

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }
    return state;
  }
}
