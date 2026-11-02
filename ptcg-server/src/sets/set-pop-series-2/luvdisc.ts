import { PokemonCard, CardType, Stage } from '../../game';

export class Luvdisc extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    // Paralyzing Kiss
    name: 'Paralyzing Kiss',
    cost: [C],
    damage: 0,
    text: 'If there are 2 Defending Pokémon in play, choose 1 of the Defending Pokémon. That Pokémon is now Paralyzed. (If there is only 1 Defending Pokémon, this attack does nothing.)'
  }, {
    // Fast Stream
    name: 'Fast Stream',
    cost: [W, C],
    damage: 20,
    text: 'Move 1 Energy card attached to the Defending Pokémon to the other Defending Pokémon. (Ignore this effect if your opponent has only 1 Defending Pokémon.)'
  }];

  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Luvdisc';
  public fullName: string = 'Luvdisc P2';
}
