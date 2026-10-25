import aliases from '../../data/server-set-aliases.json';

const CATALOG_TO_SERVER: Record<string, string> = Object.fromEntries(
  Object.entries(aliases.catalogToServer).map(([from, to]) => [from.toUpperCase(), to.toUpperCase()])
);

const NUMBER_PREFIXES: Record<string, string> = Object.fromEntries(
  Object.entries(aliases.numberPrefixes).map(([set, prefix]) => [set.toUpperCase(), prefix.toUpperCase()])
);

const SERVER_TO_CATALOG = new Map<string, string[]>();
for (const [from, to] of Object.entries(CATALOG_TO_SERVER)) {
  const list = SERVER_TO_CATALOG.get(to) || [];
  if (!list.includes(from)) list.push(from);
  SERVER_TO_CATALOG.set(to, list);
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Map a pokemon-tcg-data set id or ptcgoCode to the ptcg-server `public set` string. */
export function toServerSetCode(code: string): string {
  const normalized = normalizeCode(code);
  if (!normalized) return '';
  return CATALOG_TO_SERVER[normalized] || normalized;
}

/** Catalog ids / ptcgoCodes that resolve to this server set code. */
export function catalogKeysForServerCode(code: string): string[] {
  const server = toServerSetCode(code);
  const keys = new Set<string>([server, normalizeCode(code)]);
  for (const key of SERVER_TO_CATALOG.get(server) || []) {
    keys.add(key);
  }
  return [...keys];
}

/** Codes to match against `public set = '…'` when locating a set folder. */
export function setDirectoryLookupCodes(code: string): string[] {
  const raw = normalizeCode(code);
  const server = toServerSetCode(raw);
  return [...new Set([raw, server].filter(Boolean))];
}

/**
 * ptcg-server folder for a POP Series catalog or server code (`POP1`/`P1` → `set-pop-series-1`).
 * POP Series 9 cards use `OP9`.
 */
export function popSeriesSetDirectory(code: string): string | undefined {
  const server = toServerSetCode(code);
  const match = server.match(/^(?:POP|OP|P)(\d+)$/i);
  if (!match) return undefined;
  return `set-pop-series-${Number(match[1])}`;
}

/**
 * Strip Black Star era prefixes (SM01 → 1, SWSH001 → 1, SM100 → 100).
 * Leaves SVP / PR / NP / DPP / MEP and set-named numbers unchanged.
 */
export function normalizePromoSetNumber(serverSet: string, number: string): string {
  const trimmed = String(number || '').trim();
  if (!trimmed) return trimmed;
  const prefix = NUMBER_PREFIXES[toServerSetCode(serverSet)];
  if (!prefix) return trimmed;
  const match = trimmed.match(new RegExp(`^${prefix}0*([0-9].*)$`, 'i'));
  if (!match) return trimmed;
  return match[1].replace(/^0+(?=\d)/, '') || match[1];
}

/** Catalog `card.number` spellings that may correspond to a server setNumber. */
export function catalogNumberCandidates(serverSet: string, number: string): string[] {
  const raw = String(number || '').trim();
  const normalized = normalizePromoSetNumber(serverSet, raw);
  const candidates = new Set<string>([raw, normalized].filter(Boolean));
  const prefix = NUMBER_PREFIXES[toServerSetCode(serverSet)];
  const digits = normalized.match(/^(\d+)(.*)$/);
  if (prefix && digits) {
    const [, n, suffix] = digits;
    candidates.add(`${prefix}${n}${suffix}`);
    candidates.add(`${prefix}${n.padStart(2, '0')}${suffix}`);
    candidates.add(`${prefix}${n.padStart(3, '0')}${suffix}`);
  }
  return [...candidates];
}

export function numbersMatchCatalog(
  serverSet: string,
  serverNumber: string,
  catalogNumber: string
): boolean {
  const wanted = new Set(catalogNumberCandidates(serverSet, serverNumber));
  return wanted.has(catalogNumber) || wanted.has(normalizePromoSetNumber(serverSet, catalogNumber));
}
