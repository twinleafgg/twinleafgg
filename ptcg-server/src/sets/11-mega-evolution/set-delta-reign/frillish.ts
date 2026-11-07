import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';

export class Frillish extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 80;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Hook',
    cost: [C],
    damage: 10,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '27';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Frillish';
  public fullName: string = 'Frillish M6';
}
