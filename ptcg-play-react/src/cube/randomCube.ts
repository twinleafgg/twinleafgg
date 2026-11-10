import type { Card, PokemonCard } from 'ptcg-server';
import { EnergyType, Stage, SuperType } from 'ptcg-server';
import { SetReleaseDates } from '../deck-editor/formatValidator';
import { isBasicEnergy } from '../deck-editor/deckRules';
import { CUBE_MAX_COPIES } from './types';

/** Target share of the cube that should be Trainer cards. */
export const CUBE_RANDOM_TRAINER_RATIO = 0.35;

export type RandomCubeOptions = {
  count: number;
  /** Inclusive start set code (chronological). Empty = earliest. */
  fromSet?: string | null;
  /** Inclusive end set code (chronological). Empty = latest. */
  toSet?: string | null;
  /** When false, Pokémon are added as complete evolution lines. */
  mutantEvolution?: boolean;
  /**
   * When true, at most one printing of each card name is included.
   * When false (default), may add multiple printings and up to 4 copies of a printing.
   */
  singleton?: boolean;
  rng?: () => number;
};

function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function releaseTime(setCode: string): number {
  const date = SetReleaseDates[setCode];
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

/** Unique set codes from the catalog, ordered by release date then code. */
export function orderedSetCodesByRelease(cards: Card[]): string[] {
  const codes = new Set<string>();
  for (const card of cards) {
    if (card.set) {
      codes.add(card.set);
    }
  }
  return Array.from(codes).sort((a, b) => {
    const byDate = releaseTime(a) - releaseTime(b);
    if (byDate !== 0) {
      return byDate;
    }
    return a.localeCompare(b);
  });
}

export function setCodesInRange(
  orderedSets: string[],
  fromSet?: string | null,
  toSet?: string | null,
): Set<string> {
  if (orderedSets.length === 0) {
    return new Set();
  }
  let fromIdx = fromSet ? orderedSets.indexOf(fromSet) : 0;
  let toIdx = toSet ? orderedSets.indexOf(toSet) : orderedSets.length - 1;
  if (fromIdx < 0) {
    fromIdx = 0;
  }
  if (toIdx < 0) {
    toIdx = orderedSets.length - 1;
  }
  if (fromIdx > toIdx) {
    [fromIdx, toIdx] = [toIdx, fromIdx];
  }
  return new Set(orderedSets.slice(fromIdx, toIdx + 1));
}

function isSpecialEnergy(card: Card): boolean {
  return card.superType === SuperType.ENERGY && (card as { energyType?: EnergyType }).energyType === EnergyType.SPECIAL;
}

function isTrainer(card: Card): boolean {
  return card.superType === SuperType.TRAINER;
}

function isPokemon(card: Card): boolean {
  return card.superType === SuperType.POKEMON;
}

/** Prefer one printing per card name within the allowed sets (earliest set, then set number). */
function preferPrinting(a: Card, b: Card): Card {
  const dateDiff = releaseTime(a.set) - releaseTime(b.set);
  if (dateDiff !== 0) {
    return dateDiff < 0 ? a : b;
  }
  const an = Number.parseInt(a.setNumber, 10);
  const bn = Number.parseInt(b.setNumber, 10);
  if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) {
    return an < bn ? a : b;
  }
  return a.fullName.localeCompare(b.fullName) <= 0 ? a : b;
}

function uniqueByName(cards: Card[]): Card[] {
  const byName = new Map<string, Card>();
  for (const card of cards) {
    if (!card.name || !card.fullName) {
      continue;
    }
    const existing = byName.get(card.name);
    byName.set(card.name, existing ? preferPrinting(existing, card) : card);
  }
  return Array.from(byName.values());
}

function uniqueByFullName(cards: Card[]): Card[] {
  const map = new Map<string, Card>();
  for (const card of cards) {
    if (card.fullName && !map.has(card.fullName)) {
      map.set(card.fullName, card);
    }
  }
  return Array.from(map.values());
}

function isStandardStage(pokemon: PokemonCard): boolean {
  return (
    pokemon.stage === Stage.BASIC ||
    pokemon.stage === Stage.STAGE_1 ||
    pokemon.stage === Stage.STAGE_2
  );
}

function findParentInPool(
  evolvesFrom: string,
  byName: Map<string, PokemonCard>,
): PokemonCard | undefined {
  if (!evolvesFrom) {
    return undefined;
  }
  const exact = byName.get(evolvesFrom);
  if (exact) {
    return exact;
  }
  // "Eevee ex" still counts as the parent of cards that evolve from "Eevee".
  for (const [name, card] of byName) {
    if (name.startsWith(`${evolvesFrom} `)) {
      return card;
    }
  }
  return undefined;
}

function childrenOf(
  parent: PokemonCard,
  byParent: Map<string, PokemonCard[]>,
): PokemonCard[] {
  const exact = byParent.get(parent.name) ?? [];
  // Also catch cards whose evolvesFrom is a prefix of this parent's name.
  const prefixHits: PokemonCard[] = [];
  for (const [from, kids] of byParent) {
    if (from === parent.name) {
      continue;
    }
    if (parent.name.startsWith(`${from} `)) {
      prefixHits.push(...kids);
    }
  }
  const seen = new Set<string>();
  const merged: PokemonCard[] = [];
  for (const kid of [...exact, ...prefixHits]) {
    if (seen.has(kid.name)) {
      continue;
    }
    seen.add(kid.name);
    merged.push(kid);
  }
  return merged;
}

/**
 * Build complete evolution lines from a name-unique Pokémon pool.
 * Only emits BASIC-rooted chains (one line per branch). Stage 1/2 whose prior
 * evolution is missing from the pool are dropped — never returned alone.
 * Non-standard stages (VMAX, BREAK, …) are returned as singletons.
 */
export function buildEvolutionLines(pokemonCards: Card[]): Card[][] {
  const pokemon = pokemonCards.filter(
    (card): card is PokemonCard & Card => isPokemon(card) && isStandardStage(card as PokemonCard),
  ) as PokemonCard[];
  const byName = new Map(pokemon.map((card) => [card.name, card]));
  const byParent = new Map<string, PokemonCard[]>();
  for (const card of pokemon) {
    if (!card.evolvesFrom) {
      continue;
    }
    const list = byParent.get(card.evolvesFrom) ?? [];
    list.push(card);
    byParent.set(card.evolvesFrom, list);
  }

  const lines: Card[][] = [];
  const covered = new Set<string>();

  const basics = pokemon.filter((card) => card.stage === Stage.BASIC);
  for (const basic of basics) {
    covered.add(basic.name);
    const stage1s = childrenOf(basic, byParent).filter((c) => c.stage === Stage.STAGE_1);

    if (stage1s.length === 0) {
      lines.push([basic]);
      continue;
    }

    for (const stage1 of stage1s) {
      covered.add(stage1.name);
      const stage2s = childrenOf(stage1, byParent).filter((c) => c.stage === Stage.STAGE_2);
      if (stage2s.length === 0) {
        lines.push([basic, stage1]);
        continue;
      }
      for (const stage2 of stage2s) {
        covered.add(stage2.name);
        lines.push([basic, stage1, stage2]);
      }
    }
  }

  // Stage 1/2 whose Basic (or Stage 1) is missing from this pool are intentionally
  // omitted — including them would put incomplete evolution lines in the cube.

  // Non-standard stages (VMAX, BREAK, …) as singletons.
  for (const card of pokemonCards) {
    if (!isPokemon(card)) {
      continue;
    }
    const poke = card as PokemonCard;
    if (isStandardStage(poke)) {
      continue;
    }
    if (!covered.has(poke.name)) {
      lines.push([card]);
      covered.add(poke.name);
    }
  }

  return lines;
}

/** True when every evolved card in the line has its prior stage also in the line. */
export function isCompleteEvolutionLine(line: Card[]): boolean {
  if (line.length === 0) {
    return false;
  }
  const byName = new Map(
    line.filter(isPokemon).map((card) => [card.name, card as PokemonCard]),
  );
  for (const card of line) {
    if (!isPokemon(card)) {
      continue;
    }
    const poke = card as PokemonCard;
    if (!isStandardStage(poke)) {
      continue;
    }
    if (poke.stage === Stage.BASIC || !poke.evolvesFrom) {
      continue;
    }
    if (!findParentInPool(poke.evolvesFrom, byName)) {
      return false;
    }
  }
  const root = line[0] as PokemonCard;
  return isPokemon(line[0]) && root.stage === Stage.BASIC;
}

function groupPrintingsByName(cards: Card[]): Map<string, Card[]> {
  const byName = new Map<string, Card[]>();
  for (const card of uniqueByFullName(cards)) {
    if (!card.name) {
      continue;
    }
    const list = byName.get(card.name) ?? [];
    list.push(card);
    byName.set(card.name, list);
  }
  return byName;
}

/** Weighted 1–4 copies for standalone cards (singleton always returns 1). */
export function rollCopyCount(rng: () => number, singleton: boolean): number {
  if (singleton) {
    return 1;
  }
  const roll = rng();
  if (roll < 0.4) {
    return 1;
  }
  if (roll < 0.7) {
    return 2;
  }
  if (roll < 0.9) {
    return 3;
  }
  return 4;
}

/**
 * Shared copy count for every stage in an evolution line.
 * Non-singleton: minimum 2 (so lines are at least 2-2 or 2-2-2), up to 4.
 */
export function rollEvolutionLineCopyCount(rng: () => number, singleton: boolean): number {
  if (singleton) {
    return 1;
  }
  const roll = rng();
  if (roll < 0.55) {
    return 2;
  }
  if (roll < 0.85) {
    return 3;
  }
  return 4;
}

function countNameInSelected(
  name: string,
  selected: string[],
  nameOfFull: Map<string, string>,
): number {
  let n = 0;
  for (const full of selected) {
    if (nameOfFull.get(full) === name) {
      n += 1;
    }
  }
  return n;
}

/**
 * Bring a stage up to `targetCopies` total in the cube (across printings).
 * Returns only the newly added fullNames. Respects the per-printing copy cap.
 */
export function ensureStageCopyCount(
  name: string,
  targetCopies: number,
  printingsByName: Map<string, Card[]>,
  selected: string[],
  nameOfFull: Map<string, string>,
  singleton: boolean,
  rng: () => number,
): string[] {
  const printings = printingsByName.get(name);
  if (!printings || printings.length === 0) {
    return [];
  }
  const have = countNameInSelected(name, selected, nameOfFull);
  const need = targetCopies - have;
  if (need <= 0) {
    return [];
  }
  if (singleton) {
    return have > 0 ? [] : distributeCopiesAcrossPrintings(printings, 1, true, rng);
  }

  const unique = uniqueByFullName(printings);
  const available: string[] = [];
  for (const card of unique) {
    const havePrinting = selected.filter((n) => n === card.fullName).length;
    for (let i = havePrinting; i < CUBE_MAX_COPIES; i++) {
      available.push(card.fullName);
    }
  }
  if (available.length === 0) {
    return [];
  }
  shuffleInPlace(available, rng);
  // Sometimes pile onto one printing; otherwise leave the shuffled mix.
  if (rng() < 0.45) {
    const focus = available[0];
    available.sort((a, b) => Number(b === focus) - Number(a === focus));
  }
  return available.slice(0, need);
}

/**
 * Materialize a full evolution line with the same copy count on every stage
 * (e.g. 2-2-2 or 3-3-3). Stages already in the cube are topped up to that count.
 */
export function materializeEvolutionLine(
  line: Card[],
  printingsByName: Map<string, Card[]>,
  selected: string[],
  nameOfFull: Map<string, string>,
  singleton: boolean,
  rng: () => number,
): string[] {
  const copiesPerStage = rollEvolutionLineCopyCount(rng, singleton);
  const batch: string[] = [];
  // Work against a virtual selected list so later stages see earlier adds in this batch.
  const virtual = selected.slice();
  for (const card of line) {
    const added = ensureStageCopyCount(
      card.name,
      copiesPerStage,
      printingsByName,
      virtual,
      nameOfFull,
      singleton,
      rng,
    );
    for (const full of added) {
      batch.push(full);
      virtual.push(full);
    }
  }
  return batch;
}

function pickPreferredPrinting(printings: Card[]): Card {
  let best = printings[0];
  for (let i = 1; i < printings.length; i++) {
    best = preferPrinting(best, printings[i]);
  }
  return best;
}

/**
 * Spread `totalCopies` across available printings of a name.
 * Singleton mode picks a single preferred printing.
 * Multi mode may mix printings and repeat a printing up to {@link CUBE_MAX_COPIES}.
 */
export function distributeCopiesAcrossPrintings(
  printings: Card[],
  totalCopies: number,
  singleton: boolean,
  rng: () => number,
): string[] {
  const unique = uniqueByFullName(printings.filter((card) => !!card.fullName));
  if (unique.length === 0 || totalCopies <= 0) {
    return [];
  }
  if (singleton) {
    return [pickPreferredPrinting(unique).fullName];
  }

  const cappedTotal = Math.min(totalCopies, CUBE_MAX_COPIES * unique.length);
  const pool = shuffleInPlace(unique.slice(), rng);
  const result: string[] = [];
  const counts = new Map<string, number>();

  // ~45%: pile most copies onto one printing; otherwise spread across printings.
  const focusOne = rng() < 0.45;
  if (focusOne) {
    const focus = pool[0];
    const focusCopies = Math.min(cappedTotal, CUBE_MAX_COPIES);
    for (let i = 0; i < focusCopies; i++) {
      result.push(focus.fullName);
    }
    counts.set(focus.fullName, focusCopies);
  }

  let guard = 0;
  while (result.length < cappedTotal && guard++ < 128) {
    const card = pool[Math.floor(rng() * pool.length)];
    const already = counts.get(card.fullName) ?? 0;
    if (already >= CUBE_MAX_COPIES) {
      if (pool.every((p) => (counts.get(p.fullName) ?? 0) >= CUBE_MAX_COPIES)) {
        break;
      }
      continue;
    }
    result.push(card.fullName);
    counts.set(card.fullName, already + 1);
  }
  return result;
}

function materializeNameCopies(
  name: string,
  printingsByName: Map<string, Card[]>,
  singleton: boolean,
  rng: () => number,
  /** Skip when this card name is already in the cube (keeps evo priors intact). */
  alreadyHasName: Set<string>,
): string[] {
  if (alreadyHasName.has(name)) {
    return [];
  }
  const printings = printingsByName.get(name);
  if (!printings || printings.length === 0) {
    return [];
  }
  return distributeCopiesAcrossPrintings(
    printings,
    rollCopyCount(rng, singleton),
    singleton,
    rng,
  );
}

function appendMultiset(selected: string[], batch: string[], room: number): boolean {
  if (batch.length === 0 || room <= 0 || batch.length > room) {
    return false;
  }
  selected.push(...batch);
  return true;
}

/** Add more copies of an already-included name without exceeding per-printing caps. */
function topUpNameCopies(
  name: string,
  printingsByName: Map<string, Card[]>,
  selected: string[],
  singleton: boolean,
  rng: () => number,
  room: number,
): string[] {
  if (singleton || room <= 0) {
    return [];
  }
  const printings = printingsByName.get(name);
  if (!printings || printings.length === 0) {
    return [];
  }
  const unique = uniqueByFullName(printings);
  const available: string[] = [];
  for (const card of unique) {
    const have = selected.filter((n) => n === card.fullName).length;
    for (let i = have; i < CUBE_MAX_COPIES; i++) {
      available.push(card.fullName);
    }
  }
  if (available.length === 0) {
    return [];
  }
  shuffleInPlace(available, rng);
  const extra = Math.min(room, rollCopyCount(rng, false), available.length);
  return available.slice(0, extra);
}

/**
 * Build a random cube list: set-range filtered, no basic Energy, trainer ratio,
 * full evolution lines when Mutant Evolution is off, and optional multi-copy /
 * multi-printing when singleton is false.
 */
export function buildRandomCubeCardNames(
  cards: Card[],
  options: RandomCubeOptions,
): string[] {
  const rng = options.rng ?? Math.random;
  const singleton = options.singleton === true;
  const count = Math.max(0, Math.floor(options.count));
  if (count === 0) {
    return [];
  }

  const orderedSets = orderedSetCodesByRelease(cards);
  const allowedSets = setCodesInRange(orderedSets, options.fromSet, options.toSet);

  const inRange = cards.filter(
    (card) => card.set && allowedSets.has(card.set) && !isBasicEnergy(card) && !!card.fullName,
  );

  const trainerPrintings = groupPrintingsByName(inRange.filter(isTrainer));
  const energyPrintings = groupPrintingsByName(inRange.filter(isSpecialEnergy));
  const pokemonPrintings = groupPrintingsByName(inRange.filter(isPokemon));
  const pokemonStructure = uniqueByName(inRange.filter(isPokemon));

  const trainerTarget = Math.round(count * CUBE_RANDOM_TRAINER_RATIO);
  const pokemonTarget = Math.max(0, count - trainerTarget);

  const selected: string[] = [];
  const nameOfFull = new Map<string, string>();
  for (const list of [
    ...pokemonPrintings.values(),
    ...trainerPrintings.values(),
    ...energyPrintings.values(),
  ]) {
    for (const card of list) {
      nameOfFull.set(card.fullName, card.name);
    }
  }
  const trackNames = (): Set<string> => {
    const names = new Set<string>();
    for (const full of selected) {
      const n = nameOfFull.get(full);
      if (n) {
        names.add(n);
      }
    }
    return names;
  };

  if (options.mutantEvolution) {
    const names = shuffleInPlace(Array.from(pokemonPrintings.keys()), rng);
    for (const name of names) {
      if (selected.length >= pokemonTarget) {
        break;
      }
      const batch = materializeNameCopies(name, pokemonPrintings, singleton, rng, trackNames());
      appendMultiset(selected, batch, Math.min(pokemonTarget, count) - selected.length);
    }
  } else {
    const lines = shuffleInPlace(
      buildEvolutionLines(pokemonStructure).filter(isCompleteEvolutionLine),
      rng,
    );
    for (const line of lines) {
      if (selected.length >= pokemonTarget) {
        break;
      }
      const batch = materializeEvolutionLine(
        line,
        pokemonPrintings,
        selected,
        nameOfFull,
        singleton,
        rng,
      );
      // Every stage must be present after applying the batch (priors topped up if needed).
      const namesAfter = new Set(trackNames());
      for (const full of batch) {
        const n = nameOfFull.get(full);
        if (n) {
          namesAfter.add(n);
        }
      }
      if (!line.every((card) => namesAfter.has(card.name))) {
        continue;
      }
      appendMultiset(selected, batch, count - selected.length);
    }
  }

  const fillNewNames = (groups: Map<string, Card[]>, roomCap: number) => {
    const names = shuffleInPlace(Array.from(groups.keys()), rng);
    for (const name of names) {
      const room = Math.min(roomCap, count) - selected.length;
      if (room <= 0) {
        break;
      }
      const batch = materializeNameCopies(name, groups, singleton, rng, trackNames());
      appendMultiset(selected, batch, room);
    }
  };

  const topUpGroups = (groups: Map<string, Card[]>) => {
    if (singleton) {
      return;
    }
    const names = shuffleInPlace(Array.from(groups.keys()), rng);
    for (const name of names) {
      const room = count - selected.length;
      if (room <= 0) {
        break;
      }
      const batch = topUpNameCopies(name, groups, selected, singleton, rng, room);
      appendMultiset(selected, batch, room);
    }
  };

  fillNewNames(trainerPrintings, selected.length + Math.max(0, trainerTarget));
  if (selected.length < count) {
    fillNewNames(trainerPrintings, count);
  }
  if (selected.length < count) {
    fillNewNames(energyPrintings, count);
  }
  if (selected.length < count && options.mutantEvolution) {
    fillNewNames(pokemonPrintings, count);
  }
  // Still short? Stack more copies onto cards already in the cube.
  if (selected.length < count) {
    topUpGroups(trainerPrintings);
  }
  if (selected.length < count) {
    topUpGroups(energyPrintings);
  }
  if (selected.length < count && options.mutantEvolution) {
    topUpGroups(pokemonPrintings);
  }

  return selected.slice(0, count);
}
