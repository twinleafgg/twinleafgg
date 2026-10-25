import { CardType, PokemonCard, Stage } from '../../../game';

export class SurfingPikachu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Surf',
    cost: [W, W],
    damage: 30,
    text: ''
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '114';
  public name: string = 'Surfing Pikachu';
  public fullName: string = 'Surfing Pikachu RR';
}
