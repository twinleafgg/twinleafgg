import { CardType, PokemonCard, Stage } from '../../../game';

export class Inkay extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [D];
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Peck',
    cost: [C],
    damage: 10,
    text: ''
  },
  {
    name: 'Tackle',
    cost: [C, C],
    damage: 20,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '51';
  public name: string = 'Inkay';
  public fullName: string = 'Inkay FLO';
}
