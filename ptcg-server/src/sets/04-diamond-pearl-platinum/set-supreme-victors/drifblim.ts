import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';

export class Drifblim extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Drifloon';
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +20 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Ram',
    cost: [C, C],
    damage: 20,
    text: ''
  }, {
    name: 'Gust',
    cost: [C, C, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '57';
  public name: string = 'Drifblim';
  public fullName: string = 'Drifblim SV';
}
