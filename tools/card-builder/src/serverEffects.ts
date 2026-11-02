import type { EffectKind, HybridEffectResolution, ServerEffect } from './types';
import { matchEffectTextPartial, matchedToSelected } from './prefabs/matcher';
import {
  energyTypesCompatible,
  numbersCompatible,
  substituteNumbersInLines,
} from './textAccuracy';

let cached: ServerEffect[] | null = null;

/** Markers the generator commonly auto-declares from prefabs. */
const AUTO_DECLARED_MARKERS = new Set(['ABILITY_USED_MARKER']);

const COMMON_TOKENS = new Set([
  'the',
  'this',
  'that',
  'your',
  'opponent',
  'opponents',
  'pokemon',
  'active',
  'benched',
  'bench',
  'damage',
  'attack',
  'attacks',
  'during',
  'next',
  'turn',
  'once',
  'flip',
  'coin',
  'from',
  'with',
  'into',
  'onto',
  'and',
  'or',
  'for',
  'each',
  'then',
  'when',
  'if',
  'put',
  'search',
  'deck',
  'hand',
  'discard',
  'pile',
  'shuffle',
  'draw',
  'card',
  'cards',
  'energy',
  'special',
  'condition',
  'does',
  'do',
  'less',
  'more',
  'times',
  'until',
  'end',
  'of',
  'a',
  'an',
  'to',
  'is',
  'are',
  'was',
  'were',
  'be',
  'by',
  'as',
  'in',
  'on',
  'at',
  'his',
  'her',
  'their',
  'you',
  'may',
  'cannot',
  'cant',
  'dont',
  'apply',
  'weakness',
  'resistance',
]);

function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/Pokémon/gi, 'Pokemon')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function similarity(left: string, right: string): number {
  const aNorm = normalize(left);
  const bNorm = normalize(right);
  if (!aNorm || !bNorm) return 0;
  if (aNorm === bNorm) return 1;
  // Contained substring boost (handles slight wording differences around a shared core)
  if (aNorm.length >= 20 && bNorm.includes(aNorm)) return 0.92;
  if (bNorm.length >= 20 && aNorm.includes(bNorm)) return 0.9;
  const a = new Set(aNorm.split(/\s+/).filter(Boolean));
  const b = new Set(bNorm.split(/\s+/).filter(Boolean));
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap++;
  const jaccard = overlap / Math.max(a.size, b.size);
  const coverage = overlap / Math.min(a.size, b.size);
  return Math.max(jaccard, coverage * 0.85);
}

function thresholdFor(kind: EffectKind | undefined, clauseMode: boolean): number {
  if (kind === 'energy') return 0.68;
  if (clauseMode) return 0.85;
  return 0.85;
}

/** Distinctive tokens: longer words, pokemon-ish names, and specific numbers. */
function distinctiveTokens(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean)
    .filter(token => {
      if (/^\d+$/.test(token)) return token.length >= 2 || Number(token) >= 10;
      if (COMMON_TOKENS.has(token)) return false;
      return token.length >= 5;
    });
}

/**
 * Reject full-text matches that are only weakly related despite clearing the
 * numeric threshold (length mismatch or few shared distinctive tokens).
 */
function isConfidentTextMatch(query: string, effectText: string, score: number): boolean {
  if (score < 0.85) return false;
  if (!numbersCompatible(query, effectText)) return false;
  if (!energyTypesCompatible(query, effectText)) return false;
  const qNorm = normalize(query);
  const eNorm = normalize(effectText);
  if (!qNorm || !eNorm) return false;

  const lenRatio = Math.min(qNorm.length, eNorm.length) / Math.max(qNorm.length, eNorm.length);
  if (lenRatio < 0.45) return false;

  // Numbers are substituted into copied code; ignore them for token overlap.
  const qDist = distinctiveTokens(query).filter(token => !/^\d+$/.test(token));
  if (qDist.length === 0) return score >= 0.9;
  const eDist = new Set(distinctiveTokens(effectText).filter(token => !/^\d+$/.test(token)));
  const shared = qDist.filter(t => eDist.has(t)).length;
  return shared / qDist.length >= 0.4;
}

function withSubstitutedNumbers(effect: ServerEffect, query: string): ServerEffect {
  const effectText = effect.effectText || effect.attackText || '';
  return {
    ...effect,
    body: substituteNumbersInLines(effect.body, effectText, query),
    helpers: effect.helpers
      ? substituteNumbersInLines(effect.helpers, effectText, query)
      : effect.helpers,
  };
}

/**
 * Skip snippets that reference `this.SOME_MARKER` when that marker would not be
 * auto-declared by the generator (avoids pasting WISHING_STAR_MARKER etc.).
 */
function referencesUndeclaredMarkers(effect: ServerEffect): boolean {
  const body = effect.body.join('\n');
  const refs = [...body.matchAll(/this\.([A-Z][A-Z0-9_]*_MARKER)\b/g)].map(m => m[1]);
  return refs.some(name => !AUTO_DECLARED_MARKERS.has(name));
}

function isUsableSnippet(effect: ServerEffect, query: string, minScore: number): boolean {
  if (effect.similarity < minScore) return false;
  if (referencesUndeclaredMarkers(effect)) return false;
  const effectText = effect.effectText || effect.attackText || '';
  return isConfidentTextMatch(query, effectText, effect.similarity);
}

export async function loadServerEffects(): Promise<ServerEffect[]> {
  if (cached) return cached;
  const response = await fetch('/server-card-effects.json');
  if (!response.ok) {
    throw new Error(`Failed to load server card effects (${response.status})`);
  }
  cached = (await response.json()) as ServerEffect[];
  return cached;
}

export function clearServerEffectsCache(): void {
  cached = null;
}

export interface FindServerEffectOptions {
  /** Lower similarity threshold for short unmatched clauses. */
  clauseMode?: boolean;
  /** Minimum score override. */
  minScore?: number;
}

/**
 * Rank server effects by exact-then-Jaccard similarity.
 * Prefer same kind, higher score, then shorter body (less junk).
 */
export async function findServerEffect(
  text: string,
  kind?: EffectKind,
  options: FindServerEffectOptions = {}
): Promise<ServerEffect | undefined> {
  if (!text.trim()) return undefined;
  const effects = await loadServerEffects();
  const minScore = options.minScore ?? thresholdFor(kind, Boolean(options.clauseMode));
  const ranked = effects
    .filter(effect => !kind || effect.kind === kind || (!effect.kind && kind === 'attack'))
    .filter(effect => !referencesUndeclaredMarkers(effect))
    .map(effect => {
      const primary = similarity(text, effect.effectText || effect.attackText || '');
      // Slight preference for shorter, prefab-using branches (cleaner reuse)
      const prefabBonus = (effect.prefabsUsed?.length ?? 0) > 0 ? 0.01 : 0;
      const branchBonus = effect.bodyMode === 'branch' ? 0.01 : 0;
      return {
        effect,
        score: Math.min(1, primary + prefabBonus + branchBonus),
        primary,
      };
    })
    .filter(({ primary, score, effect }) => {
      if (primary < minScore && score < minScore) return false;
      return isConfidentTextMatch(text, effect.effectText || effect.attackText || '', primary);
    })
    .sort((a, b) => {
      if (b.primary !== a.primary) return b.primary - a.primary;
      if (b.score !== a.score) return b.score - a.score;
      return a.effect.body.length - b.effect.body.length;
    });
  const best = ranked[0];
  if (!best) return undefined;
  return withSubstitutedNumbers({ ...best.effect, similarity: best.primary }, text);
}

/**
 * Find a server snippet for each unmatched clause.
 * Returns hits that clear the clause threshold; weak clauses are omitted.
 */
export async function findServerEffectsForClauses(
  clauses: string[],
  kind: EffectKind
): Promise<{ hits: ServerEffect[]; missed: string[] }> {
  const hits: ServerEffect[] = [];
  const missed: string[] = [];
  for (const clause of clauses) {
    const hit = await findServerEffect(clause, kind, { clauseMode: true });
    if (hit && isUsableSnippet(hit, clause, 0.85)) {
      hits.push({ ...hit, matchedClause: clause });
    } else {
      missed.push(clause);
    }
  }
  return { hits, missed };
}

/**
 * Hybrid resolve: prefabs for every matching clause, server snippets for gaps,
 * full-text fallback when almost nothing matched.
 */
export async function resolveEffectHybrid(
  text: string,
  kind: EffectKind
): Promise<HybridEffectResolution> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { selectedPrefabs: [], serverSnippets: [], unmatchedClauses: [] };
  }

  // Energy has no prefab pass
  if (kind === 'energy') {
    const full = await findServerEffect(trimmed, 'energy');
    return {
      selectedPrefabs: [],
      serverSnippets: [],
      serverEffect: full,
      unmatchedClauses: full ? [] : [trimmed],
    };
  }

  const { matched, unmatched } = matchEffectTextPartial(trimmed, kind);
  const selectedPrefabs = matchedToSelected(matched);

  if (unmatched.length === 0) {
    return { selectedPrefabs, serverSnippets: [], unmatchedClauses: [] };
  }

  const { hits, missed } = await findServerEffectsForClauses(unmatched, kind);
  const full = selectedPrefabs.length === 0 ? await findServerEffect(trimmed, kind) : undefined;
  const bestClause = hits.reduce((max, h) => Math.max(max, h.similarity), 0);

  // Prefer a strong full-text match over stitching clauses (avoids orphan TODOs like
  // "Flip a coin." when the matched branch already includes the coin flip).
  if (selectedPrefabs.length === 0 && full && full.similarity >= Math.max(0.85, bestClause)) {
    return {
      selectedPrefabs: [],
      serverSnippets: [],
      serverEffect: full,
      unmatchedClauses: [],
    };
  }

  if (selectedPrefabs.length === 0) {
    if (hits.length === 0 && !full) {
      return {
        selectedPrefabs: [],
        serverSnippets: [],
        unmatchedClauses: unmatched,
      };
    }

    if (hits.length > 0) {
      const coveredUnmatched = filterUnmatchedCoveredBySnippets(missed.length > 0 ? missed : unmatched, hits);
      // Prefer full copy when it beats clause stitching or when leftovers remain
      if (full && (coveredUnmatched.length > 0 || full.similarity >= bestClause)) {
        return {
          selectedPrefabs: [],
          serverSnippets: [],
          serverEffect: full,
          unmatchedClauses: [],
        };
      }
      return {
        selectedPrefabs: [],
        serverSnippets: hits,
        unmatchedClauses: coveredUnmatched,
      };
    }
  }

  // Hybrid: keep prefabs; only attach high-confidence clause snippets (>= 0.9).
  // Prefer unmatched TODOs over low-confidence pastes with wrong species/markers.
  const strongSnippets = hits.filter(h => h.similarity >= 0.9 && isUsableSnippet(h, h.matchedClause || trimmed, 0.9));
  const strongClauses = new Set(strongSnippets.map(s => s.matchedClause).filter(Boolean));
  const stillUnmatched = filterUnmatchedCoveredBySnippets(
    [
      ...missed,
      ...hits.filter(h => !strongClauses.has(h.matchedClause)).map(h => h.matchedClause || h.effectText),
    ].filter(Boolean) as string[],
    strongSnippets
  );

  if (selectedPrefabs.length === 0 && strongSnippets.length === 0) {
    return {
      selectedPrefabs: [],
      serverSnippets: [],
      serverEffect: full,
      unmatchedClauses: full ? [] : unmatched,
    };
  }

  return {
    selectedPrefabs,
    serverSnippets: strongSnippets,
    unmatchedClauses: stillUnmatched,
  };
}

/** Drop unmatched clauses already covered by a snippet's source effect text. */
function filterUnmatchedCoveredBySnippets(clauses: string[], snippets: ServerEffect[]): string[] {
  if (clauses.length === 0 || snippets.length === 0) return clauses;
  const coveredTexts = snippets.map(s => normalize(s.effectText || s.attackText || ''));
  return clauses.filter(clause => {
    const n = normalize(clause);
    if (!n) return false;
    return !coveredTexts.some(text => text.includes(n) || n.includes(text));
  });
}

/** Format a short status line for the UI. */
export function describeHybridResolution(result: HybridEffectResolution): string {
  const parts: string[] = [];
  if (result.selectedPrefabs.length > 0) {
    parts.push(`${result.selectedPrefabs.length} prefab(s)`);
  }
  if (result.serverEffect) {
    parts.push(
      `full server match from ${result.serverEffect.source} (${Math.round(result.serverEffect.similarity * 100)}%)`
    );
  } else if (result.serverSnippets.length > 0) {
    const snippetDesc = result.serverSnippets
      .map(s => `${s.source} (${Math.round(s.similarity * 100)}%)`)
      .join(', ');
    parts.push(`${result.serverSnippets.length} server snippet(s): ${snippetDesc}`);
  }
  if (result.unmatchedClauses.length > 0) {
    parts.push(`${result.unmatchedClauses.length} unmatched clause(s)`);
  }
  if (parts.length === 0) {
    return 'No effect text — nothing to match (plain damage attack is OK).';
  }
  return `Matched ${parts.join(' + ')}.`;
}
