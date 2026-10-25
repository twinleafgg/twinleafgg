import { CardType, PokemonCard, Stage } from '../../../game';

export class Croagunk extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Hook',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    name: 'Corkscrew Punch',
    cost: [P, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '101';
  public name: string = 'Croagunk';
  public fullName: string = 'Croagunk SV';
}
