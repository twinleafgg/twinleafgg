import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../game/store/card/card-types';

export class Charmander extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 70;
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Gnaw',
      cost: [R],
      damage: 10,
      text: '',
    },
    {
      name: 'Flare',
      cost: [R, C],
      damage: 20,
      text: '',
    },
  ];

  public set: string = 'HIF';
  public setNumber: string = '7';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Charmander';
  public fullName: string = 'Charmander HIF';
  public legacyFullName = 'Charmander HIF 7';
}
