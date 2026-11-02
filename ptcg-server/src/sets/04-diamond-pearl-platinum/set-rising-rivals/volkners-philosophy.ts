import { Card, ChooseCardsPrompt, GameError, GameMessage, State, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT, DRAW_CARDS_UNTIL_CARDS_IN_HAND, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class VolknersPhilosophy extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '98';
  public name: string = 'Volkner\'s Philosophy';
  public fullName: string = 'Volkner\'s Philosophy RR';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, discard this card. You may discard a card from your hand. Then, draw cards until you have 6 cards in your hand. (If you can\'t draw any cards, you can\'t play this card.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const drawUntilSix = () => {
        DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 6);
      };

      if (player.hand.cards.length === 0) {
        drawUntilSix();
        return state;
      }

      return CONFIRMATION_PROMPT(store, state, player, result => {
        if (!result) {
          drawUntilSix();
          return;
        }

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const cards: Card[] = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
          }
          drawUntilSix();
        });
      }, GameMessage.WANT_TO_DISCARD_CARDS);
    }

    return state;
  }
}
