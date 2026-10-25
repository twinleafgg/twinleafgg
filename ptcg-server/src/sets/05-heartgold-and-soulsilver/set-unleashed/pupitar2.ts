import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';

export class Pupitar2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Larvitar';
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Hammer In',
    cost: [F, C],
    damage: 30,
    text: ''
  },
  {
    name: 'Speed Attack',
    cost: [F, C, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '39';
  public name: string = 'Pupitar';
  public fullName: string = 'Pupitar UL2';
}
