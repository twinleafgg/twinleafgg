import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class BucksTraining extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '130';
  public name: string = 'Buck\'s Training';
  public fullName: string = 'Buck\'s Training LA';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, discard this card. Draw 2 cards. As long as Buck\'s Training is next to your Active Pokémon, each of your Active Pokémon\'s attacks does 10 more damage to the Active Pokémon (before applying Weakness and Resistance).';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;
      DRAW_CARDS(store, state, player, 2);
    }

    if (effect instanceof DealDamageEffect) {
      const player = effect.player;
      if (player.supporter.cards.includes(this) && effect.target === StateUtils.getOpponent(state, player).active) {
        effect.damage += 10;
      }
    }

    return state;
  }
}
