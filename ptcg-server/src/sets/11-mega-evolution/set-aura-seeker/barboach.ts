import { CardType, PokemonCard, Stage } from '../../../game';

export class Barboach extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Splash About',
    cost: [F],
    damage: 20,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '42';
  public name: string = 'Barboach';
  public fullName: string = 'Barboach FLO';
}
