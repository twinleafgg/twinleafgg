import { ChooseCardsPrompt, GameError, GameMessage, State, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class ProfessorOaksVisit extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '90';
  public name: string = 'Professor Oak\'s Visit';
  public fullName: string = 'Professor Oak\'s Visit AR';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, discard this card. Draw 3 cards. Then, choose a card from your hand and put it on the bottom of your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      DRAW_CARDS(store, state, player, 3);

      if (player.hand.cards.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.hand,
        {},
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.hand, player.deck, { cards, sourceCard: this, toBottom: true });
        }
      });
    }

    return state;
  }
}
