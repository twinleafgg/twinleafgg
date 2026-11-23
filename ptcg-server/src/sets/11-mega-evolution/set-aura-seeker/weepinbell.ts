import { CardType, PokemonCard, Stage } from '../../../game';

export class Weepinbell extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Bellsprout';
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Razor Leaf',
    cost: [G, G],
    damage: 60,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Weepinbell';
  public fullName: string = 'Weepinbell FLO';
}
