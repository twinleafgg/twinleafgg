import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';

export class Growlithe extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Bite',
    cost: [C],
    damage: 10,
    text: ''
  },
  {
    name: 'Combustion',
    cost: [R, C, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '65';
  public name: string = 'Growlithe';
  public fullName: string = 'Growlithe HS';
}
