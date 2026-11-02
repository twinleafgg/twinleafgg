import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Minun extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Call for Family',
    cost: [C],
    damage: 0,
    text: 'Search your deck for up to 2 Basic Pokémon and put them onto your Bench. Shuffle your deck afterward.'
  },
  {
    name: 'Tag Team Boost',
    cost: [L],
    damage: 10,
    damageCalculation: '+',
    text: 'If Plusle is on your Bench, this attack does 10 damage plus 20 more damage.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '34';
  public name: string = 'Minun';
  public fullName: string = 'Minun UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Call for Family
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(
        store,
        state,
        effect.player,
        { stage: Stage.BASIC },
        { min: 0, max: 2, allowCancel: true }
      );
    }

    // Tag Team Boost
    if (WAS_ATTACK_USED(effect, 1, this)) {
      let hasPlusle = false;
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (list !== effect.player.active && card.name === 'Plusle') {
          hasPlusle = true;
        }
      });
      if (hasPlusle) {
        effect.damage += 20;
      }
    }

    return state;
  }
}
