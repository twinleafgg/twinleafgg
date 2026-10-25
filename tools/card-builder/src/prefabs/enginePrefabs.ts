import type { PrefabDefinition, PrefabParamDef, PrefabScope } from '../types';
import { extractNumbers, substituteCallCaptures } from '../textAccuracy';

export interface EnginePrefabRecord {
  id: string;
  name: string;
  file: string;
  importFrom: string;
  importNames: string[];
  description: string;
  exampleTexts: string[];
  scope: PrefabScope;
  params: PrefabParamDef[];
  signature: string;
  internal: boolean;
  curated: boolean;
  usageCount: number;
  callSamples: string[];
}

export interface EnginePrefabIndex {
  generatedAt: string;
  count: number;
  prefabs: EnginePrefabRecord[];
}

let cachedIndex: EnginePrefabIndex | null = null;

export async function loadEnginePrefabIndex(): Promise<EnginePrefabIndex> {
  if (cachedIndex) return cachedIndex;
  const response = await fetch('/engine-prefabs.json');
  if (!response.ok) {
    throw new Error(`Failed to load engine prefabs (${response.status})`);
  }
  cachedIndex = (await response.json()) as EnginePrefabIndex;

  // Enrich example texts from real card reducers that call each prefab
  try {
    const effectsRes = await fetch('/server-card-effects.json');
    if (effectsRes.ok) {
      const effects = (await effectsRes.json()) as Array<{
        effectText?: string;
        prefabsUsed?: string[];
        body?: string[];
      }>;
      const byPrefab = new Map<string, string[]>();
      for (const effect of effects) {
        const text = (effect.effectText || '').trim();
        if (!text || text.length < 12) continue;
        // Prefer branches that are mostly one prefab call (cleaner teaching examples)
        const used = effect.prefabsUsed || [];
        const bodyLines = (effect.body || []).filter(l => l.trim() && !l.trim().startsWith('//'));
        for (const name of used) {
          const list = byPrefab.get(name) || [];
          if (list.includes(text)) continue;
          const focused = used.length <= 3 || bodyLines.length <= 8;
          if (focused) list.push(text);
          byPrefab.set(name, list);
        }
      }
      for (const prefab of cachedIndex.prefabs) {
        const mined = byPrefab.get(prefab.name) || [];
        if (mined.length === 0) continue;
        const merged = [...prefab.exampleTexts];
        for (const text of mined) {
          if (merged.length >= 8) break;
          if (!merged.includes(text)) merged.push(text);
        }
        prefab.exampleTexts = merged;
      }
    }
  } catch {
    // Server effects optional for enrichment
  }

  return cachedIndex;
}

export function clearEnginePrefabCache(): void {
  cachedIndex = null;
}

/** Escape a card-text example into a flexible regex pattern. */
export function exampleTextToPattern(text: string): RegExp {
  const normalized = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/Pokémon/gi, 'Pokemon')
    .replace(/\s+/g, ' ')
    .trim();

  let pattern = normalized
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\'/g, "'?")
    .replace(/\s+/g, '\\s+')
    .replace(/Pokemon/gi, 'Pok[eé]mon')
    .replace(/opponent's/gi, "opponent'?s")
    .replace(/can't/gi, "can'?t")
    .replace(/don't/gi, "don'?t")
    .replace(/(\d+)/g, '(\\d+)');

  // Trailing period optional
  pattern = pattern.replace(/\\\.?$/, '\\.?');
  return new RegExp(`^${pattern}$`, 'i');
}

function pickCallTemplate(record: EnginePrefabRecord): string {
  // Prefer a short real-world sample that uses store/state/effect/this
  const samples = record.callSamples.filter(s =>
    /\bstore\b/.test(s) || /\beffect\b/.test(s) || /\bthis\b/.test(s) || /\bplayer\b/.test(s)
  );
  const best = samples.sort((a, b) => a.length - b.length)[0];
  if (best && best.length < 160) {
    return best.endsWith(';') ? best : `${best};`;
  }

  // Synthesize from signature defaults
  const args: string[] = [];
  const sig = record.signature.match(/\((.*)\)/)?.[1] || '';
  const parts = sig.split(',').map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    const name = part.match(/^(?:\.\.\.)?(\w+)/)?.[1];
    if (!name) continue;
    if (name === 'store') args.push('store');
    else if (name === 'state') args.push('state');
    else if (name === 'effect') args.push('effect');
    else if (name === 'player') args.push('player');
    else if (name === 'opponent') args.push('effect.opponent');
    else if (name === 'source' || name === 'card' || name === 'self') args.push('this');
    else if (name === 'next') continue;
    else if (part.includes('=')) {
      const def = part.split('=').slice(1).join('=').trim();
      args.push(def);
    } else if (/options|config/i.test(name)) {
      args.push('{}');
    } else {
      args.push(`/* ${name} */`);
    }
  }
  return `${record.name}(${args.join(', ')});`;
}

/**
 * Convert an engine prefab index record into a PrefabDefinition the matcher/generator can use.
 * Auto-matched only when exampleTexts exist (JSDoc card text); otherwise manual-add only.
 */
export function engineRecordToPrefab(record: EnginePrefabRecord): PrefabDefinition {
  const patterns =
    !record.internal && record.exampleTexts.length > 0
      ? record.exampleTexts.map(exampleTextToPattern)
      : [];

  const callLine = pickCallTemplate(record);
  const paramCaptures: Record<number, string> = {};
  for (let i = 1; i <= 8; i++) {
    paramCaptures[i] = `n${i}`;
  }

  return {
    id: record.id,
    name: record.name,
    description: record.internal
      ? `[helper] ${record.description}`
      : record.description,
    exampleTexts: record.exampleTexts,
    scope: record.scope,
    importFrom: record.importFrom,
    importNames: record.importNames,
    params: record.params,
    paramCaptures,
    patterns,
    generateCall: (params) => {
      const captured = Object.keys(params)
        .filter(key => /^n\d+$/.test(key) && /^\d+$/.test(params[key] || ''))
        .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
        .map(key => params[key]);
      const example =
        record.exampleTexts.find(text => extractNumbers(text).length === captured.length) ||
        record.exampleTexts[0] ||
        '';
      const namedAmounts = ['amount', 'damage', 'count', 'bonus', 'coins', 'x']
        .map(key => params[key])
        .filter((value): value is string => Boolean(value) && /^\d+$/.test(value));
      const numbers = captured.length > 0 ? captured : namedAmounts;
      return {
        lines: [substituteCallCaptures(callLine, example, numbers)],
      };
    },
  };
}
