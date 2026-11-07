import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { PlayerType, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Zoroarkex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Zorua';
  public cardType: CardType[] = [D];
  public hp: number = 270;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Riotous Beating',
    cost: [D],
    damage: 20,
    damageCalculation: 'x',
    text: 'This attack does 20 damage for each of your Pokémon in play.',
  },
  {
    name: 'Slashing Strike',
    cost: [D, C, C],
    damage: 210,
    text: "During your next turn, this Pokémon can't use Slashing Strike.",
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '67';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Zoroark ex';
  public fullName: string = 'Zoroark ex MEZ';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Riotous Beating
    if (WAS_ATTACK_USED(effect, 0, this)) {
      let pokemonInPlay = 0;
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, () => {
        pokemonInPlay += 1;
      });
      effect.damage = 20 * pokemonInPlay;
    }

    // Slashing Strike
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.player.active.cannotUseAttacksNextTurnPending.push('Slashing Strike');
    }

    return state;
  }
}
