import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, PlayerType, StateUtils, Player } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class Grisham extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'M-P';
  public setNumber: string = '99';
  public regulationMark: string = 'J';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Grisham';
  public fullName: string = 'Grisham M-P';

  public text: string = "Heal 50 damage from all Pokémon in play (both yours and your opponent's).";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const opponent = StateUtils.getOpponent(state, player);
    let hasDamaged = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      if (cardList.damage > 0) {
        hasDamaged = true;
      }
    });
    opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
      if (cardList.damage > 0) {
        hasDamaged = true;
      }
    });
    return hasDamaged;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-scarlet-and-violet/picnic-basket.ts (heal each Pokémon both players)
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList.damage > 0) {
          const healEffect = new HealEffect(player, cardList, 50);
          store.reduceEffect(state, healEffect);
        }
      });

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        if (cardList.damage > 0) {
          const healEffect = new HealEffect(player, cardList, 50);
          store.reduceEffect(state, healEffect);
        }
      });
    }

    return state;
  }
}
