import { GameError, GameMessage, Player, State, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class DeliciousRiceBalls extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '101';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Tasty Rice Ball';
  public fullName: string = 'Delicious Rice Balls M6';
  public text: string =
    'Heal 30 damage from your Active Pokémon. For each Tasty Rice Ball card (not including this card) in your discard pile, heal 30 more damage.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return player.active.damage > 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.active.damage === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const copiesInDiscard = player.discard.cards.filter((c) => c.name === this.name).length;
      const healAmount = 30 + copiesInDiscard * 30;
      const healEffect = new HealEffect(player, player.active, healAmount);
      store.reduceEffect(state, healEffect);
    }

    return state;
  }
}
