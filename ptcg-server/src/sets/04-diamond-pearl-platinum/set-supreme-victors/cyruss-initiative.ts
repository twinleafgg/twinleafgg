import { CardList, ChooseCardsPrompt, GameError, GameMessage, OrderCardsPrompt, State, StateUtils, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, MULTIPLE_COIN_FLIPS_PROMPT, SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class CyrussInitiative extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '137';
  public name: string = 'Cyrus\'s Initiative';
  public fullName: string = 'Cyrus\'s Initiative SV';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, discard this card. Flip 2 coins. If either of them is heads, look at your opponent\'s hand. For each heads, choose 1 card from your opponent\'s hand and put it on the bottom of your opponent\'s deck in any order.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        const heads = results.filter(r => r).length;
        if (heads === 0 || opponent.hand.cards.length === 0) {
          return;
        }

        SHOW_CARDS_TO_PLAYER(store, state, player, opponent.hand.cards);
        const count = Math.min(heads, opponent.hand.cards.length);
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          opponent.hand,
          {},
          { min: count, max: count, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length === 0) {
            return;
          }
          const ordered = new CardList();
          MOVE_CARDS(store, state, opponent.hand, ordered, { cards, sourceCard: this });
          if (ordered.cards.length === 1) {
            MOVE_CARDS(store, state, ordered, opponent.deck, { cards: [...ordered.cards], sourceCard: this, toBottom: true });
            return;
          }
          store.prompt(state, new OrderCardsPrompt(
            player.id,
            GameMessage.CHOOSE_CARDS_ORDER,
            ordered,
            { allowCancel: false }
          ), order => {
            if (order !== null) {
              ordered.applyOrder(order);
            }
            MOVE_CARDS(store, state, ordered, opponent.deck, { cards: [...ordered.cards], sourceCard: this, toBottom: true });
          });
        });
      });
    }

    return state;
  }
}
