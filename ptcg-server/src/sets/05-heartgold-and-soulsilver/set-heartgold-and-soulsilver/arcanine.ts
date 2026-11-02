import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';

export class Arcanine extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Growlithe';
  public hp: number = 110;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Sharp Fang',
    cost: [R, C],
    damage: 50,
    text: ''
  },
  {
    name: 'Fire Mane',
    cost: [R, C, C, C],
    damage: 90,
    text: ''
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Arcanine';
  public fullName: string = 'Arcanine HS';
}
