import { EnergySwitchPK } from '../../03-ex-ruby-and-sapphire/set-ex-power-keepers/other-prints';
import { FullHeal } from '../../set-base-set/full-heal';
import { SeismitoadEx as SeismitoadExFFI20 } from './seismitoad-ex';
import { LucarioEx as LucarioExFFI54 } from './lucario-ex';
import { Korrina } from './korrina';
import { Maintenance } from '../../set-base-set/maintenance';
import { SuperScoopUp } from '../../04-diamond-pearl-platinum/set-diamond-and-pearl/super-scoop-up';
import { MLucarioEx } from './m-lucario-ex';
import { DragoniteEx } from './dragonite-ex';
import { BattleReporter } from './battle-reporter';
import { FossilResearcher } from './fossil-researcher';
import { MHeracrossEx } from './m-heracross-ex';
import { HeracrossEx } from './heracross-ex';

// MARK: Reprints

export class EnergySwitchPKFFI extends EnergySwitchPK {
  public setNumber = '89';
  public fullName: string = 'Energy Switch FFI';
  public set = 'FFI';
}

export class FullHealFFI extends FullHeal {
  public setNumber = '93';
  public fullName: string = 'Full Heal FFI';
  public set = 'FFI';
}

export class MaintenanceFFI extends Maintenance {
  public set: string = 'FFI';
  public setNumber: string = '96';
  public fullName: string = 'Maintenance FFI 96';
  public legacyFullName: string = 'Maintenance FFI';
  public text: string =
    "Shuffle 2 cards from your hand into your deck. (If you can't shuffle 2 cards into your deck, you can't play this card.) Then, draw a card.";
}

export class SuperScoopUpFFI extends SuperScoopUp {
  public set: string = 'FFI';
  public setNumber: string = '100';
  public name: string = 'Super Scoop Up';
  public fullName: string = 'Super Scoop Up FFI';
  public text: string =
    'Flip a coin. If heads, put 1 of your Pokémon and all cards attached to it into your hand.';
}

// MARK: Yellow A alternates
export class MLucarioEx2 extends MLucarioEx {
  public set: string = 'FFI';
  public setNumber: string = '55a';
  public fullName: string = 'M Lucario-EX FFI 55a';
}

// MARK: Full arts

export class HeracrossExFFI105 extends HeracrossEx {
  public setNumber = '105';
  public fullName: string = 'Heracross-EX FFI 105';
  public set = 'FFI';
}

export class SeismitoadEx2FFI extends SeismitoadExFFI20 {
  public setNumber = '106';
  public fullName: string = 'Seismitoad EX2 FFI';
  public set = 'FFI';
}

export class LucarioEx2FFI extends LucarioExFFI54 {
  public setNumber = '107';
  public fullName: string = 'Lucario EX2 FFI';
  public set = 'FFI';
}

export class DragoniteEx2 extends DragoniteEx {
  public set: string = 'FFI';
  public setNumber: string = '108';
  public fullName: string = 'Dragonite-EX FFI 108';
}

export class BattleReporter2 extends BattleReporter {
  public set: string = 'FFI';
  public setNumber: string = '109';
  public fullName: string = 'Battle Reporter FFI 109';
}

export class FossilResearcher2 extends FossilResearcher {
  public set: string = 'FFI';
  public setNumber: string = '110';
  public fullName: string = 'Fossil Researcher FFI 110';
}

export class KorrinaFFI extends Korrina {
  public set: string = 'FFI';
  public setNumber: string = '111';
  public fullName: string = 'Korrina FFI 111';
}

// MARK: Golds

export class MHeracrossEx2 extends MHeracrossEx {
  public set: string = 'FFI';
  public setNumber: string = '112';
  public fullName: string = 'M Heracross-EX FFI 112';
}

export class MLucarioEx3 extends MLucarioEx {
  public set: string = 'FFI';
  public setNumber: string = '113';
  public fullName: string = 'M Lucario-EX FFI 113';
}
