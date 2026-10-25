import { CardType, PokemonCard, Stage } from '../../../game';

export class Kricketot extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Headbutt',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    name: 'Beat',
    cost: [G, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '109';
  public name: string = 'Kricketot';
  public fullName: string = 'Kricketot SV';
}
