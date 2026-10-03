import { Card } from '../../../game/store/card/card';
import { Avalugg } from './avalugg';
import { Barbaracle } from './barbaracle';
import { Bergmite } from './bergmite';
import { Binacle } from './binacle';
import { Buizel } from './buizel';
import { Buneary } from './buneary';
import { Butterfree } from './butterfree';
import { Carbink } from './carbink';
import { Caterpie } from './caterpie';
import { CharizardEx } from './charizard-ex';
import { CharizardEx2 } from './charizard-ex-2';
import { Dragalge } from './dragalge';
import { Druddigon } from './druddigon';
import { Durant } from './durant';
import { Dusclops } from './dusclops';
import { Dusknoir } from './dusknoir';
import { Duskull } from './duskull';
import { Espurr } from './espurr';
import { Feebas } from './feebas';
import { Flabebe } from './flabebe';
import { Flabebe2 } from './flabebe-2';
import { Fletchinder } from './fletchinder';
import { Fletchling } from './fletchling';
import { Floatzel } from './floatzel';
import { Floette } from './floette';
import { Floette2 } from './floette-2';
import { Florges } from './florges';
import { Forretress } from './forretress';
import { Furfrou } from './furfrou';
import { Furret } from './furret';
import { Geodude } from './geodude';
import { Golem } from './golem';
import { Goodra } from './goodra';
import { Goomy } from './goomy';
import { Graveler } from './graveler';
import { Heliolisk } from './heliolisk';
import { Helioptile } from './helioptile';
import { KangaskhanEX } from './kangaskhan-ex';
import { Krokorok } from './krokorok';
import { Litleo } from './litleo';
import { Litleo2 } from './litleo-2';
import { Lopunny } from './lopunny';
import { Luvdisc } from './luvdisc';
import { Luxio } from './luxio';
import { Luxray } from './luxray';
import { MCharizardEX } from './m-charizard-ex';
import { MCharizardEx2 } from './m-charizard-ex-2';
import { MKangaskhanEX } from './m-kangaskhan-ex';
import { MagnezoneEx } from './magnezone-ex';
import { Maractus } from './maractus';
import { Meowstic } from './meowstic';
import { Metapod } from './metapod';
import { Milotic } from './milotic';
import { Miltank } from './miltank';
import { Nuzleaf } from './nuzleaf';
import { Pidgeot } from './pidgeot';
import { Pidgeotto } from './pidgeotto';
import { Pidgey } from './pidgey';
import { Pineco } from './pineco';
import { Ponyta } from './ponyta';
import { Pyroar } from './pyroar';
import { Qwilfish } from './qwilfish';
import { Rapidash } from './rapidash';
import { Roselia } from './roselia';
import { Roserade } from './roserade';
import { Sandile } from './sandile';
import { Scrafty } from './scrafty';
import { Scraggy } from './scraggy';
import { Sealeo } from './sealeo';
import { Seedot } from './seedot';
import { Sentret } from './sentret';
import { Shiftry } from './shiftry';
import { Shinx } from './shinx';
import { Skrelp } from './skrelp';
import { Skuntank } from './skuntank';
import { Sliggoo } from './sliggoo';
import { Sneasel } from './sneasel';
import { Sneasel2 } from './sneasel-2';
import { Snorlax } from './snorlax';
import { Spheal } from './spheal';
import { Spritzee } from './spritzee';
import { Stunky } from './stunky';
import { Stunky2 } from './stunky-2';
import { Torkoal } from './torkoal';
import { ToxicroakEx } from './toxicroak-ex';
import { Walrein } from './walrein';
import { Weavile } from './weavile';
import { Blacksmith } from './blacksmith';
import { FieryTorch } from './fiery-torch';
import { Lysandre } from './lysandre';
import { MagneticStorm } from './magnetic-storm';
import { PokemonCenterLady } from './pokemon-center-lady';
import { ProtectionCube } from './protection-cube';
import { SacredAsh } from './sacred-ash';
import { StartlingMegaphone } from './startling-megaphone';
import { TrickShovel } from './trick-shovel';

import {
  PokemonFanClubFLF,
  PalPadFLF,
  UltraBallFLF,
  ToxicroakEx2FLF,
  KangaskhanEX2FLF,
  Lysandre2FLF,
  PokemonFanClub2FLF,
  MCharizardEX4FLF,
  MKangaskhanEX2FLF,
  Blacksmith2FLF,
  CharizardEx3,
  MagnezoneEx2,
  PokemonCenterLady2,
  MCharizardEx3,
} from './other-prints';

export const setFlashfire: Card[] = [
  // Pokemon
  new Avalugg(),
  new Barbaracle(),
  new Bergmite(),
  new Binacle(),
  new Buizel(),
  new Buneary(),
  new Butterfree(),
  new Carbink(),
  new Caterpie(),
  new CharizardEx(),
  new CharizardEx2(),
  new Dragalge(),
  new Druddigon(),
  new Durant(),
  new Dusclops(),
  new Dusknoir(),
  new Duskull(),
  new Espurr(),
  new Feebas(),
  new Flabebe(),
  new Flabebe2(),
  new Fletchinder(),
  new Fletchling(),
  new Floatzel(),
  new Floette(),
  new Floette2(),
  new Florges(),
  new Forretress(),
  new Furfrou(),
  new Furret(),
  new Geodude(),
  new Golem(),
  new Goodra(),
  new Goomy(),
  new Graveler(),
  new Heliolisk(),
  new Helioptile(),
  new KangaskhanEX(),
  new Krokorok(),
  new Litleo(),
  new Litleo2(),
  new Lopunny(),
  new Luvdisc(),
  new Luxio(),
  new Luxray(),
  new MCharizardEX(),
  new MCharizardEx2(),
  new MKangaskhanEX(),
  new MagnezoneEx(),
  new Maractus(),
  new Meowstic(),
  new Metapod(),
  new Milotic(),
  new Miltank(),
  new Nuzleaf(),
  new Pidgeot(),
  new Pidgeotto(),
  new Pidgey(),
  new Pineco(),
  new Ponyta(),
  new Pyroar(),
  new Qwilfish(),
  new Rapidash(),
  new Roselia(),
  new Roserade(),
  new Sandile(),
  new Scrafty(),
  new Scraggy(),
  new Sealeo(),
  new Seedot(),
  new Sentret(),
  new Shiftry(),
  new Shinx(),
  new Skrelp(),
  new Skuntank(),
  new Sliggoo(),
  new Sneasel(),
  new Sneasel2(),
  new Snorlax(),
  new Spheal(),
  new Spritzee(),
  new Stunky(),
  new Stunky2(),
  new Torkoal(),
  new ToxicroakEx(),
  new Walrein(),
  new Weavile(),

  // Trainers
  new Blacksmith(),
  new FieryTorch(),
  new Lysandre(),
  new MagneticStorm(),
  new PokemonCenterLady(),
  new ProtectionCube(),
  new SacredAsh(),
  new StartlingMegaphone(),
  new TrickShovel(),

  // Other Prints (Reprints & Alt Arts)
  new PokemonFanClubFLF(),
  new PalPadFLF(),
  new UltraBallFLF(),
  new ToxicroakEx2FLF(),
  new KangaskhanEX2FLF(),
  new Lysandre2FLF(),
  new PokemonFanClub2FLF(),
  new MCharizardEX4FLF(),
  new MKangaskhanEX2FLF(),
  new Blacksmith2FLF(),
  new CharizardEx3(),
  new MagnezoneEx2(),
  new PokemonCenterLady2(),
  new MCharizardEx3(),
];
