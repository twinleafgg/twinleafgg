import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';

export class Purrloin extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 60;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Dig Claws',
    cost: [D],
    damage: 20,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '64';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Purrloin';
  public fullName: string = 'Purrloin MEZ';
}
