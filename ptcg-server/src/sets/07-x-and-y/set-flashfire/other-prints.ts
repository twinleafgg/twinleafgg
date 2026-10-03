import { PalPad } from '../../10-scarlet-and-violet/set-scarlet-and-violet/pal-pad';
import { UltraBall } from '../../10-scarlet-and-violet/set-scarlet-and-violet/ultra-ball';
import { ToxicroakEx as ToxicroakExFLF41 } from './toxicroak-ex';
import { KangaskhanEX as KangaskhanEXFLF78 } from './kangaskhan-ex';
import { Lysandre as LysandreFLF90 } from './lysandre';
import { PokemonFanClub as PokemonFanClubP49 } from '../../set-pop-series-4/pokemon-fan-club';
import { MCharizardEx2 as MCharizardEXFLF13 } from './m-charizard-ex-2';
import { MCharizardEX as MCharizardEXFLF69 } from './m-charizard-ex';
import { MKangaskhanEX as MKangaskhanEXFLF79 } from './m-kangaskhan-ex';
import { Blacksmith as BlacksmithFLF88 } from './blacksmith';
import { PokemonFanClub } from '../../08-sun-and-moon/set-ultra-prism/pokemon-fan-club';
import { CharizardEx } from './charizard-ex';
import { MagnezoneEx } from './magnezone-ex';
import { PokemonCenterLady } from './pokemon-center-lady';

// MARK: Reprints

export class PalPadFLF extends PalPad {
  public setNumber = '92';
  public fullName: string = 'Pal Pad FLF';
  public set = 'FLF';
}

export class PokemonFanClubFLF extends PokemonFanClub {
  public set: string = 'FLF';
  public setNumber: string = '94';
  public fullName: string = 'Pokémon Fan Club FLF';
  public text: string =
    'Search your deck for up to 2 Basic Pokémon, reveal them, and put them into your hand. Shuffle your deck afterward.';
}

export class UltraBallFLF extends UltraBall {
  public setNumber = '99';
  public fullName: string = 'Ultra Ball FLF';
  public set = 'FLF';
}

// MARK: Yellow A alternates

export class Blacksmith2FLF extends BlacksmithFLF88 {
  public setNumber = '88a';
  public fullName: string = 'Blacksmith2 FLF';
  public set = 'FLF';
}

// MARK: Full arts

export class CharizardEx3 extends CharizardEx {
  public set: string = 'FLF';
  public setNumber: string = '100';
  public fullName: string = 'Charizard-EX FLF 100';
}

export class MagnezoneEx2 extends MagnezoneEx {
  public set: string = 'FLF';
  public setNumber: string = '101';
  public fullName: string = 'Magnezone-EX FLF 101';
}

export class ToxicroakEx2FLF extends ToxicroakExFLF41 {
  public setNumber = '102';
  public fullName: string = 'Toxicroak EX2 FLF';
  public set = 'FLF';
}

export class KangaskhanEX2FLF extends KangaskhanEXFLF78 {
  public setNumber = '103';
  public fullName: string = 'Kangaskhan-EX2 FLF';
  public set = 'FLF';
}

export class Lysandre2FLF extends LysandreFLF90 {
  public setNumber = '104';
  public fullName: string = 'Lysandre2 FLF';
  public set = 'FLF';
}
export class PokemonCenterLady2 extends PokemonCenterLady {
  public set: string = 'FLF';
  public setNumber: string = '105';
  public fullName: string = 'Pokémon Center Lady FLF 105';
}

export class PokemonFanClub2FLF extends PokemonFanClubP49 {
  public setNumber = '106';
  public fullName: string = 'Pokémon Fan Club2 FLF';
  public set = 'FLF';
  public legacyFullName: string = 'Pokémon Fan Club FLF 94a';
}

// MARK: Golds

export class MCharizardEx3 extends MCharizardEXFLF13 {
  public set: string = 'FLF';
  public setNumber: string = '107';
  public fullName: string = 'M Charizard-EX FLF 107';
}

export class MCharizardEX4FLF extends MCharizardEXFLF69 {
  public setNumber = '108';
  public fullName: string = 'M Charizard EX4 FLF';
  public set = 'FLF';
}

export class MKangaskhanEX2FLF extends MKangaskhanEXFLF79 {
  public setNumber = '109';
  public fullName: string = 'M Kangaskhan-EX2 FLF';
  public set = 'FLF';
}
