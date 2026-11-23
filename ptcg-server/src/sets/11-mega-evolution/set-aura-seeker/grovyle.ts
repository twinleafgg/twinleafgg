import { CardType, PokemonCard, Stage } from '../../../game';

export class Grovyle extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Treecko';
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Solar Blade',
    cost: [G],
    damage: 40,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Grovyle';
  public fullName: string = 'Grovyle FLO';
}
