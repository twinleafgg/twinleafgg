import { Format } from './card-types';
import { TrainerCard } from './trainer-card';
import { StoreLike } from '../store-like';
import { State } from '../state/state';
import { Effect } from '../effects/effect';
import { Player } from '../state/player';

import { GreatBall as GreatBallRG } from '../../../sets/03-ex-ruby-and-sapphire/set-ex-firered-leafgreen/great-ball';
import { GreatBall as GreatBallPAL } from '../../../sets/10-scarlet-and-violet/set-paldea-evolved/great-ball';
import { MasterBall as MasterBallDX } from '../../../sets/03-ex-ruby-and-sapphire/set-ex-deoxys/master-ball';
import { MasterBall as MasterBallTEF } from '../../../sets/10-scarlet-and-violet/set-temporal-forces/master-ball';
import { PokemonFanClub as PokemonFanClubP4 } from '../../../sets/set-pop-series-4/pokemon-fan-club';
import { PokemonFanClub as PokemonFanClubUPR } from '../../../sets/08-sun-and-moon/set-ultra-prism/pokemon-fan-club';
// import { QuickBall as QuickBallMD } from '../../../sets/set-majestic-dawn/quick-ball';
// import { QuickBall as QuickBallSSH } from '../../../sets/set-sword-and-shield/quick-ball';
import { RareCandy as RareCandyHP } from '../../../sets/03-ex-ruby-and-sapphire/set-ex-holon-phantoms/rare-candy';
import { RareCandy as RareCandySVI } from '../../../sets/10-scarlet-and-violet/set-scarlet-and-violet/rare-candy';
// import { SuperRod as SuperRodNVI } from '../../../sets/set-noble-victories/super-rod';
// import { SuperRod as SuperRodPAL } from '../../../sets/set-paldea-evolved/super-rod';
import { PokemonCatcher as PokemonCatcherEPO } from '../../../sets/06-black-and-white/set-emerging-powers/pokemon-catcher';
import { PokemonCatcher as PokemonCatcherSVI } from '../../../sets/10-scarlet-and-violet/set-scarlet-and-violet/pokemon-catcher';

type ReduceEffectFn = (this: TrainerCard, store: StoreLike, state: State, effect: Effect) => State;
type CanPlayFn = (this: TrainerCard, store: StoreLike, state: State, player: Player) => boolean | undefined;

const effectOverrides: {
  [cardKey: string]: {
    [format: number]: ReduceEffectFn
  } & {
    default?: ReduceEffectFn
  }
} = {
  // 'Super Rod': {
  //   [Format.RETRO]: SuperRodNVI.prototype.reduceEffect,
  //   default: SuperRodPAL.prototype.reduceEffect
  // }
  'Great Ball': {
    [Format.RSPK]: GreatBallRG.prototype.reduceEffect,
    default: GreatBallPAL.prototype.reduceEffect
  },
  'Master Ball': {
    [Format.RSPK]: MasterBallDX.prototype.reduceEffect,
    default: MasterBallTEF.prototype.reduceEffect
  },
  'Pokémon Fan Club': {
    [Format.RSPK]: PokemonFanClubP4.prototype.reduceEffect,
    default: PokemonFanClubUPR.prototype.reduceEffect
  },
  'Rare Candy': {
    [Format.RSPK]: RareCandyHP.prototype.reduceEffect,
    default: RareCandySVI.prototype.reduceEffect
  },
  // 'Quick Ball': {
  //   [Format.DP]: QuickBallMD.prototype.reduceEffect,
  //   default: QuickBallSSH.prototype.reduceEffect
  // },
  'Pokémon Catcher': {
    [Format.BW]: PokemonCatcherEPO.prototype.reduceEffect,
    default: PokemonCatcherSVI.prototype.reduceEffect
  },
};

// Playability must follow the same format override as reduceEffect. Many reprints
// (e.g. Rare Candy MEG) extend an older class that has no canPlay, so without this
// Items are always marked unplayable even when the overridden effect is legal.
const canPlayOverrides: {
  [cardKey: string]: {
    [format: number]: CanPlayFn | undefined
  } & {
    default?: CanPlayFn
  }
} = {
  'Rare Candy': {
    [Format.RSPK]: RareCandyHP.prototype.canPlay,
    default: RareCandySVI.prototype.canPlay,
  },
};

function resolveOverride<T>(
  map: { [cardKey: string]: { [format: number]: T | undefined } & { default?: T } },
  card: TrainerCard,
  format: Format,
): T | undefined {
  const overrides = map[card.name];
  if (!overrides) {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(overrides, format)) {
    return overrides[format];
  }
  return overrides.default;
}

export function getOverriddenReduceEffect(card: TrainerCard, format: Format) {
  const override = resolveOverride(effectOverrides, card, format);
  return override ? override.bind(card) : undefined;
}

export function getOverriddenCanPlay(card: TrainerCard, format: Format) {
  const override = resolveOverride(canPlayOverrides, card, format);
  return override ? override.bind(card) : undefined;
}