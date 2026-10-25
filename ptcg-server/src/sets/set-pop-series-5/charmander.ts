import { PokemonCard, Stage, CardTag, CardType } from '../../game';

export class Charmander extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp: number = 50;
  public cardType: CardType[] = [L];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    // Scratch
    name: 'Scratch',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    // Bite
    name: 'Bite',
    cost: [L, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'P5';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Charmander δ';
  public fullName: string = 'Charmander δ P5';
}
