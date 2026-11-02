import { PokemonCard, Stage, CardType } from '../../game';

export class Bulbasaur extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [G];
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    // Bite
    name: 'Bite',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    // Razor Leaf
    name: 'Razor Leaf',
    cost: [G, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Bulbasaur';
  public fullName: string = 'Bulbasaur P2';
}
