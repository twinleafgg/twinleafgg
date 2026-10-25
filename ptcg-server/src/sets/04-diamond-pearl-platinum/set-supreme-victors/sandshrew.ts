import { CardType, PokemonCard, Stage } from '../../../game';

export class Sandshrew extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +10 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Scratch',
    cost: [F],
    damage: 20,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '124';
  public name: string = 'Sandshrew';
  public fullName: string = 'Sandshrew SV';
}
