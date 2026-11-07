import { CardType, PokemonCard, Stage } from '../../../game';

export class Machoke extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Machop';
  public hp: number = 110;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public resistance = [];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Punch',
    cost: [F],
    damage: 30,
    text: ''
  },
  {
    name: 'Hammer In',
    cost: [F, C, C],
    damage: 80,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '38';
  public name: string = 'Machoke';
  public fullName: string = 'Machoke FLO';
}
