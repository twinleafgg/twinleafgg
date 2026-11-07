import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';

export class Golett extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 90;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Light Punch',
    cost: [P, P],
    damage: 50,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '46';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Golett';
  public fullName: string = 'Golett M6';
}
