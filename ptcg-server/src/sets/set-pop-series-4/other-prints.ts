import { HealEnergy } from '../03-ex-ruby-and-sapphire/set-ex-deoxys/heal-energy';
import { ScrambleEnergy } from '../03-ex-ruby-and-sapphire/set-ex-deoxys/scramble-energy';
import { Sceptile } from '../03-ex-ruby-and-sapphire/set-ex-ruby-and-sapphire/sceptile';

export class SceptileP4 extends Sceptile {
  public set: string = 'P4';
  public setNumber: string = '5';
  public fullName: string = 'Sceptile P4';
}

export class HealEnergyP4 extends HealEnergy {
  public set: string = 'P4';
  public setNumber: string = '8';
  public fullName: string = 'Heal Energy P4';
}

export class ScrambleEnergyP4 extends ScrambleEnergy {
  public set: string = 'P4';
  public setNumber: string = '10';
  public fullName: string = 'Scramble Energy P4';
}
