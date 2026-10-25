import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';

export class Magmar extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    name: 'Live Coal',
    cost: [R],
    damage: 10,
    text: ''
  },
  {
    name: 'Magma Punch',
    cost: [R, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '52';
  public name: string = 'Magmar';
  public fullName: string = 'Magmar UL';
}
