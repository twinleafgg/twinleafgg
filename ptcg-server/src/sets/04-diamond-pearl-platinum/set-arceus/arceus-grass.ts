import { PlayerType, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ArceusGrass extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 90;
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C];
  protected _tags = [CardTag.ARCEUS];

  public attacks = [{
    name: 'Leaf Refresh',
    cost: [G, C],
    damage: 30,
    text: 'Remove 3 damage counters from each of your Benched Pokémon.',
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'AR2';
  public name: string = 'Arceus';
  public fullName: string = 'Arceus Grass AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Leaf Refresh
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList !== player.active && cardList.damage > 0) {
          store.reduceEffect(state, new HealEffect(player, cardList, 30));
        }
      });
    }

    return state;
  }
}
