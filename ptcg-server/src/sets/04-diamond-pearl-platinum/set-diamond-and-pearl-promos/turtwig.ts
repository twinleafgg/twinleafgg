import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';

export class Turtwig extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: 10 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Tackle',
    cost: [],
    damage: 10,
    text: ''
  },
  {
    name: 'Razor Leaf',
    cost: [G],
    damage: 20,
    text: ''
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP01';
  public name: string = 'Turtwig';
  public fullName: string = 'Turtwig DPP';
}
