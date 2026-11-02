import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';

export class Squirtle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Skull Bash',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    name: 'Bite',
    cost: [W, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  public name: string = 'Squirtle';
  public fullName: string = 'Squirtle PL';
}
