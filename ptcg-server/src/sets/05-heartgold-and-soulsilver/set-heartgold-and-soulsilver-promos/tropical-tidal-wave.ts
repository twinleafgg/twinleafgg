import { Player } from '../../../game';
import { PlayerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class TropicalTidalWave extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Tropical Tidal Wave';
  public fullName: string = 'Tropical Tidal Wave HSP';
  public text: string = 'Flip a coin. If heads, discard all Trainer and Stadium cards your opponent has in play. If tails, discard all Trainer and Stadium cards you have in play.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      COIN_FLIP_PROMPT(store, state, player, result => {
        this.discardTrainersInPlay(store, state, result ? opponent : player);
        MOVE_CARDS(store, state, player.supporter, player.discard, {
          cards: [effect.trainerCard],
          sourceCard: this,
        });
      });
    }

    return state;
  }

  private discardTrainersInPlay(store: StoreLike, state: State, owner: Player): void {
    owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      const tools = [...cardList.tools];
      if (tools.length > 0) {
        MOVE_CARDS(store, state, cardList, owner.discard, { cards: tools, sourceCard: this });
      }
    });

    const stadium = StateUtils.getStadiumCard(state);
    if (stadium) {
      const stadiumList = StateUtils.findCardList(state, stadium);
      if (StateUtils.findOwner(state, stadiumList) === owner) {
        MOVE_CARDS(store, state, stadiumList, owner.discard, { sourceCard: this });
      }
    }
  }
}
