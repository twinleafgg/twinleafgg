/**
 * Indexes engine prefabs + mines real call sites from implemented cards.
 * Used by vite.dev middleware and `npm run index-engine`.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cardBuilderRoot = join(here, '..');
const prefabRoot = join(cardBuilderRoot, '../../ptcg-server/src/game/store/prefabs');
const setsRoot = join(cardBuilderRoot, '../../ptcg-server/src/sets');

const MODULE_IMPORT = {
  'prefabs.ts': '../../game/store/prefabs/prefabs',
  'attack-effects.ts': '../../game/store/prefabs/attack-effects',
  'effect-of-attack-prefabs.ts': '../../game/store/prefabs/effect-of-attack-prefabs',
  'effect-of-ability-prefabs.ts': '../../game/store/prefabs/effect-of-ability-prefabs',
  'copy-attack-prefabs.ts': '../../game/store/prefabs/copy-attack-prefabs',
  'copy-attack-delegation.ts': '../../game/store/prefabs/copy-attack-delegation',
  'costs.ts': '../../game/store/prefabs/costs',
  'trainer-prefabs.ts': '../../game/store/prefabs/trainer-prefabs',
  'tool-prefabs.ts': '../../game/store/prefabs/tool-prefabs',
  'ability-lock.ts': '../../game/store/prefabs/ability-lock',
  'attack-coin-reflip.ts': '../../game/store/prefabs/attack-coin-reflip',
  'shared-attack-prefabs.ts': '../../game/store/prefabs/shared-attack-prefabs',
  'trainer-target.ts': '../../game/store/prefabs/trainer-target',
};

/** Files that are infrastructure, not card-effect prefabs. */
const SKIP_FILES = new Set([
  'auto-log.ts',
  'theme-decks.ts',
  'deck-shuffle-animation.ts',
  'clear-effect-markers.ts',
  'stadium-effect.ts',
]);

/** Names that are guards/helpers — still indexed, but not auto-matched from effect text. */
const INTERNAL_PREFIXES = [
  'CAN_',
  'IS_',
  'HAS_',
  'GET_',
  'WAS_',
  'AFTER_',
  'BEFORE_',
  'JUST_',
  'APPLY_',
  'CLEAR_',
  'HANDLE_',
  'RESOLVE_',
  'RUN_',
  'CLEAN_',
];

const INTERNAL_EXACT = new Set([
  'ABILITY_TYPES',
  'ADD_MARKER',
  'REMOVE_MARKER',
  'REMOVE_MARKER_AT_END_OF_TURN',
  'CONFIRMATION_PROMPT',
  'COIN_FLIP_PROMPT',
  'MULTIPLE_COIN_FLIPS_PROMPT',
  'COIN_FLIPS_FOR_ATTACK',
  'MOVE_CARDS',
  'SHOW_CARDS_TO_PLAYER',
  'SHUFFLE_DECK',
  'DRAW_CARDS', // curated separately with better patterns — still indexed
  'ABILITY_USED',
  'USE_ABILITY_ONCE_PER_TURN',
  'ATTACH_ENERGY_PROMPT',
  'SEARCH_DECK_PROMPT',
]);

function collectTsFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? collectTsFiles(path) : entry.name.endsWith('.ts') ? [path] : [];
  });
}

function matchingBrace(source, open) {
  let depth = 0;
  let quote = '';
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') quote = char;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return i;
  }
  return -1;
}

function stripJsDoc(doc) {
  return doc
    .replace(/^\s*\*\s?/gm, '')
    .replace(/@\w+[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQuotedExamples(doc) {
  const out = [];
  for (const match of doc.matchAll(/"([^"]{12,})"/g)) {
    const text = match[1]
      .replace(/\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Prefer card-text-looking strings
    if (/pokemon|damage|flip|draw|discard|search|switch|energy|attack|bench|hand|deck|prize|asleep|paralyz|poison|burn|confus|retreat|heal|knock/i.test(text)
      || /^(During|Flip|Draw|Discard|Search|Switch|Put|Choose|Prevent|This|Your|The|Once)/i.test(text)) {
      out.push(text);
    }
  }
  return [...new Set(out)].slice(0, 6);
}

function inferScope(fileName, name, examples) {
  if (fileName.includes('trainer')) return 'trainer';
  if (fileName.includes('ability') || name.includes('ABILITY') || name.includes('POKEPOWER') || name.includes('POKEBODY')) {
    return 'power';
  }
  if (fileName.includes('attack') || fileName.includes('copy-attack') || fileName.includes('costs')) {
    return 'attack';
  }
  const blob = examples.join(' ').toLowerCase();
  if (/once during your turn|pok[eé]-?power|pok[eé]-?body|ability/.test(blob)) return 'power';
  if (/supporter|item card|stadium/.test(blob)) return 'trainer';
  return 'both';
}

function parseParams(paramList) {
  const params = [];
  if (!paramList.trim()) return params;
  // Split on commas not inside generics/parens — simple approach
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of paramList) {
    if (ch === '<' || ch === '(') depth++;
    if (ch === '>' || ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  const skipNames = new Set(['store', 'state', 'effect', 'player', 'opponent', 'source', 'card', 'self', 'next']);
  for (const part of parts) {
    const m = part.match(/^(?:\.\.\.)?(\w+)\s*(?:\??\s*:\s*([^=]+))?(?:\s*=\s*(.+))?$/);
    if (!m) continue;
    const key = m[1];
    if (skipNames.has(key)) continue;
    const typeRaw = (m[2] || '').trim();
    const defaultRaw = (m[3] || '').trim();
    let type = 'string';
    if (/^number\b|Damage|count|amount|bonus|coins?/i.test(typeRaw) || /^\d+$/.test(defaultRaw)) {
      type = 'number';
    } else if (/^boolean\b/.test(typeRaw) || defaultRaw === 'true' || defaultRaw === 'false') {
      type = 'boolean';
    } else if (/CardType|Energy/i.test(typeRaw)) {
      type = 'energy';
    }
    const entry = { key, label: key, type };
    if (defaultRaw) {
      entry.defaultValue = defaultRaw.replace(/^['"]|['"]$/g, '');
    }
    params.push(entry);
  }
  return params;
}

function isInternal(name) {
  if (INTERNAL_EXACT.has(name)) return true;
  // Keep well-known effect emitters even if they match prefixes
  const effectKeep = /^(ADD_|YOUR_|THIS_|FLIP_|PUT_|HEAL_|DEAL_|DAMAGE_|BLOCK_|PREVENT_|SWITCH_|GUST_|SEARCH_|SHUFFLE_|DISCARD_|ATTACH_|COPY_|NEXT_|DEFENDING_|OPPONENT_|SURVIVE_|KNOCK_|MOVE_|LOOK_|DRAW_|COIN_FLIP_HEADS)/;
  if (effectKeep.test(name)) return false;
  return INTERNAL_PREFIXES.some(p => name.startsWith(p));
}

/**
 * Mine common call expressions for each prefab from card sources.
 * Returns Map<name, { count, samples: string[] }>
 */
function minePrefabUsage() {
  const usage = new Map();
  for (const file of collectTsFiles(setsRoot)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\b([A-Z][A-Z0-9_]{3,})\s*\(([^;]*)\)/g)) {
      const name = match[1];
      const args = match[2].replace(/\s+/g, ' ').trim();
      // Heuristic: skip TYPE enums and class names used as values
      if (args.length > 180) continue;
      if (!usage.has(name)) usage.set(name, { count: 0, samples: [] });
      const entry = usage.get(name);
      entry.count++;
      const call = `${name}(${args})`;
      if (entry.samples.length < 5 && !entry.samples.includes(call)) {
        entry.samples.push(call);
      }
    }
  }
  return usage;
}

export function buildEnginePrefabIndex() {
  const usage = minePrefabUsage();
  const prefabs = [];

  for (const file of readdirSync(prefabRoot).filter(f => f.endsWith('.ts'))) {
    if (SKIP_FILES.has(file)) continue;
    const importFrom = MODULE_IMPORT[file];
    if (!importFrom) continue;

    const source = readFileSync(join(prefabRoot, file), 'utf8');
    const re = /(?:\/\*\*([\s\S]*?)\*\/\s*)?export function (\w+)\s*\(([^)]*)\)/g;
    let match;
    while ((match = re.exec(source)) !== null) {
      const doc = match[1] || '';
      const name = match[2];
      const paramList = match[3] || '';
      if (!/^[A-Z]/.test(name) && name !== 'runDelegatedCopiedAttack') continue;

      const exampleTexts = extractQuotedExamples(doc);
      const description = stripJsDoc(doc).slice(0, 280) || `Engine prefab ${name}`;
      const params = parseParams(paramList);
      const scope = inferScope(file, name, exampleTexts);
      const internal = isInternal(name);
      const mined = usage.get(name);

      prefabs.push({
        id: name,
        name,
        file,
        importFrom,
        importNames: [name],
        description,
        exampleTexts,
        scope,
        params,
        signature: `${name}(${paramList.replace(/\s+/g, ' ').trim()})`,
        internal,
        curated: false,
        usageCount: mined?.count || 0,
        callSamples: mined?.samples || [],
      });
    }
  }

  prefabs.sort((a, b) => {
    if (Boolean(a.internal) !== Boolean(b.internal)) return a.internal ? 1 : -1;
    if ((b.usageCount || 0) !== (a.usageCount || 0)) return (b.usageCount || 0) - (a.usageCount || 0);
    return a.name.localeCompare(b.name);
  });

  return {
    generatedAt: new Date().toISOString(),
    prefabRoot: relative(cardBuilderRoot, prefabRoot).replaceAll(sep, '/'),
    count: prefabs.length,
    prefabs,
  };
}

export function writeEnginePrefabIndex(outPath = join(cardBuilderRoot, 'data/engine-prefabs.json')) {
  const index = buildEnginePrefabIndex();
  writeFileSync(outPath, JSON.stringify(index, null, 2), 'utf8');
  return index;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  const index = writeEnginePrefabIndex();
  console.log(`Indexed ${index.count} engine prefabs → data/engine-prefabs.json`);
}
