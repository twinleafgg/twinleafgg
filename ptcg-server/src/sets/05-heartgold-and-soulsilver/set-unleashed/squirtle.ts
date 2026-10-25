import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';

export class Squirtle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    name: 'Rain Splash',
    cost: [W],
    damage: 10,
    text: ''
  },
  {
    name: 'Shell Attack',
    cost: [W, W, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '63';
  public name: string = 'Squirtle';
  public fullName: string = 'Squirtle UL';
}
