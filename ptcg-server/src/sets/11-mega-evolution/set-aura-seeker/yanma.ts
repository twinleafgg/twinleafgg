import { CardType, PokemonCard, Stage } from '../../../game';

export class Yanma extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [];

  public attacks = [{
    name: 'Tackle',
    cost: [G],
    damage: 10,
    text: ''
  },
  {
    name: 'Gust',
    cost: [G, C, C],
    damage: 40,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Yanma';
  public fullName: string = 'Yanma FLO';
}
