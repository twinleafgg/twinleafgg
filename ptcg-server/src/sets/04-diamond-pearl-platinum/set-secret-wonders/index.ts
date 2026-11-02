import { Absol } from './absol';
import { Ampharos } from './ampharos';
import { Arcanine } from './arcanine';
import { Bagon } from './bagon';
import { Banette } from './banette';
import { BebesSearchSW, PlusPowerSW, PotionSW, SwitchSW, DarknessEnergySpecialSW, MetalEnergyN1SW, ProfessorRowanSW, RivalSW } from './other-prints';
import { Card } from '../../../game/store/card/card';
import { Blastoise } from './blastoise';
import { Breloom } from './breloom';
import { Bulbasaur } from './bulbasaur';
import { BurmyPlantCloak } from './burmy-plant-cloak';
import { BurmySandyCloak } from './burmy-sandy-cloak';
import { BurmyTrashCloak } from './burmy-trash-cloak';
import { Carvanha } from './carvanha';
import { Charizard } from './charizard';
import { Charmander } from './charmander';
import { Charmeleon } from './charmeleon';
import { Clefairy } from './clefairy';
import { Cloyster } from './cloyster';
import { Corsola } from './corsola';
import { Diglett } from './diglett';
import { Donphan } from './donphan';
import { Dugtrio } from './dugtrio';
import { Duskull } from './duskull';
import { Electabuzz } from './electabuzz';
import { Electivire } from './electivire';
import { Electrode } from './electrode';
import { Entei } from './entei';
import { Farfetchd } from './farfetchd';
import { Flaaffy } from './flaaffy';
import { Flygon } from './flygon';
import { Furret } from './furret';
import { Gallade } from './gallade';
import { Gardevoir } from './gardevoir';
import { GardevoirLVX } from './gardevoir-lv-x';
import { GastrodonEastSea } from './gastrodon-east-sea';
import { GastrodonWestSea } from './gastrodon-west-sea';
import { Golduck } from './golduck';
import { Golem } from './golem';
import { Grimer } from './grimer';
import { Growlithe } from './growlithe';
import { HonchkrowLVX } from './honchkrow-lvx';
import { HoOh } from './ho-oh';
import { Hoppip } from './hoppip';
import { Ivysaur } from './ivysaur';
import { Jumpluff } from './jumpluff';
import { Jynx } from './jynx';
import { Kecleon } from './kecleon';
import { Kirlia } from './kirlia';
import { Lickilicky } from './lickilicky';
import { Lickitung } from './lickitung';
import { Lombre } from './lombre';
import { Lotad } from './lotad';
import { Ludicolo } from './ludicolo';
import { Lugia } from './lugia';
import { Magmar } from './magmar';
import { Magmortar } from './magmortar';
import { Mareep } from './mareep';
import { Mew } from './mew';
import { Miltank } from './miltank';
import { Minun } from './minun';
import { Mothim } from './mothim';
import { Muk } from './muk';
import { Murkrow } from './murkrow';
import { Natu } from './natu';
import { Nidoking } from './nidoking';
import { Nidoran } from './nidoran';
import { Nidorino } from './nidorino';
import { Phanpy } from './phanpy';
import { Pidgeot } from './pidgeot';
import { Pidgeotto } from './pidgeotto';
import { Pidgey } from './pidgey';
import { Pinsir } from './pinsir';
import { Plusle } from './plusle';
import { ProfessorOaksVisit } from './professor-oaks-visit';
import { Psyduck } from './psyduck';
import { Quagsire } from './quagsire';
import { Qwilfish } from './qwilfish';
import { Raikou } from './raikou';
import { Ralts } from './ralts';
import { Raticate } from './raticate';
import { Rattata } from './rattata';
import { RoseannesResearch } from './roseannes-research';
import { Roselia } from './roselia';
import { Roserade } from './roserade';
import { Sableye } from './sableye';
import { Salamence } from './salamence';
import { Sentret } from './sentret';
import { Sharpedo } from './sharpedo';
import { Shelgon } from './shelgon';
import { Shellder } from './shellder';
import { ShellosEastSea } from './shellos-east-sea';
import { ShellosWestSea } from './shellos-west-sea';
import { Shroomish } from './shroomish';
import { Shuckle } from './shuckle';
import { Shuppet } from './shuppet';
import { Skiploom } from './skiploom';
import { Smeargle } from './smeargle';
import { Smoochum } from './smoochum';
import { Spinda } from './spinda';
import { Squirtle } from './squirtle';
import { Stantler } from './stantler';
import { Suicune } from './suicune';
import { Sunflora } from './sunflora';
import { Sunkern } from './sunkern';
import { TeamGalacticsMars } from './team-galactics-mars';
import { Trapinch } from './trapinch';

// Other Prints
import { NightMaintenanceSW } from './other-prints';

import { UnownK } from './unown-k';
import { UnownN } from './unown-n';
import { UnownO } from './unown-o';
import { UnownS } from './unown-s';
import { UnownX } from './unown-x';
import { UnownZ } from './unown-z';
import { Venomoth } from './venomoth';
import { Venonat } from './venonat';
import { Venusaur } from './venusaur';
import { Vibrava } from './vibrava';
import { Voltorb } from './voltorb';
import { Wartortle } from './wartortle';
import { Weavile } from './weavile';
import { Wooper } from './wooper';
import { WormadamPlantCloak } from './wormadam-plant-cloak';
import { WormadamSandyCloak } from './wormadam-sandy-cloak';
import { WormadamTrashCloak } from './wormadam-trash-cloak';
import { Xatu } from './xatu';
export const setSecretWonders: Card[] = [
  new Absol(),
  new Ampharos(),
  new Arcanine(),
  new Bagon(),
  new Banette(),
  new Blastoise(),
  new Breloom(),
  new Bulbasaur(),
  new BurmyPlantCloak(),
  new BurmySandyCloak(),
  new BurmyTrashCloak(),
  new Carvanha(),
  new Charizard(),
  new Charmander(),
  new Charmeleon(),
  new Clefairy(),
  new Cloyster(),
  new Corsola(),
  new Diglett(),
  new Donphan(),
  new Dugtrio(),
  new Duskull(),
  new Electabuzz(),
  new Electivire(),
  new Electrode(),
  new Entei(),
  new Farfetchd(),
  new Flaaffy(),
  new Flygon(),
  new Furret(),
  new Gallade(),
  new GastrodonEastSea(),
  new GastrodonWestSea(),
  new Golduck(),
  new Golem(),
  new Grimer(),
  new Growlithe(),
  new HonchkrowLVX(),
  new HoOh(),
  new Ivysaur(),
  new Jumpluff(),
  new Jynx(),
  new Kecleon(),
  new Lickilicky(),
  new Lickitung(),
  new Lombre(),
  new Lotad(),
  new Ludicolo(),
  new Lugia(),
  new Magmar(),
  new Magmortar(),
  new Mareep(),
  new Mew(),
  new Miltank(),
  new Minun(),
  new Mothim(),
  new Muk(),
  new Murkrow(),
  new Natu(),
  new Nidoking(),
  new Nidoran(),
  new Nidorino(),
  new Phanpy(),
  new Pidgeot(),
  new Pidgeotto(),
  new Pidgey(),
  new Pinsir(),
  new Plusle(),
  new ProfessorOaksVisit(),
  new ProfessorRowanSW(),
  new Psyduck(),
  new Quagsire(),
  new Qwilfish(),
  new Raikou(),
  new Ralts(),
  new Kirlia(),
  new Gardevoir(),
  new GardevoirLVX(),
  new Hoppip(),
  new Raticate(),
  new Rattata(),
  new RivalSW(),
  new RoseannesResearch(),
  new Roselia(),
  new Roserade(),
  new Sableye(),
  new Salamence(),
  new Sentret(),
  new Sharpedo(),
  new Shelgon(),
  new Shellder(),
  new ShellosEastSea(),
  new ShellosWestSea(),
  new Shroomish(),
  new Shuckle(),
  new Shuppet(),
  new Skiploom(),
  new Smeargle(),
  new Smoochum(),
  new Spinda(),
  new Squirtle(),
  new Stantler(),
  new Suicune(),
  new Sunflora(),
  new Sunkern(),
  new TeamGalacticsMars(),
  new Trapinch(),

  new UnownK(),
  new UnownN(),
  new UnownO(),
  new UnownS(),
  new UnownX(),
  new UnownZ(),
  new Venomoth(),
  new Venonat(),
  new Venusaur(),
  new Vibrava(),
  new Voltorb(),
  new Wartortle(),
  new Weavile(),
  new Wooper(),
  new WormadamPlantCloak(),
  new WormadamSandyCloak(),
  new WormadamTrashCloak(),
  new Xatu(),
  // Other Prints
  new NightMaintenanceSW(),
  new BebesSearchSW(),
  new PlusPowerSW(),
  new PotionSW(),
  new SwitchSW(),
  new DarknessEnergySpecialSW(),
  new MetalEnergyN1SW(),
];