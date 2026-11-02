import { TrainerCard, TrainerType, State, StateUtils, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { HealEffect } from '../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../game/store/effects/play-card-effects';

export class PokemonPark extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Pokémon Park';
  public fullName: string = 'Pokémon Park P2';
  public text: string = 'Once during each player\'s turn, when that player attaches an Energy card from his or her hand to 1 of his or her Benched Pokémon, he or she removes 1 damage counter from that Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttachEnergyEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      if (effect.target === player.active) {
        return state;
      }
      const healEffect = new HealEffect(player, effect.target, 10);
      store.reduceEffect(state, healEffect);
    }
    return state;
  }
}
