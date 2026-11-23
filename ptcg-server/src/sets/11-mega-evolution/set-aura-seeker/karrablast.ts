import { CardType, PokemonCard, Stage } from '../../../game';

export class Karrablast extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Gnaw',
    cost: [C, C],
    damage: 20,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Karrablast';
  public fullName: string = 'Karrablast FLO';
}
