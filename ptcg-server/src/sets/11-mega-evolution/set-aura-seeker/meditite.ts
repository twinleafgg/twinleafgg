import { CardType, PokemonCard, Stage } from '../../../game';

export class Meditite extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Chop',
    cost: [P],
    damage: 20,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '28';
  public name: string = 'Meditite';
  public fullName: string = 'Meditite FLO';
}
