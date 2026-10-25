import { PokemonCard } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';

export class Hitmonlee extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Kick',
    cost: [F],
    damage: 20,
    text: ''
  }, {
    name: 'High Jump Kick',
    cost: [F, F, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Hitmonlee';
  public fullName: string = 'Hitmonlee HSP';
}
