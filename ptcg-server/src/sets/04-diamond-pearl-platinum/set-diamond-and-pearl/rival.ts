import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { CardList } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { WITH_PROMPT_CONTROLLER } from '../../../game/store/prefabs/trainer-prefabs';

export class Rival extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'DP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '113';
  public name: string = 'Rival';
  public fullName: string = 'Rival DP';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, discard this card. Reveal the top 5 cards of your deck. Your opponent chooses 3 of those cards. Put those cards into your hand and put other 2 cards on top of your deck. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }
      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const deckTop = new CardList();
      const count = Math.min(5, player.deck.cards.length);
      MOVE_CARDS(store, state, player.deck, deckTop, { count, sourceCard: this });
      SHOW_CARDS_TO_PLAYER(store, state, player, deckTop.cards);
      SHOW_CARDS_TO_PLAYER(store, state, opponent, deckTop.cards);

      const takeCount = Math.min(3, deckTop.cards.length);
      if (takeCount === 0) {
        return state;
      }

      return WITH_PROMPT_CONTROLLER(store, state, opponent.id, s => {
        return store.prompt(s, new ChooseCardsPrompt(
          opponent,
          GameMessage.CHOOSE_CARD_TO_HAND,
          deckTop,
          {},
          { min: takeCount, max: takeCount, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          MOVE_CARDS(store, state, deckTop, player.hand, { cards, sourceCard: this });
          MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: this });
          SHUFFLE_DECK(store, state, player);
        });
      });
    }

    return state;
  }
}
