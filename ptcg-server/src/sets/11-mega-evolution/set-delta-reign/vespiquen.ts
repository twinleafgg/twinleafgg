import { CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Vespiquen extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Combee';
  public cardType: CardType[] = [G];
  public hp: number = 120;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Pierce',
    cost: [G],
    damage: 40,
    text: ''
  },
  {
    name: 'Clean Hit',
    cost: [C, C, C],
    damage: 80,
    damageCalculation: '+',
    text: 'If your opponent\'s Active Pokémon is an Evolution Pokémon, this attack does 80 more damage.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Vespiquen';
  public fullName: string = 'Vespiquen M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Clean Hit
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const activePokemon = opponent.active.getPokemonCard();

      if (activePokemon && activePokemon.stage !== Stage.BASIC) {
        effect.damage += 80;
      }
    }

    return state;
  }
}
