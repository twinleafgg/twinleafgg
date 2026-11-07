import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';

export class Pawmo extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Pawmi';
  public cardType: CardType[] = [L];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Electro Ball',
    cost: [L],
    damage: 40,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '38';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Pawmo';
  public fullName: string = 'Pawmo MEE';
}
