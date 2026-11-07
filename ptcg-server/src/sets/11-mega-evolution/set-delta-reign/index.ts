import { Card } from '../../../game/store/card/card';
import { Aarune } from './aarune';
import { AdventuringLantern } from './adventuring-lantern';
import { Altaria } from './altaria';
import { Arcanine } from './arcanine';
import { Ariados } from './ariados';
import { Azurill } from './azurill';
import { Cacnea } from './cacnea';
import { Cacturne } from './cacturne';
import { Combee } from './combee';
import { CustomVest } from './custom-vest';
import { Cyclizar } from './cyclizar';
import { DeliciousRiceBalls } from './tasty-rice-ball';
import { Druddigon } from './druddigon';
import { Drowzee } from './drowzee';
import { Electabuzz } from './electabuzz';
import { Electivire } from './electivire';
import { Enamorus } from './enamorus';
import { Fletchinder } from './fletchinder';
import { Fletchling } from './fletchling';
import { Frillish } from './frillish';
import { Giratina } from './giratina';
import { Golett } from './golett';
import { Groudon } from './groudon';
import { Growlithe } from './growlithe';
import { HakamoO } from './hakamo-o';
import { Heatmor } from './heatmor';
import { HeatRotomex } from './heat-rotom-ex';
import { Heracross } from './heracross';
import { Hypno } from './hypno';
import { Inkay } from './inkay';
import { JangmoO } from './jangmo-o';
import { Jellicent } from './jellicent';
import { Kecleon } from './kecleon';
import { Kilowattrel } from './kilowattrel';
import { KommoO } from './kommo-o';
import { Kyogre } from './kyogre';
import { Landorus } from './landorus';
import { LegendaryLavaLakeLeft } from './legendary-lava-lake-left';
import { LegendaryLavaLakeRight } from './legendary-lava-lake-right';
import { LegendaryOceanTrenchLeft } from './legendary-ocean-trench-left';
import { LegendaryOceanTrenchRight } from './legendary-ocean-trench-right';
import { LegendarySummitLeft } from './legendary-summit-left';
import { LegendarySummitRight } from './legendary-summit-right';
import { Magmar } from './magmar';
import { Magmortar } from './magmortar';
import { Mantine } from './mantine';
import { Masquerain } from './masquerain';
import { MegaGolurkex } from './mega-golurk-ex';
import { MegaGolisopodex } from './mega-golisopod-ex';
import { MegaMalamarex } from './mega-malamar-ex';
import { MegaRayquazaCap } from './mega-rayquaza-cap';
import { MegaRayquazaex } from './mega-rayquaza-ex';
import {
  AaruneSIR,
  AaruneUR,
  AdventuringLanternUR,
  AltariaIR,
  AzurillIR,
  BubbleWaterEnergyUR,
  CustomVestUR,
  EeveeIR,
  ElectivireIR,
  EmceesHypeM6,
  EmceesHypeUR,
  EnamorusIR,
  GroudonIR,
  GrowingGrassEnergyUR,
  GrowlitheIR,
  HeatRotomexUR,
  InkayIR,
  KecleonIR,
  MagmortarIR,
  MasquerainIR,
  MegaGolisopodexSIR,
  MegaGolisopodexUR,
  MegaGolurkexSIR,
  MegaGolurkexUR,
  MegaMalamarexUR,
  MegaRayquazaexMHR,
  MegaRayquazaexSIR,
  NitroFireEnergyUR,
  PincurchinIR,
  PokemonCatcherUR,
  RaikouexSIR,
  RaikouexUR,
  SprigatitoIR,
  TalonflameexUR,
  TateAndLizasTrainingUR,
  WishiwashiexUR,
  ZinniasTrustSIR,
  ZinniasTrustUR,
  ZoruaIR,
} from './other-prints';
import { Nidoqueen } from './nidoqueen';
import { NidoranFemale } from './nidoran-f';
import { Nidorina } from './nidorina';
import { Onix } from './onix';
import { Pincurchin } from './pincurchin';
import { Raikouex } from './raikou-ex';
import { Sableye } from './sableye';
import { Sandshrew } from './sandshrew';
import { Sandslash } from './sandslash';
import { Spinarak } from './spinarak';
import { Steelix } from './steelix';
import { Surskit } from './surskit';
import { Swablu } from './swablu';
import { Talonflameex } from './talonflame-ex';
import { TateAndLizasTraining } from './tate-and-lizas-training';
import { Thundurus } from './thundurus';
import { Torkoal } from './torkoal';
import { Tornadus } from './tornadus';
import { Vespiquen } from './vespiquen';
import { Wattrel } from './wattrel';
import { Wimpod } from './wimpod';
import { Wishiwashiex } from './wishiwashi-ex';
import { ZinniasTrust } from './zinnias-trust';
import { Arboliva } from './arboliva';
import { Carvanha } from './carvanha';
import { Darkrai } from './darkrai';
import { Delibird } from './delibird';
import { Dolliv } from './dolliv';
import { Eevee } from './eevee';
import { Eeveeex } from './eevee-ex';
import { Floragato } from './floragato';
import { Jolteon } from './jolteon';
import { Liepard } from './liepard';
import { Meowscaradaex } from './meowscarada-ex';
import { Miraidon } from './miraidon';
import { Morpeko } from './morpeko';
import { Pawmi } from './pawmi';
import { Pawmo } from './pawmo';
import { Pawmot } from './pawmot';
import { Purrloin } from './purrloin';
import { Rotom } from './rotom';
import { Sharpedo } from './sharpedo';
import { Shaymin } from './shaymin';
import { Smoliv } from './smoliv';
import { Sprigatito } from './sprigatito';
import { Tauros } from './tauros';
import { Virizion } from './virizion';
import { Zarude } from './zarude';
import { Zoroarkex } from './zoroark-ex';
import { Zorua } from './zorua';

export const setDeltaReign: Card[] = [
  new Heracross(),
  new Surskit(),
  new Masquerain(),
  new Cacnea(),
  new Cacturne(),
  new Combee(),
  new Vespiquen(),
  new Wimpod(),
  new MegaGolisopodex(),
  new Growlithe(),
  new Arcanine(),
  new Magmar(),
  new Magmortar(),
  new Torkoal(),
  new HeatRotomex(),
  new Heatmor(),
  new Mantine(),
  new Kyogre(),
  new Frillish(),
  new Jellicent(),
  new Wishiwashiex(),
  new Electabuzz(),
  new Electivire(),
  new Raikouex(),
  new Thundurus(),
  new Pincurchin(),
  new Wattrel(),
  new Kilowattrel(),
  new Drowzee(),
  new Hypno(),
  new Giratina(),
  new Golett(),
  new MegaGolurkex(),
  new Enamorus(),
  new Sandshrew(),
  new Sandslash(),
  new Onix(),
  new Steelix(),
  new Groudon(),
  new Landorus(),
  new NidoranFemale(),
  new Nidorina(),
  new Nidoqueen(),
  new Spinarak(),
  new Ariados(),
  new Sableye(),
  new Inkay(),
  new MegaMalamarex(),
  new Druddigon(),
  new JangmoO(),
  new HakamoO(),
  new KommoO(),
  new Cyclizar(),
  new Azurill(),
  new Swablu(),
  new Altaria(),
  new Kecleon(),
  new MegaRayquazaex(),
  new Tornadus(),
  new Fletchling(),
  new Fletchinder(),
  new Talonflameex(),
  new DeliciousRiceBalls(),
  new AdventuringLantern(),
  new CustomVest(),
  new MegaRayquazaCap(),
  new Aarune(),
  new EmceesHypeM6(),
  new ZinniasTrust(),
  new TateAndLizasTraining(),
  new LegendaryOceanTrenchLeft(),
  new LegendaryOceanTrenchRight(),
  new LegendarySummitLeft(),
  new LegendarySummitRight(),
  new LegendaryLavaLakeLeft(),
  new LegendaryLavaLakeRight(),
    new Eevee(),
  new Jolteon(),
  new Pawmi(),
  new Pawmo(),
  new Pawmot(),
  new Eeveeex(),
  new Delibird(),
  new Sprigatito(),
  new Floragato(),
  new Meowscaradaex(),
  new Smoliv(),
  new Dolliv(),
  new Arboliva(),
  new Carvanha(),
  new Sharpedo(),
  new Darkrai(),
  new Purrloin(),
  new Liepard(),
  new Zorua(),
  new Zoroarkex(),
  new Morpeko(),
  new Zarude(),
  new Shaymin(),
  new Virizion(),
  new Rotom(),
  new Miraidon(),
  new Tauros(),

  // Other Prints
  new MasquerainIR(), // 104
  new SprigatitoIR(), // 105
  new GrowlitheIR(), // 106
  new MagmortarIR(), // 107
  new ElectivireIR(), // 108
  new PincurchinIR(), // 109
  new EnamorusIR(), // 110
  new GroudonIR(), // 111
  new ZoruaIR(), // 112
  new InkayIR(), // 113
  new EeveeIR(), // 114
  new AzurillIR(), // 115
  new AltariaIR(), // 116
  new KecleonIR(), // 117
  new MegaGolisopodexUR(), // 118
  new HeatRotomexUR(), // 119
  new WishiwashiexUR(), // 120
  new RaikouexUR(), // 121
  new MegaGolurkexUR(), // 122
  new MegaMalamarexUR(), // 123
  new TalonflameexUR(), // 124
  new AaruneUR(), // 125
  new AdventuringLanternUR(), // 126
  new CustomVestUR(), // 127
  new EmceesHypeUR(), // 128
  new PokemonCatcherUR(), // 129
  new TateAndLizasTrainingUR(), // 130
  new ZinniasTrustUR(), // 131
  new BubbleWaterEnergyUR(), // 132
  new GrowingGrassEnergyUR(), // 133
  new NitroFireEnergyUR(), // 134
  new MegaGolisopodexSIR(), // 135
  new RaikouexSIR(), // 136
  new MegaGolurkexSIR(), // 137
  new MegaRayquazaexSIR(), // 138
  new AaruneSIR(), // 139
  new ZinniasTrustSIR(), // 140
  new MegaRayquazaexMHR(), // 141
];
