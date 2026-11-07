import { CardType, PokemonCard, PokemonCardList, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Kilowattrel extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Wattrel';
  public cardType: CardType[] = [L];
  public hp: number = 120;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Raid',
    cost: [L],
    damage: 30,
    damageCalculation: '+',
    text: 'If this Pokémon evolved from Wattrel during this turn, this attack does 90 more damage.'
  },
  {
    name: 'Speed Dive',
    cost: [L, C],
    damage: 70,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';
  public name: string = 'Kilowattrel';
  public fullName: string = 'Kilowattrel M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Raid
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const cardList = StateUtils.findCardList(state, this);
      if (cardList instanceof PokemonCardList && cardList.pokemonPlayedTurn === state.turn) {
        effect.damage += 90;
      }
    }

    return state;
  }
}
