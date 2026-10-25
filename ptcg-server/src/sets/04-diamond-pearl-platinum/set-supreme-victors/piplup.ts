import { CardType, PokemonCard, Stage } from '../../../game';

export class Piplup extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Pound',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    name: 'Surf',
    cost: [W, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '121';
  public name: string = 'Piplup';
  public fullName: string = 'Piplup SV';
}
