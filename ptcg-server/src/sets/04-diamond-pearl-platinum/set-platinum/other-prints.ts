import { Electabuzz } from '../../set-base-set/electabuzz';
import { Hitmonchan } from '../../set-base-set/hitmonchan';
import { PlusPower } from '../../set-base-set/pluspower';
import { PokeBall } from '../../set-jungle/pokeball';
import { Scyther } from '../../set-jungle/scyther';
import { RainbowEnergy } from '../../08-sun-and-moon/set-sun-and-moon/rainbow-energy';
import { PokedexHandy } from '../set-diamond-and-pearl/pokedex-handy';

export class RainbowEnergyPL extends RainbowEnergy {
  public setNumber = '121';
  public fullName = 'Rainbow Energy PL';
  public set = 'PL';
  public name = 'Rainbow Energy';
  public text = 'Attach Rainbow Energy to 1 of your Pokémon. While in play, Rainbow Energy provides every type of Energy but provides only 1 Energy at a time. (Has no effect other than providing Energy.) When you attach this card from your hand to 1 of your Pokémon, put 1 damage counter on that Pokémon.';
}

export class PlusPowerPL extends PlusPower {
  public setNumber = '112';
  public fullName: string = 'PlusPower PL';
  public set = 'PL';
}

export class PokeBallPL extends PokeBall {
  public setNumber = '113';
  public fullName: string = 'Poké Ball PL';
  public set = 'PL';
}

export class PokedexHandyPL extends PokedexHandy {
  public setNumber = '114';
  public fullName: string = 'Pokedex HANDY910is PL';
  public set = 'PL';
}

export class ElectabuzzPL extends Electabuzz {
  public setNumber = '128';
  public fullName: string = 'Electabuzz PL';
  public set = 'PL';
}

export class HitmonchanPL extends Hitmonchan {
  public setNumber = '129';
  public fullName: string = 'Hitmonchan PL';
  public set = 'PL';
}

export class ScytherPL extends Scyther {
  public setNumber = '130';
  public fullName: string = 'Scyther PL';
  public set = 'PL';
}
