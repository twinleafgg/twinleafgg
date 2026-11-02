import { PlayerType, PokemonCard, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Gabite extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Gible';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Healing Scale',
    cost: [],
    damage: 0,
    text: 'Remove 1 damage counter from each of your Pokémon.'
  }, {
    name: 'Sand Tomb',
    cost: [C, C],
    damage: 30,
    text: 'The Defending Pokémon can\'t retreat during your opponent\'s next turn.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '59';
  public name: string = 'Gabite';
  public fullName: string = 'Gabite SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Healing Scale
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        store.reduceEffect(state, new HealEffect(player, cardList, 10));
      });
    }

    // Sand Tomb
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }

    return state;
  }
}
