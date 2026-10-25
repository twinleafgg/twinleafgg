import { PREFAB_CATALOG, getPrefabById, prefabsForScope } from './catalog';
import { joinRelatedClauses, normalizeMatchText } from '../textAccuracy';
import type {
  EffectKind,
  MatchedPrefab,
  PartialMatchResult,
  PrefabDefinition,
  PrefabScope,
  SelectedPrefab,
} from '../types';

export class MissingPrefabError extends Error {
  constructor(text: string) {
    super(`cannot generate - missing prefab\n\nNo prefab found for effect text:\n"${text}"`);
    this.name = 'MissingPrefabError';
  }
}

/** Normalize card text for pattern matching. */
export function normalizeEffectText(text: string): string {
  return normalizeMatchText(text);
}

/**
 * Split effect text into matchable clauses.
 * Prefers full-text compound matches first; falls back to sentence segments.
 */
export function splitClauses(normalized: string): string[] {
  const parts = normalized
    .split(/(?<=\.)\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [normalized];
}

function tryMatchPrefab(
  clause: string,
  prefab: PrefabDefinition
): MatchedPrefab | null {
  for (const pattern of prefab.patterns) {
    const match = clause.match(pattern);
    if (!match) continue;

    const params: Record<string, string> = {};
    for (const p of prefab.params) {
      if (p.defaultValue !== undefined) {
        params[p.key] = String(p.defaultValue);
      }
    }
    if (prefab.paramCaptures) {
      for (const [groupIdx, key] of Object.entries(prefab.paramCaptures)) {
        const captured = match[Number(groupIdx)];
        if (captured !== undefined) {
          params[key] = captured;
        }
      }
    }
    // First DRAW_CARDS pattern has no capture — leave default 1
    if (prefab.id === 'DRAW_CARDS' && !match[1]) {
      params.count = '1';
    }
    if (prefab.id === 'DISCARD_X_ENERGY_FROM_THIS_POKEMON' && !match[1]) {
      params.count = '1';
    }

    return { prefab, params, matchedText: clause };
  }
  return null;
}

function catalogForScope(scope: EffectKind): PrefabDefinition[] {
  return prefabsForScope(scope);
}

function matchClause(clause: string, catalog: PrefabDefinition[]): MatchedPrefab | null {
  for (const prefab of catalog) {
    const hit = tryMatchPrefab(clause, prefab);
    if (hit) return hit;
  }
  return null;
}

/**
 * Match effect text against the prefab catalog without failing on unmatched clauses.
 * Empty / whitespace-only text is treated as "no effect" (OK).
 */
export function matchEffectTextPartial(
  text: string,
  scope: EffectKind
): PartialMatchResult {
  let normalized = normalizeEffectText(text);
  if (!normalized) {
    return { matched: [], unmatched: [] };
  }

  const catalog = catalogForScope(scope);
  const results: MatchedPrefab[] = [];

  // Baby Evolution is a full Poké-Power — match before the generic once-per-turn stub.
  if (scope === 'power') {
    const babyPrefab = catalog.find(p => p.id === 'BABY_EVOLUTION');
    if (babyPrefab) {
      const babyHit = tryMatchPrefab(normalized, babyPrefab);
      if (babyHit) {
        return { matched: [babyHit], unmatched: [] };
      }
    }
  }

  // Powers often start with "Once during your turn, ..."
  if (scope === 'power') {
    const once = normalized.match(/^once during your turn(?:\s*\([^)]*\))?\.?(?:\s*[,:])?\s*(.*)$/i);
    if (once) {
      const oncePrefab = catalog.find(p => p.id === 'USE_ABILITY_ONCE_PER_TURN');
      if (oncePrefab) {
        results.push({
          prefab: oncePrefab,
          params: { marker: 'ABILITY_USED_MARKER' },
          matchedText: 'Once during your turn.',
        });
      }
      normalized = (once[1] || '').replace(/^[.,:;]+\s*/, '').trim();
      // After stripping once-per-turn, try Baby Evolution on the remainder
      const babyPrefab = catalog.find(p => p.id === 'BABY_EVOLUTION');
      if (babyPrefab) {
        const babyHit = tryMatchPrefab(normalized, babyPrefab);
        if (babyHit) {
          // Baby Evolution implementations do not use the once-per-turn marker stub
          return { matched: [babyHit], unmatched: [] };
        }
      }
      if (!normalized) {
        return { matched: results, unmatched: [] };
      }
    }
  }

  // 1) Try full-text match against longer/compound patterns first
  const fullHit = matchClause(normalized, catalog);
  if (fullHit) {
    return { matched: [...results, fullHit], unmatched: [] };
  }

  // 2) Split into clauses and match each; gather unmatched
  const clauses = joinRelatedClauses(splitClauses(normalized));
  const unmatched: string[] = [];

  for (const clause of clauses) {
    const found = matchClause(clause, catalog);
    if (found) {
      results.push(found);
    } else {
      unmatched.push(clause);
    }
  }

  // 3) If multiple unmatched remain, try matching them as a joined blob
  //    (covers compound patterns that span consecutive unmatched sentences).
  if (unmatched.length >= 2) {
    const joined = unmatched.join(' ');
    const blobHit = matchClause(joined, catalog);
    if (blobHit) {
      return { matched: [...results, blobHit], unmatched: [] };
    }

    // Greedy: try longest contiguous unmatched runs
    const remaining: string[] = [];
    let i = 0;
    while (i < unmatched.length) {
      let consumed = false;
      for (let len = unmatched.length - i; len >= 2; len--) {
        const run = unmatched.slice(i, i + len).join(' ');
        const runHit = matchClause(run, catalog);
        if (runHit) {
          results.push(runHit);
          i += len;
          consumed = true;
          break;
        }
      }
      if (!consumed) {
        remaining.push(unmatched[i]);
        i += 1;
      }
    }
    return { matched: results, unmatched: remaining };
  }

  return { matched: results, unmatched };
}

/**
 * Match effect text against the prefab catalog.
 * Empty / whitespace-only text is treated as "no effect" (OK).
 * Throws MissingPrefabError if any clause cannot be matched.
 */
export function matchEffectText(
  text: string,
  scope: EffectKind
): MatchedPrefab[] {
  const { matched, unmatched } = matchEffectTextPartial(text, scope);
  if (unmatched.length > 0) {
    throw new MissingPrefabError(unmatched[0]);
  }
  return matched;
}

export function matchedToSelected(matched: MatchedPrefab[]): SelectedPrefab[] {
  return matched.map((m, i) => ({
    id: `${m.prefab.id}-${i}-${Date.now()}`,
    prefabId: m.prefab.id,
    params: { ...m.params },
    source: 'matched' as const,
  }));
}

export function createManualSelected(prefabId: string): SelectedPrefab | null {
  const prefab = getPrefabById(prefabId);
  if (!prefab) return null;
  const params: Record<string, string> = {};
  for (const p of prefab.params) {
    if (p.defaultValue !== undefined) {
      params[p.key] = String(p.defaultValue);
    } else {
      params[p.key] = '';
    }
  }
  return {
    id: `${prefabId}-manual-${Date.now()}`,
    prefabId,
    params,
    source: 'manual',
  };
}

export function listCatalog(scope?: PrefabScope): PrefabDefinition[] {
  if (!scope) return PREFAB_CATALOG;
  if (scope === 'both') return PREFAB_CATALOG;
  return prefabsForScope(scope);
}
