import { ChooseCardsPrompt, EnergyCard, EnergyType, GameMessage, State, StoreLike, SuperType } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, MULTIPLE_COIN_FLIPS_PROMPT } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class EnergyRestore extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '86';
  public name: string = 'Energy Restore';
  public fullName: string = 'Energy Restore AR';
  public text: string = 'Flip 3 coins. For each heads, put a basic Energy card from your discard pile into your hand. If you don\'t have that many basic Energy cards in your discard pile, put all of them into your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      MOVE_CARDS(store, state, player.hand, player.discard, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, results => {
        const heads = results.filter(r => r).length;
        const available = player.discard.cards.filter(c =>
          c instanceof EnergyCard && c.energyType === EnergyType.BASIC
        ).length;
        const max = Math.min(heads, available);
        if (max === 0) {
          return;
        }
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: max, max, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.discard, player.hand, { cards, sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}
