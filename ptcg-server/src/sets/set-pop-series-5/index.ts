import { Card } from '../../game';
import { Charmander } from './charmander';
import { Charmeleon } from './charmeleon';
import { EspeonStar } from './espeon-star';
import { HoOh } from './ho-oh';
import { Lugia } from './lugia';
import { Meowth } from './meowth';
import { Mew } from './mew';
import { BillsMaintenanceP5, BoostEnergyP5, DeltaRainbowEnergyP5, DoubleRainbowEnergyP5, RareCandyP5 } from './other-prints';
import { Pelipper } from './pelipper';
import { Pikachu } from './pikachu';
import { UmbreonStar } from './umbreon-star';
import { Zangoose } from './zangoose';

export const setPOPSeries5: Card[] = [
  new Charmander(),
  new Charmeleon(),
  new EspeonStar(),
  new HoOh(),
  new Lugia(),
  new Meowth(),
  new Mew(),
  new Pelipper(),
  new Pikachu(),
  new UmbreonStar(),
  new Zangoose(),

  // Other Prints
  new BillsMaintenanceP5(),
  new BoostEnergyP5(),
  new DeltaRainbowEnergyP5(),
  new DoubleRainbowEnergyP5(),
  new RareCandyP5(),
];
