import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { ChooseCardsPrompt, Card } from '../../../game';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TowerOfDarkness extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;

  public regulationMark = 'E';

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '137';

  public name: string = 'Tower of Darkness';

  public fullName: string = 'Tower of Darkness BST';

  public text: string =
    "Once during each playe's turn, that player may draw 2 cards. In order to use this effect, that player must discard a Single Strike card from their hand.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const hasEnergyInHand = player.hand.cards.some((c) => {
        return c instanceof Card && c.hasTag(CardTag.SINGLE_STRIKE);
      });
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked: number[] = [];
      player.hand.cards.forEach((c, index) => {
        if (c instanceof Card && c.hasTag(CardTag.SINGLE_STRIKE)) {
          blocked.push(index);
        }
      });

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { allowCancel: true, min: 1, max: 1, blocked: blocked },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 2, sourceCard: this });
        },
      );

      return state;
    }
    return state;
  }
}
