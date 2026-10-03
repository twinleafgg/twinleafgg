import { Card } from '../../game/store/card/card';
import { AlolanVulpix } from './alolan-vulpix';
import { Altaria } from './altaria';
import { AltariaGx } from './altaria-gx';
import { Arbok } from './arbok';
import { Butterfree } from './butterfree';
import { Caterpie } from './caterpie';
import { Chansey } from './chansey';
import { CharizardGx2 } from './charizard-gx-2';
import { Charmander } from './charmander';
import { Charmeleon } from './charmeleon';
import { Clefable } from './clefable';
import { Clefairy } from './clefairy';
import { Clefairy2 } from './clefairy-2';
import { Cubone } from './cubone';
import { Eevee2 } from './eevee-2';
import { Eevee3 } from './eevee-3';
import { Ekans } from './ekans';
import { Ekans2 } from './ekans-2';
import { Electrode } from './electrode';
import { Farfetchd } from './farfetchd';
import { Geodude } from './geodude';
import { Golem } from './golem';
import { Graveler } from './graveler';
import { GyaradosGx } from './gyarados-gx';
import { HoOhGx } from './ho-oh-gx';
import { Jigglypuff } from './jigglypuff';
import { Jolteon } from './jolteon';
import { Jynx } from './jynx';
import { Kangaskhan } from './kangaskhan';
import { Kirlia } from './kirlia';
import { Koffing } from './koffing';
import { Lapras } from './lapras';
import { LeafeonGx } from './leafeon-gx';
import { LycanrocGx2 } from './lycanroc-gx-2';
import { Magikarp } from './magikarp';
import { Magmar } from './magmar';
import { Metapod } from './metapod';
import { Mew } from './mew';
import { MewtwoGx2 } from './mewtwo-gx-2';
import { MoltresZapdosArticunoGX } from './moltres-zapdos-articuno-gx';
import { MrMime } from './mr-mime';
import { NihilegoGx } from './nihilego-gx';
import { OnixGx } from './onix-gx';
import { Paras } from './paras';
import { PinsirGx } from './pinsir-gx';
import { Psyduck } from './psyduck';
import { RaichuGx } from './raichu-gx';
import { ReshiramGx } from './reshiram-gx';
import { ScizorGx } from './scizor-gx';
import { Scyther2 } from './scyther-2';
import { Seviper } from './seviper';
import { WooperSV, QuagsireSV } from './shiny-vault';
import { Snorlax } from './snorlax';
import { StakatakaGx } from './stakataka-gx';
import { StarmieGx } from './starmie-gx';
import { Vaporeon } from './vaporeon';
import { Voltorb } from './voltorb';
import { Voltorb2 } from './voltorb-2';
import { Weezing } from './weezing';
import { WigglytuffGx } from './wigglytuff-gx';
import { Wimpod } from './wimpod';
import { XurkitreeGx } from './xurkitree-gx';
import { Zapdos } from './zapdos';
import { BrocksPewterCityGym } from './brocks-pewter-city-gym';
import { BrocksTraining } from './brocks-training';
import { ErikasHospitality } from './erikas-hospitality';
import { JessieAndJames } from './jessie-and-james';
import { MistysCeruleanCityGym } from './mistys-cerulean-city-gym';
import { MistysWaterCommand } from './mistys-water-command';

import {
  BrocksGritHIF,
  GuzmaHIF,
  SlowpokeHIF,
  BillsAnalysisHIF,
  LtSurgesStrategyHIF,
  MoltresZapdosArticunoGX2HIF,
  MoltresZapdosArticunoGX3HIF,
  RowletHIF,
  DartrixHIF,
  FroakieFrubblesHIF,
  FrogadierHIF,
  ShuppetHIF,
  InkayHIF,
  MalamarHIF,
  PoipoleHIF,
  SudowoodoHIF,
  RioluHIF,
  LucarioHIF,
  RockruffHIF,
  BuzzwoleHIF,
  ZoruaHIF,
  MagnezoneHIF,
  RaltsHIF,
  DiancieHIF,
  GibleHIF,
  GabiteHIF,
  GarchompHIF,
  Eevee3HIF,
  NoibatHIF,
  OranguruHIF,
  DecidueyeGXHIF,
  AlolanNinetalesGXHIF,
  ArticunoGXHIF,
  GlaceonGXHIF,
  GreninjaGXHIF,
  ElectrodeGXHIF,
  MewtwoGX2HIF,
  EspeonGXHIF,
  BanetteGXHIF,
  NaganadelGXHIF,
  LucarioGXHIF,
  LycanrocGXHIF,
  BuzzwoleGXHIF,
  DarkraiGXHIF,
  GuzzlordGXHIF,
  KartanaGXHIF,
  GardevoirGXHIF,
  SylveonGXHIF,
  NoivernGXHIF,
  SilvallyGXHIF,
  DrampaGXHIF,
  CynthiaHIF,
  FishermanHSHIF,
  LadyFLIHIF,
  AetherParadiseConvserationAreaHIF,
  BrookletHillHIF,
  MtCoronetHIF,
  ShrineOfPunishmentHIF,
  TapuBuluGXHIF,
  TapuFiniGXHIF,
  TapuKokoGXHIF,
  TapuLeleGXHIF,
  CharizardGXHIF,
  ScytherHIF,
  PheromosaHIF,
  XurkitreeHIF,
  GuzzlordHIF,
  MagnemiteHIF,
  MagnetonHIF,
  BeldumHIF,
  MetangHIF,
  CelesteelaHIF,
  KartanaHIF,
  SwabluHIF,
  TypeNullHIF,
  GolisopodGxHIF,
  TurtonatorGxHIF,
  ZygardeGxHIF,
  UmbreonGxHIF,
  AetherFoundationEmployeeHIF,
  HikerHIF,
  CharmeleonHIF,
  StaryuHIF,
  PikachuHIF,
  BlainesLastStandHIF,
  GiovannisExileHIF,
  KogasTrapHIF,
  MistysDeterminationHIF,
  PokemonCenterLadyHIF,
  SabrinasSuggestionHIF,
  GiovannisExile2,
  JessieAndJames2,
} from './other-prints';

export const setHiddenFates: Card[] = [
  // Pokemon
  new AlolanVulpix(),
  new Altaria(),
  new AltariaGx(),
  new Arbok(),
  new Butterfree(),
  new Caterpie(),
  new Chansey(),
  new CharizardGx2(),
  new Charmander(),
  new Charmeleon(),
  new Clefable(),
  new Clefairy(),
  new Clefairy2(),
  new Cubone(),
  new Eevee2(),
  new Eevee3(),
  new Ekans(),
  new Ekans2(),
  new Electrode(),
  new Farfetchd(),
  new Geodude(),
  new Golem(),
  new Graveler(),
  new GyaradosGx(),
  new HoOhGx(),
  new Jigglypuff(),
  new Jolteon(),
  new Jynx(),
  new Kangaskhan(),
  new Kirlia(),
  new Koffing(),
  new Lapras(),
  new LeafeonGx(),
  new LycanrocGx2(),
  new Magikarp(),
  new Magmar(),
  new Metapod(),
  new Mew(),
  new MewtwoGx2(),
  new MoltresZapdosArticunoGX(),
  new MrMime(),
  new NihilegoGx(),
  new OnixGx(),
  new Paras(),
  new PinsirGx(),
  new Psyduck(),
  new QuagsireSV(),
  new RaichuGx(),
  new ReshiramGx(),
  new ScizorGx(),
  new Scyther2(),
  new Seviper(),
  new WooperSV(),
  new Snorlax(),
  new StakatakaGx(),
  new StarmieGx(),
  new Vaporeon(),
  new Voltorb(),
  new Voltorb2(),
  new Weezing(),
  new WigglytuffGx(),
  new Wimpod(),
  new XurkitreeGx(),
  new Zapdos(),

  // Trainers
  new BrocksPewterCityGym(),
  new BrocksTraining(),
  new ErikasHospitality(),
  new JessieAndJames(),
  new MistysCeruleanCityGym(),
  new MistysWaterCommand(),

  // Other Prints (Reprints & Alt Arts)
  new BrocksGritHIF(),
  new GuzmaHIF(),
  new SlowpokeHIF(),
  new BillsAnalysisHIF(),
  new LtSurgesStrategyHIF(),
  new MoltresZapdosArticunoGX2HIF(),
  new MoltresZapdosArticunoGX3HIF(),
  new RowletHIF(),
  new DartrixHIF(),
  new FroakieFrubblesHIF(),
  new FrogadierHIF(),
  new ShuppetHIF(),
  new InkayHIF(),
  new MalamarHIF(),
  new PoipoleHIF(),
  new SudowoodoHIF(),
  new RioluHIF(),
  new LucarioHIF(),
  new RockruffHIF(),
  new BuzzwoleHIF(),
  new ZoruaHIF(),
  new MagnezoneHIF(),
  new RaltsHIF(),
  new DiancieHIF(),
  new GibleHIF(),
  new GabiteHIF(),
  new GarchompHIF(),
  new Eevee3HIF(),
  new NoibatHIF(),
  new OranguruHIF(),
  new DecidueyeGXHIF(),
  new AlolanNinetalesGXHIF(),
  new ArticunoGXHIF(),
  new GlaceonGXHIF(),
  new GreninjaGXHIF(),
  new ElectrodeGXHIF(),
  new MewtwoGX2HIF(),
  new EspeonGXHIF(),
  new BanetteGXHIF(),
  new NaganadelGXHIF(),
  new LucarioGXHIF(),
  new LycanrocGXHIF(),
  new BuzzwoleGXHIF(),
  new DarkraiGXHIF(),
  new GuzzlordGXHIF(),
  new KartanaGXHIF(),
  new GardevoirGXHIF(),
  new SylveonGXHIF(),
  new NoivernGXHIF(),
  new SilvallyGXHIF(),
  new DrampaGXHIF(),
  new CynthiaHIF(),
  new FishermanHSHIF(),
  new LadyFLIHIF(),
  new AetherParadiseConvserationAreaHIF(),
  new BrookletHillHIF(),
  new MtCoronetHIF(),
  new ShrineOfPunishmentHIF(),
  new TapuBuluGXHIF(),
  new TapuFiniGXHIF(),
  new TapuKokoGXHIF(),
  new TapuLeleGXHIF(),
  new CharizardGXHIF(),
  new ScytherHIF(),
  new PheromosaHIF(),
  new XurkitreeHIF(),
  new GuzzlordHIF(),
  new MagnemiteHIF(),
  new MagnetonHIF(),
  new BeldumHIF(),
  new MetangHIF(),
  new CelesteelaHIF(),
  new KartanaHIF(),
  new SwabluHIF(),
  new TypeNullHIF(),
  new GolisopodGxHIF(),
  new TurtonatorGxHIF(),
  new ZygardeGxHIF(),
  new UmbreonGxHIF(),
  new AetherFoundationEmployeeHIF(),
  new HikerHIF(),
  new CharmeleonHIF(),
  new StaryuHIF(),
  new PikachuHIF(),
  new BlainesLastStandHIF(),
  new GiovannisExileHIF(),
  new KogasTrapHIF(),
  new MistysDeterminationHIF(),
  new PokemonCenterLadyHIF(),
  new SabrinasSuggestionHIF(),
  new GiovannisExile2(),
  new JessieAndJames2(),
];
