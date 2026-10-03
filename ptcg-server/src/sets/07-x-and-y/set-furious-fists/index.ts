import { Card } from '../../../game/store/card/card';
import { Accelgor } from './accelgor';
import { Amaura } from './amaura';
import { Aurorus } from './aurorus';
import { Beartic } from './beartic';
import { Bellsprout } from './bellsprout';
import { Blaziken } from './blaziken';
import { Breloom } from './breloom';
import { Clauncher } from './clauncher';
import { Clawitzer } from './clawitzer';
import { Clefable } from './clefable';
import { Clefairy } from './clefairy';
import { Clefairy2 } from './clefairy-2';
import { Combusken } from './combusken';
import { Cubchoo } from './cubchoo';
import { Dedenne } from './dedenne';
import { DragoniteEx } from './dragonite-ex';
import { Drapion } from './drapion';
import { Drowzee } from './drowzee';
import { Eevee } from './eevee';
import { Electabuzz } from './electabuzz';
import { Electivire } from './electivire';
import { Flygon } from './flygon';
import { Glaceon } from './glaceon';
import { Golett } from './golett';
import { Golurk } from './golurk';
import { Gothita } from './gothita';
import { Gothitelle } from './gothitelle';
import { Gothorita } from './gothorita';
import { Hariyama } from './hariyama';
import { Hawlucha } from './hawlucha';
import { HawluchaEx } from './hawlucha-ex';
import { HeracrossEx } from './heracross-ex';
import { Hitmonchan } from './hitmonchan';
import { Hitmonlee } from './hitmonlee';
import { Hitmontop } from './hitmontop';
import { Hypno } from './hypno';
import { Jynx } from './jynx';
import { Klefki } from './klefki';
import { Landorus } from './landorus';
import { Leafeon } from './leafeon';
import { Lickilicky } from './lickilicky';
import { Lickitung } from './lickitung';
import { LucarioEx } from './lucario-ex';
import { MHeracrossEx } from './m-heracross-ex';
import { MLucarioEx } from './m-lucario-ex';
import { Machamp } from './machamp';
import { Machoke } from './machoke';
import { Machop } from './machop';
import { Magmar } from './magmar';
import { Magmortar } from './magmortar';
import { Makuhita } from './makuhita';
import { Mienfoo } from './mienfoo';
import { Mienshao } from './mienshao';
import { Minun } from './minun';
import { Noibat } from './noibat';
import { Noivern } from './noivern';
import { Pancham } from './pancham';
import { Pancham2 } from './pancham-2';
import { Pangoro } from './pangoro';
import { Patrat } from './patrat';
import { Pikachu } from './pikachu';
import { Plusle } from './plusle';
import { Politoed } from './politoed';
import { Poliwag } from './poliwag';
import { Poliwhirl } from './poliwhirl';
import { Poliwrath } from './poliwrath';
import { Raichu } from './raichu';
import { Scrafty } from './scrafty';
import { Scraggy } from './scraggy';
import { SeismitoadEx } from './seismitoad-ex';
import { Shelmet } from './shelmet';
import { Shroomish } from './shroomish';
import { Skorupi } from './skorupi';
import { Slaking } from './slaking';
import { Slakoth } from './slakoth';
import { Sylveon } from './sylveon';
import { Thundurus } from './thundurus';
import { Torchic } from './torchic';
import { Tornadus } from './tornadus';
import { Trapinch } from './trapinch';
import { Tyrantrum } from './tyrantrum';
import { Tyrunt } from './tyrunt';
import { Vibrava } from './vibrava';
import { Victreebel } from './victreebel';
import { Vigoroth } from './vigoroth';
import { Watchog } from './watchog';
import { Weepinbell } from './weepinbell';
import { BattleReporter } from './battle-reporter';
import { FightingStadium } from './fighting-stadium';
import { FocusSash } from './focus-sash';
import { FossilResearcher } from './fossil-researcher';
import { JawFossil } from './jaw-fossil';
import { Korrina } from './korrina';
import { MountainRing } from './mountain-ring';
import { SailFossil } from './sail-fossil';
import { SparklingRobe } from './sparkling-robe';
import { ToolRetriever } from './tool-retriever';
import { TrainingCenter } from './training-center';
import { HerbalEnergy } from './herbal-energy';
import { StrongEnergy } from './strong-energy';

import {
  KorrinaFFI,
  MaintenanceFFI,
  SuperScoopUpFFI,
  EnergySwitchPKFFI,
  FullHealFFI,
  SeismitoadEx2FFI,
  LucarioEx2FFI,
  MLucarioEx2,
  DragoniteEx2,
  BattleReporter2,
  FossilResearcher2,
  MHeracrossEx2,
  MLucarioEx3,
  HeracrossExFFI105,
} from './other-prints';

export const setFuriousFists: Card[] = [
  // Pokemon
  new Accelgor(),
  new Amaura(),
  new Aurorus(),
  new Beartic(),
  new Bellsprout(),
  new Blaziken(),
  new Breloom(),
  new Clauncher(),
  new Clawitzer(),
  new Clefable(),
  new Clefairy(),
  new Clefairy2(),
  new Combusken(),
  new Cubchoo(),
  new Dedenne(),
  new DragoniteEx(),
  new Drapion(),
  new Drowzee(),
  new Eevee(),
  new Electabuzz(),
  new Electivire(),
  new Flygon(),
  new Glaceon(),
  new Golett(),
  new Golurk(),
  new Gothita(),
  new Gothitelle(),
  new Gothorita(),
  new Hariyama(),
  new Hawlucha(),
  new HawluchaEx(),
  new HeracrossEx(),
  new Hitmonchan(),
  new Hitmonlee(),
  new Hitmontop(),
  new Hypno(),
  new Jynx(),
  new Klefki(),
  new Landorus(),
  new Leafeon(),
  new Lickilicky(),
  new Lickitung(),
  new LucarioEx(),
  new MHeracrossEx(),
  new MLucarioEx(),
  new Machamp(),
  new Machoke(),
  new Machop(),
  new Magmar(),
  new Magmortar(),
  new Makuhita(),
  new Mienfoo(),
  new Mienshao(),
  new Minun(),
  new Noibat(),
  new Noivern(),
  new Pancham(),
  new Pancham2(),
  new Pangoro(),
  new Patrat(),
  new Pikachu(),
  new Plusle(),
  new Politoed(),
  new Poliwag(),
  new Poliwhirl(),
  new Poliwrath(),
  new Raichu(),
  new Scrafty(),
  new Scraggy(),
  new SeismitoadEx(),
  new Shelmet(),
  new Shroomish(),
  new Skorupi(),
  new Slaking(),
  new Slakoth(),
  new Sylveon(),
  new Thundurus(),
  new Torchic(),
  new Tornadus(),
  new Trapinch(),
  new Tyrantrum(),
  new Tyrunt(),
  new Vibrava(),
  new Victreebel(),
  new Vigoroth(),
  new Watchog(),
  new Weepinbell(),

  // Trainers
  new BattleReporter(),
  new FightingStadium(),
  new FocusSash(),
  new FossilResearcher(),
  new JawFossil(),
  new Korrina(),
  new MountainRing(),
  new SailFossil(),
  new SparklingRobe(),
  new ToolRetriever(),
  new TrainingCenter(),

  // Energy
  new HerbalEnergy(),
  new StrongEnergy(),

  // Other Prints (Reprints & Alt Arts)
  new KorrinaFFI(),
  new MaintenanceFFI(),
  new SuperScoopUpFFI(),
  new EnergySwitchPKFFI(),
  new FullHealFFI(),
  new HeracrossExFFI105(),
  new SeismitoadEx2FFI(),
  new LucarioEx2FFI(),
  new MLucarioEx2(),
  new DragoniteEx2(),
  new BattleReporter2(),
  new FossilResearcher2(),
  new MHeracrossEx2(),
  new MLucarioEx3(),
];
