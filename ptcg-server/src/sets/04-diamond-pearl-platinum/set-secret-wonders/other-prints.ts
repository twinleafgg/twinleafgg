import { BebesSearch } from '../set-mysterious-treasures/bebes-search';
import { PlusPower } from '../../set-base-set/pluspower';
import { Potion } from '../../set-base-set/potion';
import { Switch } from '../../set-base-set/switch';
import { DarknessEnergySpecial } from '../../set-neo-genesis/darkness-energy-special';
import { MetalEnergyN1 } from '../../set-neo-genesis/other-prints';
import { SuperRod } from '../../10-scarlet-and-violet/set-paldea-evolved/super-rod';
import { ProfessorRowan } from '../set-diamond-and-pearl/professor-rowan';
import { Rival } from '../set-diamond-and-pearl/rival';

export class NightMaintenanceSW extends SuperRod {
  public fullName = 'Night Maintenance SW';
  public name = 'Night Maintenance';
  public set = 'SW';
  public setNumber = '120';
  public text = 'Search your discard pile for up to 3 in any combination of Pokémon and basic Energy cards. Show them to your opponent and shuffle them into your deck.';
}
export class BebesSearchSW extends BebesSearch {
  public setNumber = '119';
  public fullName: string = 'Bebe\'s Search SW';
  public set = 'SW';
}

export class PlusPowerSW extends PlusPower {
  public setNumber = '121';
  public fullName: string = 'PlusPower SW';
  public set = 'SW';
}

export class PotionSW extends Potion {
  public setNumber = '127';
  public fullName: string = 'Potion SW';
  public set = 'SW';
}

export class SwitchSW extends Switch {
  public setNumber = '128';
  public fullName: string = 'Switch SW';
  public set = 'SW';
}

export class DarknessEnergySpecialSW extends DarknessEnergySpecial {
  public setNumber = '129';
  public fullName: string = 'Darkness Energy SW';
  public set = 'SW';
}

export class MetalEnergyN1SW extends MetalEnergyN1 {
  public setNumber = '130';
  public fullName: string = 'Metal Energy SW';
  public set = 'SW';
}

export class ProfessorRowanSW extends ProfessorRowan {
  public setNumber = '123';
  public fullName: string = 'Professor Rowan SW';
  public set = 'SW';
}

export class RivalSW extends Rival {
  public setNumber = '124';
  public fullName: string = 'Rival SW';
  public set = 'SW';
}
