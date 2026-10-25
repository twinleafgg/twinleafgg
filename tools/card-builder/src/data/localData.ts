import {
  catalogNumberCandidates,
  numbersMatchCatalog,
  toServerSetCode,
} from './serverSetCodes';
import type {
  TcgDexAbility,
  TcgDexAttack,
  TcgDexCard,
  TcgDexCardResume,
  TcgDexSerieResume,
  TcgDexSet,
  TcgDexSetResume,
  TcgDexWeakRes,
} from './types';
import { DataError } from './types';

/**
 * Local browse source backed by https://github.com/PokemonTCG/pokemon-tcg-data
 * Served by Vite at /tcg-data/* (see vite.config.ts).
 */

const DATA_BASE = '/tcg-data';

export interface LocalSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  ptcgoCode?: string;
  releaseDate: string;
  images?: { symbol?: string; logo?: string };
}

export interface LocalCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  attacks?: Array<{
    name: string;
    cost?: string[];
    damage?: string;
    text?: string;
  }>;
  abilities?: Array<{
    name: string;
    text: string;
    type: string;
  }>;
  weaknesses?: Array<{ type: string; value: string }>;
  resistances?: Array<{ type: string; value: string }>;
  convertedRetreatCost?: number;
  retreatCost?: string[];
  number: string;
  artist?: string;
  rarity?: string;
  regulationMark?: string;
  rules?: string[];
  images?: { small?: string; large?: string };
  set?: LocalSet;
}

let cachedSets: LocalSet[] | null = null;
const cardFileCache = new Map<string, LocalCard[]>();

async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${DATA_BASE}${path}`);
  } catch (e) {
    throw new DataError(
      `Local tcg-data unreachable (${e instanceof Error ? e.message : String(e)}). Run: npm run sync-data`
    );
  }
  if (res.status === 404) {
    throw new DataError(
      `Missing ${path}. Run \`npm run sync-data\` in tools/card-builder to clone pokemon-tcg-data.`,
      404
    );
  }
  if (!res.ok) {
    throw new DataError(`Failed to load ${path} (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

export async function loadAllSets(): Promise<LocalSet[]> {
  if (cachedSets) return cachedSets;
  const sets = await getJson<LocalSet[]>('/sets/en.json');
  cachedSets = [...sets].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  return cachedSets;
}

async function loadSetCards(setId: string): Promise<LocalCard[]> {
  const hit = cardFileCache.get(setId);
  if (hit) return hit;
  const cards = await getJson<LocalCard[]>(`/cards/en/${encodeURIComponent(setId)}.json`);
  cardFileCache.set(setId, cards);
  return cards;
}

function toSetResume(s: LocalSet): TcgDexSetResume {
  return {
    id: s.id,
    name: s.name,
    logo: s.images?.logo,
    symbol: s.images?.symbol,
    cardCount: { total: s.total, official: s.printedTotal },
  };
}

function mapStage(subtypes: string[] | undefined): string | undefined {
  if (!subtypes?.length) return undefined;
  const joined = subtypes.join(' ').toLowerCase();
  if (joined.includes('vstar')) return 'VSTAR';
  if (joined.includes('vmax')) return 'VMAX';
  if (joined.includes('v-union') || joined.includes('vunion')) return 'VUNION';
  if (joined.includes('level-up') || joined.includes('level up')) return 'LEVEL-UP';
  if (joined.includes('break')) return 'BREAK';
  if (joined.includes('mega')) return 'MEGA';
  if (joined.includes('restored')) return 'RESTORED';
  if (joined.includes('stage 2') || joined.includes('stage2')) return 'Stage2';
  if (joined.includes('stage 1') || joined.includes('stage1')) return 'Stage1';
  if (joined.includes('basic')) return 'Basic';
  return subtypes[0];
}

function mapCategory(supertype: string): string {
  const s = supertype.toLowerCase();
  if (s.includes('trainer')) return 'Trainer';
  if (s.includes('energy')) return 'Energy';
  return 'Pokemon';
}

function mapTrainerType(subtypes: string[] | undefined): string | undefined {
  if (!subtypes) return undefined;
  const t = subtypes.join(' ').toLowerCase();
  if (t.includes('supporter')) return 'Supporter';
  if (t.includes('stadium')) return 'Stadium';
  if (t.includes('tool')) return 'Tool';
  if (t.includes('item')) return 'Item';
  return subtypes[0];
}

function mapWeakRes(list: Array<{ type: string; value: string }> | undefined): TcgDexWeakRes[] {
  return (list || []).map(w => ({ type: w.type, value: w.value }));
}

function mapAttacks(list: LocalCard['attacks']): TcgDexAttack[] {
  return (list || []).map(a => ({
    name: a.name,
    cost: a.cost,
    damage: a.damage,
    effect: a.text || undefined,
  }));
}

function mapAbilities(list: LocalCard['abilities']): TcgDexAbility[] {
  return (list || []).map(a => ({
    name: a.name,
    type: a.type,
    effect: a.text,
  }));
}

export function localCardToDraftShape(card: LocalCard, set?: LocalSet): TcgDexCard {
  const s = set || card.set;
  return {
    id: card.id,
    localId: card.number,
    name: card.name,
    image: card.images?.large || card.images?.small,
    category: mapCategory(card.supertype),
    rarity: card.rarity || '',
    set: {
      id: s?.id || card.id.split('-')[0] || '',
      name: s?.name || '',
      cardCount: {
        total: s?.total ?? 0,
        official: s?.printedTotal ?? 0,
      },
      logo: s?.images?.logo,
      abbreviations: s?.ptcgoCode ? { official: s.ptcgoCode } : undefined,
      tcgOnline: s?.ptcgoCode,
    },
    hp: card.hp ? Number(card.hp) : undefined,
    types: card.types,
    evolveFrom: card.evolvesFrom,
    stage: mapStage(card.subtypes),
    suffix: card.subtypes?.find(x => /^(EX|GX|V|VMAX|VSTAR|ex)$/i.test(x)),
    abilities: mapAbilities(card.abilities),
    attacks: mapAttacks(card.attacks),
    weaknesses: mapWeakRes(card.weaknesses),
    resistances: mapWeakRes(card.resistances),
    retreat: card.convertedRetreatCost ?? card.retreatCost?.length ?? 0,
    effect: card.rules?.join(' ') || undefined,
    trainerType: mapTrainerType(card.subtypes),
    energyType: card.subtypes?.find(x => /basic|special/i.test(x)),
    regulationMark: card.regulationMark,
  };
}

export async function listSeries(): Promise<TcgDexSerieResume[]> {
  const sets = await loadAllSets();
  const bySeries = new Map<string, { name: string; logo?: string; count: number }>();
  for (const s of sets) {
    const cur = bySeries.get(s.series);
    if (!cur) {
      bySeries.set(s.series, { name: s.series, logo: s.images?.logo, count: 1 });
    } else {
      cur.count += 1;
    }
  }
  return [...bySeries.entries()].map(([id, meta]) => ({
    id,
    name: `${meta.name} (${meta.count})`,
    logo: meta.logo,
  }));
}

export async function getSerie(serieId: string): Promise<{
  id: string;
  name: string;
  sets: TcgDexSetResume[];
}> {
  const sets = await loadAllSets();
  const matched = sets.filter(s => s.series === serieId);
  return {
    id: serieId,
    name: serieId,
    sets: matched.map(toSetResume),
  };
}

export async function getSet(setId: string): Promise<TcgDexSet> {
  const sets = await loadAllSets();
  const set = sets.find(s => s.id === setId);
  if (!set) {
    throw new DataError(`Unknown set id: ${setId}`, 404);
  }
  const cards = await loadSetCards(setId);
  return {
    id: set.id,
    name: set.name,
    logo: set.images?.logo,
    symbol: set.images?.symbol,
    cardCount: { total: set.total, official: set.printedTotal },
    serie: { id: set.series, name: set.series },
    tcgOnline: set.ptcgoCode,
    releaseDate: set.releaseDate,
    cards: cards.map(c => ({
      id: c.id,
      localId: c.number,
      name: c.name,
      image: c.images?.small || c.images?.large,
    })),
  };
}

export async function getCard(id: string): Promise<TcgDexCard> {
  // ids look like "base1-4" or "sv3-25"
  const dash = id.indexOf('-');
  if (dash <= 0) {
    throw new DataError(`Invalid card id: ${id}`);
  }
  const setId = id.slice(0, dash);
  const sets = await loadAllSets();
  const set = sets.find(s => s.id === setId);
  const cards = await loadSetCards(setId);
  const card = cards.find(c => c.id === id);
  if (!card) {
    throw new DataError(`Card not found: ${id}`, 404);
  }
  return localCardToDraftShape(card, set);
}

export async function searchCardsByName(
  name: string,
  options?: {
    offset?: number;
    limit?: number;
  }
): Promise<{ cards: TcgDexCardResume[]; hasMore: boolean }> {
  const q = name.trim().toLowerCase();
  if (!q) return { cards: [], hasMore: false };

  const offset = Math.max(0, Math.floor(options?.offset ?? 0));
  const limit = Math.max(1, Math.floor(options?.limit ?? 80));
  const endExclusive = offset + limit;

  const sets = await loadAllSets();
  const cards: TcgDexCardResume[] = [];
  let hasMore = false;

  // Search newest sets first; collect only matches within [offset, offset+limit).
  // `matchIndex` counts matches (not non-matching cards).
  let matchIndex = 0;
  outer: for (const set of sets) {
    let setCards: LocalCard[];
    try {
      setCards = await loadSetCards(set.id);
    } catch {
      continue;
    }

    for (const c of setCards) {
      if (!c.name.toLowerCase().includes(q)) continue;

      if (matchIndex >= endExclusive) {
        hasMore = true;
        break outer;
      }

      if (matchIndex >= offset) {
        cards.push({
          id: c.id,
          localId: c.number,
          name: c.name,
          image: c.images?.small || c.images?.large,
        });
      }

      matchIndex++;
    }
  }

  return { cards, hasMore };
}

function catalogSetMatches(set: LocalSet, setCode: string): boolean {
  const normalizedSet = setCode.trim().toUpperCase();
  if (!normalizedSet) return false;
  const serverCode = toServerSetCode(normalizedSet);
  return (
    set.id.toUpperCase() === normalizedSet ||
    set.ptcgoCode?.toUpperCase() === normalizedSet ||
    toServerSetCode(set.id) === serverCode ||
    (Boolean(set.ptcgoCode) && toServerSetCode(set.ptcgoCode!) === serverCode)
  );
}

export async function findCardsByNameAndSet(name: string, setCode: string): Promise<TcgDexCardResume[]> {
  const normalizedName = name.trim().toLowerCase();
  const normalizedSet = setCode.trim().toUpperCase();
  if (!normalizedName || !normalizedSet) return [];

  const sets = await loadAllSets();
  const matchingSets = sets.filter(set => catalogSetMatches(set, normalizedSet));
  const results: TcgDexCardResume[] = [];
  for (const set of matchingSets) {
    const cards = await loadSetCards(set.id);
    for (const card of cards) {
      if (card.name.trim().toLowerCase() !== normalizedName) continue;
      results.push({
        id: card.id,
        localId: card.number,
        name: card.name,
        image: card.images?.small || card.images?.large,
      });
    }
  }
  return results;
}

export async function findCardBySetAndNumber(
  setCode: string,
  setNumber: string
): Promise<TcgDexCardResume | undefined> {
  const normalizedSet = setCode.trim().toUpperCase();
  const normalizedNumber = setNumber.trim();
  if (!normalizedSet || !normalizedNumber) return undefined;

  const sets = await loadAllSets();
  const matchingSets = sets.filter(set => catalogSetMatches(set, normalizedSet));
  const serverCode = toServerSetCode(normalizedSet);
  const wantedNumbers = new Set(catalogNumberCandidates(serverCode, normalizedNumber));
  for (const set of matchingSets) {
    const cards = await loadSetCards(set.id);
    const card = cards.find(
      c => wantedNumbers.has(c.number) || numbersMatchCatalog(serverCode, normalizedNumber, c.number)
    );
    if (card) {
      return {
        id: card.id,
        localId: card.number,
        name: card.name,
        image: card.images?.small || card.images?.large,
      };
    }
  }
  return undefined;
}

export function clearLocalCache(): void {
  cachedSets = null;
  cardFileCache.clear();
}

export function cardImageUrl(
  imageBase: string | undefined,
  quality: 'high' | 'low' = 'low'
): string | undefined {
  if (!imageBase) return undefined;
  if (quality === 'high' && imageBase.includes('pokemontcg.io') && !imageBase.includes('_hires')) {
    return imageBase.replace(/\.png($|\?)/, '_hires.png$1');
  }
  if (quality === 'low' && imageBase.includes('_hires')) {
    return imageBase.replace('_hires', '');
  }
  return imageBase;
}

export function setLogoUrl(logoBase: string | undefined): string | undefined {
  return logoBase;
}
