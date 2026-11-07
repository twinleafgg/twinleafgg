import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';

export class Nidorina extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Nidoran ♀';
  public cardType: CardType[] = [D];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Tackle',
    cost: [D, C],
    damage: 60,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '56';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Nidorina';
  public fullName: string = 'Nidorina M6';
}
