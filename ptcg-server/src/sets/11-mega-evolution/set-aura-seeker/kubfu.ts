import { CardType, PokemonCard, Stage } from '../../../game';

export class Kubfu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Jab',
    cost: [F, C],
    damage: 50,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '48';
  public name: string = 'Kubfu';
  public fullName: string = 'Kubfu FLO';
}
