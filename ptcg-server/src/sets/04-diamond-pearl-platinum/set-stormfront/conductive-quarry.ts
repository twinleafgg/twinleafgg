import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { SuperType } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { EnergyCard } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class ConductiveQuarry extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '82';
  public name: string = 'Conductive Quarry';
  public fullName: string = 'Conductive Quarry SF';
  public text: string = 'This card stays in play when you play it. Discard this card if another Stadium card comes into play. If another card with the same name is in play, you can\'t play this card. Once during each player\'s turn, the player may flip a coin. If heads, that player searches his or her discard pile for a Lightning or Metal Energy card, shows it to the opponent, and puts it into his or her hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, player.active, this)) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }
      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        const blocked: number[] = [];
        player.discard.cards.forEach((card, index) => {
          if (!(card instanceof EnergyCard) || (!card.provides.includes(L) && !card.provides.includes(M))) {
            blocked.push(index);
          }
        });
        if (blocked.length === player.discard.cards.length) {
          return;
        }
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          { superType: SuperType.ENERGY },
          { min: 0, max: 1, allowCancel: true, blocked }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
            MOVE_CARDS(store, state, player.discard, player.hand, { cards, sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}
