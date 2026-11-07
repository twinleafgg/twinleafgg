import { CardType, PokemonCard, Stage } from '../../../game';

export class Machop extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public resistance = [];
  public retreat = [C, C];

  public attacks = [{
    name: 'Jab',
    cost: [F],
    damage: 10,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '37';
  public name: string = 'Machop';
  public fullName: string = 'Machop FLO';
}
