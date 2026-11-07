import { CardType, PokemonCard, Stage } from '../../../game';

export class Wooper extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public resistance = [];
  public retreat = [C];

  public attacks = [{
    name: 'Headbutt',
    cost: [W],
    damage: 20,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Wooper';
  public fullName: string = 'Wooper FLO';
}
