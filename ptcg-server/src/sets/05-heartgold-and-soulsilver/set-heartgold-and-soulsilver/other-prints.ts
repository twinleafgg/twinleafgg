import { Bill } from '../../set-base-set/bill';
import { Copycat } from '../../03-ex-ruby-and-sapphire/set-ex-dragon-frontiers/copycat';
import { EnergySwitchPK } from '../../03-ex-ruby-and-sapphire/set-ex-power-keepers/other-prints';
import { FullHeal } from '../../set-base-set/full-heal';
import { PokeBall } from '../../set-jungle/pokeball';
import { ProfessorElmsTrainingMethod } from '../../03-ex-ruby-and-sapphire/set-ex-unseen-forces/professors-elm-training-method';
import { DoubleColorlessEnergy } from '../../set-base-set/double-colorless-energy';
import { Fisherman } from '../../08-sun-and-moon/set-celestial-storm/fisherman';
import { Pokegear30 } from '../../10-scarlet-and-violet/set-scarlet-and-violet/pokegear-30';
import { PokemonCommunication } from '../../08-sun-and-moon/set-team-up/pokemon-communication';
import { PokemonReversal } from '../../03-ex-ruby-and-sapphire/set-ex-unseen-forces/pokemon-reversal';
import { RainbowEnergy } from '../../08-sun-and-moon/set-sun-and-moon/rainbow-energy';
import { Switch } from '../../10-scarlet-and-violet/set-scarlet-and-violet/switch';
import { HoOhLEGEND } from './ho-oh-legend';
import { LugiaLEGEND } from './lugia-legend';

export class DoubleColorlessEnergyHS extends DoubleColorlessEnergy {
  public set: string = 'HS';
  public setNumber: string = '103';
  public fullName: string = 'Double Colorless Energy HS';
}

export class FishermanHS extends Fisherman {
  public name: string = 'Fisherman';
  public set: string = 'HS';
  public setNumber: string = '92';
  public fullName: string = 'Fisherman HS';
  public text: string = 'Search your discard pile for 4 basic Energy cards, show them to your opponent, and put them into your hand.';
}

export class Pokegear30HS extends Pokegear30 {
  public name: string = 'Pokégear 3.0';
  public set: string = 'HS';
  public setNumber: string = '96';
  public fullName: string = 'Pokégear 3.0 HS';
  public text: string = 'Look at the top 7 cards of your deck. Choose a Supporter card you find there, show it to your opponent, and put it into your hand. Shuffle the other cards back into your deck.';
}

export class PokemonCommunicationHS extends PokemonCommunication {
  public name: string = 'Pokémon Communication';
  public set: string = 'HS';
  public setNumber: string = '98';
  public fullName: string = 'Pokemon Communication HS';
  public text: string = 'Choose 1 Pokémon in your hand, show it to your opponent, and put it on top of your deck. If you do, search your deck for a Pokémon, show it to your opponent, and put it into your hand. Shuffle your deck afterward.';
}

export class PokemonReversalHS extends PokemonReversal {
  public name: string = 'Pokémon Reversal';
  public set: string = 'HS';
  public setNumber: string = '99';
  public fullName: string = 'Pokemon Reversal HS';
  public text: string = 'Flip a coin. If heads, choose 1 of your opponent\'s Benched Pokémon and switch it with your opponent\'s Active Pokémon.';
}

export class RainbowEnergyHS extends RainbowEnergy {
  public set: string = 'HS';
  public setNumber: string = '104';
  public fullName: string = 'Rainbow Energy HS';
  public text: string = 'Attach Rainbow Energy to 1 of your Pokémon. While in play, Rainbow Energy provides every type of Energy but provides only 1 Energy at a time. (Has no effect other than providing Energy.) When you attach this card from your hand to 1 of your Pokémon, put 1 damage counter on that Pokémon. (While not in play, Rainbow Energy counts as [C] Energy.)';
}

export class SwitchHS extends Switch {
  public name: string = 'Switch';
  public set: string = 'HS';
  public setNumber: string = '102';
  public fullName: string = 'Switch HS';
  public text: string = 'Switch 1 of your Active Pokémon with 1 of your Benched Pokémon.';
}

export class BillHS extends Bill {
  public set: string = 'HS';
  public setNumber: string = '89';
  public fullName: string = 'Bill HS';
}

export class CopycatHS extends Copycat {
  public set: string = 'HS';
  public setNumber: string = '90';
  public fullName: string = 'Copycat HS';
}

export class EnergySwitchPKHS extends EnergySwitchPK {
  public set: string = 'HS';
  public setNumber: string = '91';
  public fullName: string = 'Energy Switch HS';
}

export class FullHealHS extends FullHeal {
  public set: string = 'HS';
  public setNumber: string = '93';
  public fullName: string = 'Full Heal HS';
}

export class PokeBallHS extends PokeBall {
  public set: string = 'HS';
  public setNumber: string = '95';
  public fullName: string = 'Poké Ball HS';
}

export class ProfessorElmsTrainingMethodHS extends ProfessorElmsTrainingMethod {
  public set: string = 'HS';
  public setNumber: string = '100';
  public fullName: string = 'Professor Elm\'s Training Method HS';
}

export class HoOhLEGENDHS112 extends HoOhLEGEND {
  public set: string = 'HS';
  public setNumber: string = '112';
  public fullName: string = 'Ho-Oh LEGEND HS 112';
}

export class LugiaLEGENDHS114 extends LugiaLEGEND {
  public set: string = 'HS';
  public setNumber: string = '114';
  public fullName: string = 'Lugia LEGEND HS 114';
}
