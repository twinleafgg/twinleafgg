import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, GameError, GameMessage, Player, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class EngineersAdjustments extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'UL';
  public name: string = 'Engineer\'s Adjustments';
  public fullName: string = 'Engineer\'s Adjustments UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '75';
  public text: string = 'Discard an Energy card from your hand. Then, draw 4 cards.';

  public canPlay(_store: StoreLike, _state: State, player: Player): boolean {
    return player.supporterTurn === 0
      && player.hand.cards.some(c => c !== this && c.superType === SuperType.ENERGY);
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const hasEnergy = player.hand.cards.some(c => c.superType === SuperType.ENERGY);
      if (!hasEnergy) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards: Card[] = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
        }
        DRAW_CARDS(store, state, player, 4);
      });
    }

    return state;
  }
}
