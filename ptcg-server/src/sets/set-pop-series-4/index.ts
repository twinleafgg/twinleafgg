import { Card } from '../../game';
import { Chimecho } from './chimecho';
import { Combusken } from './combusken';
import { Deoxys } from './deoxys';
import { Deoxysex } from './deoxys-ex';
import { Flygon } from './flygon';
import { Grovyle } from './grovyle';
import { Mew } from './mew';
import { Mudkip } from './mudkip';
import { HealEnergyP4, SceptileP4, ScrambleEnergyP4 } from './other-prints';
import { Pidgey } from './pidgey';
import { Pikachu } from './pikachu';
import { PokemonFanClub } from './pokemon-fan-club';
import { Squirtle } from './squirtle';
import { Treecko } from './treecko';
import { Wobbuffet } from './wobbuffet';

export const setPOPSeries4: Card[] = [
  new Chimecho(),
  new Combusken(),
  new Deoxys(),
  new Deoxysex(),
  new Flygon(),
  new Grovyle(),
  new Mew(),
  new Mudkip(),
  new Pidgey(),
  new Pikachu(),
  new PokemonFanClub(),
  new Squirtle(),
  new Treecko(),
  new Wobbuffet(),

  // Other Prints
  new HealEnergyP4(),
  new SceptileP4(),
  new ScrambleEnergyP4(),
];
