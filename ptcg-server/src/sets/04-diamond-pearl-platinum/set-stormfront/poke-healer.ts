import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { ConfirmPrompt } from '../../../game';
import { GameMessage } from '../../../game';
import { SelectPrompt } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class PokeHealer extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '90';
  public name: string = 'Poké Healer +';
  public fullName: string = 'Poké Healer + SF';
  public text: string = 'You may play 2 Poké Healer + at the same time. If you play 1 Poké Healer +, remove 1 damage counter and a Special Condition from 1 of your Active Pokémon. If you play 2 Poké Healer +, remove 8 damage counters and all Special Conditions from 1 of your Active Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const name = effect.trainerCard.name;
      const count = player.hand.cards.reduce((sum, c) => sum + (c.name === name ? 1 : 0), 0);

      const playOne = () => {
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: [effect.trainerCard], sourceCard: this });
        effect.preventDefault = true;
        store.reduceEffect(state, new HealEffect(player, player.active, 10));
        const conditions = player.active.specialConditions.slice();
        if (conditions.length === 0) {
          return;
        }
        if (conditions.length === 1) {
          player.active.removeSpecialCondition(conditions[0]);
          return;
        }
        store.prompt(state, new SelectPrompt(
          player.id,
          GameMessage.CHOOSE_SPECIAL_CONDITION,
          conditions.map(c => c.toString()),
          { allowCancel: false }
        ), choice => {
          player.active.removeSpecialCondition(conditions[choice]);
        });
      };

      if (count < 2) {
        playOne();
        return state;
      }

      return store.prompt(state, new ConfirmPrompt(player.id, GameMessage.WANT_TO_PLAY_BOTH_CARDS_AT_ONCE), playTwo => {
        if (!playTwo) {
          playOne();
          return;
        }
        const second = player.hand.cards.find(c => c.name === name && c !== effect.trainerCard);
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: [effect.trainerCard], sourceCard: this });
        if (second) {
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: [second], sourceCard: this });
        }
        effect.preventDefault = true;
        store.reduceEffect(state, new HealEffect(player, player.active, 80));
        const conditions = player.active.specialConditions.slice();
        conditions.forEach(condition => player.active.removeSpecialCondition(condition));
      });
    }

    return state;
  }
}
