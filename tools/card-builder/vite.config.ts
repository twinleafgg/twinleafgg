import { defineConfig, type Plugin } from 'vite';
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildEnginePrefabIndex } from './lib/engineIndex.mjs';
import {
  classNameForVariant,
  emptySignature,
  fullNameForVariant,
  signaturesMatch,
  toPascalClassName,
  variantOccurrence,
  type CardSignature,
  type NamedEffect,
} from './src/cardIdentity';
import { setDirectoryLookupCodes, toServerSetCode } from './src/data/serverSetCodes';

const rootDir = dirname(fileURLToPath(import.meta.url));
const dataRoot = join(rootDir, 'data', 'pokemon-tcg-data');
const implementedCardIdsPath = join(rootDir, '../../ptcg-server/implementedCardIds.json');
const serverSetsRoot = join(rootDir, '../../ptcg-server/src/sets');
const REPRINT_FILE_NAMES = new Set(['other-prints.ts', 'full-art.ts', 'alt-arts.ts']);
const SKIP_FILE_NAMES = new Set(['index.ts']);

interface ServerEffect {
  source: string;
  effectText: string;
  attackText?: string;
  kind: 'attack' | 'power' | 'trainer' | 'energy';
  body: string[];
  imports: string[];
  similarity: number;
  bodyMode?: 'branch' | 'full';
  cardName?: string;
  set?: string;
  fullName?: string;
  prefabsUsed?: string[];
  guard?: string;
}

function decodeString(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function extractStringExpression(expression: string): string {
  return [...expression.matchAll(/'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"/g)]
    .map(match => decodeString(match[1] ?? match[2] ?? ''))
    .join('');
}

function extractPublicText(source: string): string {
  const match = source.match(/public\s+text(?:\s*:\s*string)?\s*=\s*([\s\S]*?);/);
  return match ? extractStringExpression(match[1]) : '';
}

/**
 * Normalize game imports to `../../game/...` for the JSON effect catalog index.
 * Depth is intentionally fixed for the catalog; `normalizeSavedSource` rewrites
 * paths to the correct relative depth when cards are saved into set folders.
 */
function normalizeGameImport(line: string): string {
  return line.replace(
    /from ['"][^'"]*\/game(\/[^'"]*)?['"]/,
    (_match, suffix = '') => `from '../../game${suffix}'`
  );
}

function sourceUsesName(source: string, name: string): boolean {
  if (!name || name === '*') return name === '*' && /\*/.test(source);
  if (/^[A-Za-z_$][\w$]*$/.test(name)) {
    return new RegExp(`\\b${name}\\b`).test(source);
  }
  return source.includes(name);
}

function matchingBrace(source: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if (char === '{') {
      depth++;
    } else if (char === '}' && --depth === 0) {
      return i;
    }
  }
  return -1;
}

function collectTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? collectTsFiles(path) : entry.name.endsWith('.ts') ? [path] : [];
  });
}

function jsonResponse(res: ServerResponse, status: number, value: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(value));
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function toFileName(className: string): string {
  // Normalize possessives first so "Hop'sPhantump" / "HopSPhantump" → hops-phantump
  const normalized = className
    .replace(/[''\u2019]s(?=[A-Z])/g, 's')
    .replace(/([A-Z])S([A-Z])/g, '$1s$2'); // HopSPhantump → HopsPhantump
  return normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function isEnergySetDirectory(dir: string): boolean {
  return /(?:^|[/\\])set-[^/\\]*-energy$/i.test(dir);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolve the ptcg-server set folder for a set code (e.g. TEF → set-temporal-forces).
 * Promo catalog codes (PR-SV, PR-SM, …) are rewritten to server codes (SVP, SMP) first.
 * When a code appears in multiple folders (misplaced cards / energy reprints), prefer the
 * directory with the most declaring files. Ties prefer the dedicated *-energy folder for
 * energy set codes (MEE, SVE, …), otherwise the non-energy folder.
 */
function findSetDirectory(set: string): string | undefined {
  const lookupCodes = setDirectoryLookupCodes(set);
  if (lookupCodes.length === 0) return undefined;
  const setPattern = new RegExp(
    `public set(?:\\s*:\\s*string)?\\s*=\\s*['"](?:${lookupCodes.map(escapeRegExp).join('|')})['"]`
  );
  const counts = new Map<string, number>();
  for (const file of collectTsFiles(serverSetsRoot)) {
    const source = readFileSync(file, 'utf8');
    if (setPattern.test(source)) {
      const dir = dirname(file);
      counts.set(dir, (counts.get(dir) || 0) + 1);
    }
  }
  if (counts.size === 0) return undefined;
  if (counts.size === 1) return [...counts.keys()][0];

  const serverSet = toServerSetCode(set);
  const preferEnergyFolder = /E$/i.test(serverSet) && serverSet.length === 3 && serverSet !== 'BS';
  const ranked = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    const aEnergy = isEnergySetDirectory(a[0]);
    const bEnergy = isEnergySetDirectory(b[0]);
    if (aEnergy !== bEnergy) {
      if (preferEnergyFolder) return aEnergy ? -1 : 1;
      return aEnergy ? 1 : -1;
    }
    return a[0].localeCompare(b[0]);
  });
  return ranked[0][0];
}

interface ReprintCandidateRecord {
  className: string;
  name: string;
  set: string;
  setNumber: string;
  fullName: string;
  sourcePath: string;
  filePath: string;
  signature: CardSignature;
  isReprintFile: boolean;
  identical: boolean;
}

function extractPublicString(source: string, property: string): string {
  const match = source.match(new RegExp(`public\\s+${property}(?:\\s*:\\s*string)?\\s*=\\s*([\\s\\S]*?);`));
  return match ? extractStringExpression(match[1]) : '';
}

function matchingBracket(source: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if (char === '[') {
      depth++;
    } else if (char === ']' && --depth === 0) {
      return i;
    }
  }
  return -1;
}

function extractNamedEffects(classSource: string, property: 'attacks' | 'powers'): NamedEffect[] | undefined {
  const match = classSource.match(new RegExp(`public\\s+${property}(?:\\s*:\\s*[^=]+)?\\s*=\\s*`));
  if (!match || match.index === undefined) return undefined;
  let i = match.index + match[0].length;
  while (i < classSource.length && /\s/.test(classSource[i])) i++;
  if (classSource[i] !== '[') return [];
  const close = matchingBracket(classSource, i);
  if (close < 0) return [];
  const body = classSource.slice(i + 1, close);
  const effects: NamedEffect[] = [];
  let pos = 0;
  while (pos < body.length) {
    const open = body.indexOf('{', pos);
    if (open < 0) break;
    const end = matchingBrace(body, open);
    if (end < 0) break;
    const objectBody = body.slice(open + 1, end);
    const nameMatch = objectBody.match(/\bname\s*:\s*(['"`])([\s\S]*?)\1/);
    const textMatch = objectBody.match(/\btext\s*:\s*(['"`])([\s\S]*?)\1/);
    effects.push({
      name: nameMatch ? decodeString(nameMatch[2]) : '',
      text: textMatch ? decodeString(textMatch[2]) : '',
    });
    pos = end + 1;
  }
  return effects;
}

function isReprintWrapperFile(filePath: string): boolean {
  const base = filePath.split(sep).pop() || '';
  return REPRINT_FILE_NAMES.has(base);
}

function findReprintCandidates(
  set: string,
  name: string,
  excludeSetNumber = '',
  draftSignature: CardSignature = emptySignature()
): ReprintCandidateRecord[] {
  const directory = findSetDirectory(set);
  const normalizedName = name.trim().toLowerCase();
  const normalizedSetNumber = excludeSetNumber.trim();
  if (!directory || !normalizedName) return [];

  interface ParsedClass {
    className: string;
    extendsName: string;
    classSource: string;
    filePath: string;
  }

  const classes = collectTsFiles(serverSetsRoot).flatMap(filePath => {
      const source = readFileSync(filePath, 'utf8');
      return [...source.matchAll(/^export class\s+([A-Za-z_$][\w$]*)[^\{]*\{/gm)].flatMap(match => {
        if (match.index === undefined) return [];
        const open = source.indexOf('{', match.index);
        const close = open < 0 ? -1 : matchingBrace(source, open);
        if (open < 0 || close < 0) return [];
        const declaration = match[0];
        return [{
          className: match[1],
          extendsName: declaration.match(/\bextends\s+([A-Za-z_$][\w$]*)/)?.[1] || '',
          classSource: source.slice(match.index, close + 1),
          filePath,
        }];
      });
    });
  const classByName = new Map<string, ParsedClass>();
  for (const parsed of classes) {
    if (!classByName.has(parsed.className)) classByName.set(parsed.className, parsed);
  }
  const resolveProperty = (parsed: ParsedClass, property: string, seen = new Set<string>()): string => {
    const own = extractPublicString(parsed.classSource, property);
    if (own || !parsed.extendsName || seen.has(parsed.className)) return own;
    seen.add(parsed.className);
    const parent = classByName.get(parsed.extendsName);
    return parent ? resolveProperty(parent, property, seen) : '';
  };
  const resolveNamedEffects = (
    parsed: ParsedClass,
    property: 'attacks' | 'powers',
    seen = new Set<string>()
  ): NamedEffect[] => {
    const own = extractNamedEffects(parsed.classSource, property);
    if (own !== undefined) return own;
    if (!parsed.extendsName || seen.has(parsed.className)) return [];
    seen.add(parsed.className);
    const parent = classByName.get(parsed.extendsName);
    return parent ? resolveNamedEffects(parent, property, seen) : [];
  };
  const resolveEffectText = (parsed: ParsedClass, seen = new Set<string>()): string => {
    const own = extractPublicText(parsed.classSource);
    if (own || !parsed.extendsName || seen.has(parsed.className)) return own;
    seen.add(parsed.className);
    const parent = classByName.get(parsed.extendsName);
    return parent ? resolveEffectText(parent, seen) : '';
  };
  const resolveSignature = (parsed: ParsedClass): CardSignature => {
    const attacks = resolveNamedEffects(parsed, 'attacks');
    const powers = resolveNamedEffects(parsed, 'powers');
    const effectText = attacks.length === 0 && powers.length === 0 ? resolveEffectText(parsed) : '';
    return { attacks, powers, effectText };
  };

  return classes
    .filter(parsed => parsed.filePath === directory || parsed.filePath.startsWith(`${directory}${sep}`))
    .map(parsed => {
      const cardName = resolveProperty(parsed, 'name');
      const cardSet = resolveProperty(parsed, 'set').toUpperCase();
      const setNumber = extractPublicString(parsed.classSource, 'setNumber');
      const signature = resolveSignature(parsed);
      return {
        className: parsed.className,
        name: cardName,
        set: cardSet,
        setNumber,
        fullName: extractPublicString(parsed.classSource, 'fullName') || resolveProperty(parsed, 'fullName'),
        sourcePath: relative(serverSetsRoot, parsed.filePath).replaceAll(sep, '/'),
        filePath: parsed.filePath,
        signature,
        isReprintFile: isReprintWrapperFile(parsed.filePath),
        identical: signaturesMatch(draftSignature, signature),
      };
    })
    .filter(candidate => {
      if (
        toServerSetCode(candidate.set) !== toServerSetCode(set) ||
        candidate.name.trim().toLowerCase() !== normalizedName
      ) {
        return false;
      }
      return !(normalizedSetNumber && candidate.setNumber === normalizedSetNumber);
    })
    .filter((candidate, index, all) => all.findIndex(other =>
      other.className === candidate.className && other.sourcePath === candidate.sourcePath
    ) === index)
    .sort((a, b) => a.set.localeCompare(b.set));
}

function parseDraftSignature(payload: {
  extends?: string;
  hasAttacks?: boolean;
  hasPowers?: boolean;
  attacks?: Array<{ name?: string; text?: string }>;
  powers?: Array<{ name?: string; text?: string }>;
  trainerText?: string;
  energyText?: string;
}): CardSignature {
  const cardBase = payload.extends === 'TrainerCard' || payload.extends === 'EnergyCard'
    ? payload.extends
    : 'PokemonCard';
  if (cardBase === 'TrainerCard') {
    return { attacks: [], powers: [], effectText: payload.trainerText ?? '' };
  }
  if (cardBase === 'EnergyCard') {
    return { attacks: [], powers: [], effectText: payload.energyText ?? '' };
  }
  return {
    attacks: payload.hasAttacks
      ? (payload.attacks ?? []).map(a => ({ name: (a.name ?? '').trim(), text: a.text ?? '' }))
      : [],
    powers: payload.hasPowers
      ? (payload.powers ?? []).map(p => ({ name: (p.name ?? '').trim(), text: p.text ?? '' }))
      : [],
    effectText: '',
  };
}

async function serveReprintCandidates(req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> {
  const path = req.url?.split('?')[0];
  if (path !== '/reprint-candidates') {
    next();
    return;
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    next();
    return;
  }

  try {
    let set = '';
    let name = '';
    let excludeSetNumber = '';
    let draftSignature = emptySignature();

    if (req.method === 'POST') {
      const payload = JSON.parse(await readRequestBody(req)) as {
        set?: string;
        name?: string;
        excludeSetNumber?: string;
        extends?: string;
        hasAttacks?: boolean;
        hasPowers?: boolean;
        attacks?: Array<{ name?: string; text?: string }>;
        powers?: Array<{ name?: string; text?: string }>;
        trainerText?: string;
        energyText?: string;
      };
      set = payload.set?.trim().toUpperCase() || '';
      name = payload.name?.trim() || '';
      excludeSetNumber = payload.excludeSetNumber?.trim() || '';
      draftSignature = parseDraftSignature(payload);
    } else {
      const url = new URL(req.url || '', 'http://localhost');
      set = url.searchParams.get('set')?.trim().toUpperCase() || '';
      name = url.searchParams.get('name')?.trim() || '';
      excludeSetNumber = url.searchParams.get('excludeSetNumber')?.trim() || '';
    }

    if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(set) || !name) {
      jsonResponse(res, 400, { error: 'Set code and card name are required.' });
      return;
    }

    const candidates = findReprintCandidates(set, name, excludeSetNumber, draftSignature);
    const primaryClassNames = candidates
      .filter(candidate => !candidate.isReprintFile)
      .map(candidate => candidate.className);
    const baseClassName = toPascalClassName(name) || 'NewCard';
    const nextOccurrence = variantOccurrence(baseClassName, primaryClassNames);

    jsonResponse(res, 200, {
      candidates: candidates.map(({ filePath: _filePath, signature: _signature, ...candidate }) => candidate),
      nextOccurrence,
      suggestedClassName: classNameForVariant(baseClassName, nextOccurrence),
      suggestedFullName: fullNameForVariant(name, set, nextOccurrence),
    });
  } catch (error) {
    jsonResponse(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

function normalizeGameModulePath(module: string, importBase: string): string {
  if (!module.includes('/game')) return module;
  return `${importBase}${module.slice(module.indexOf('/game') + '/game'.length)}`;
}

function normalizeSavedSource(source: string, cardDirectory: string): string {
  const gameDirectory = join(serverSetsRoot, '../game');
  const gameImportBase = relative(cardDirectory, gameDirectory).replaceAll(sep, '/');
  const importBase = gameImportBase.startsWith('.') ? gameImportBase : `./${gameImportBase}`;
  const imports = new Map<string, Set<string>>();
  const otherImports: string[] = [];
  // Optional whitespace after `{` / before `}` so server snippets like
  // `import {WAS_ATTACK_USED, ...} from '...'` are still rewritten.
  const body = source.replace(/^import \{\s*([^}]*)\s*\} from ['"]([^'"]+)['"];?\s*$/gm, (_line, names: string, module: string) => {
    const parsed = names.split(',').map(name => name.trim()).filter(Boolean);
    if (parsed.length === 0) {
      return '';
    }
    const normalizedModule = normalizeGameModulePath(module, importBase);
    const current = imports.get(normalizedModule) ?? new Set<string>();
    parsed.forEach(name => current.add(name));
    imports.set(normalizedModule, current);
    return '';
  });
  const remaining = body.match(/^import .+$/gm) ?? [];
  for (const line of remaining) {
    // Drop empty named imports that didn't match / were left over
    if (/^import \{\s*\} from/.test(line)) continue;
    // Rewrite any leftover import that still points at /game (default, namespace, etc.)
    otherImports.push(
      line.replace(/from ['"]([^'"]+)['"]/, (match, module: string) => {
        if (!module.includes('/game')) return match;
        const normalized = normalizeGameModulePath(module, importBase);
        return match.replace(module, normalized);
      })
    );
  }
  const code = body.replace(/^import .+$/gm, '');
  const generatedImports = [...imports.entries()]
    .map(([module, names]) => {
      const used = [...names].filter(name => sourceUsesName(code, name));
      return used.length > 0 ? `import { ${used.sort().join(', ')} } from '${module}';` : '';
    })
    .filter(Boolean);
  return [
    ...generatedImports,
    ...otherImports,
    '',
    body.replace(/^import .+$/gm, '').trimStart(),
  ].join('\n');
}

function addCardToSetIndex(indexPath: string, className: string, fileName: string): void {
  const source = readFileSync(indexPath, 'utf8');
  const importLine = `import { ${className} } from './${fileName}';`;
  const hasImport = new RegExp(`import \\{\\s*${className}\\s*\\} from '\\./`).test(source);
  const hasCard = new RegExp(`new ${className}\\(\\)`).test(source);
  let updated = source;

  if (!hasImport) {
    const importLines = [...updated.matchAll(/^import \{ ([^}]+) \} from '\.\/([^']+)';$/gm)];
    const nextImport = importLines.find(match => match[1].trim().localeCompare(className) > 0);
    if (nextImport) {
      updated = updated.slice(0, nextImport.index) + `${importLine}\n` + updated.slice(nextImport.index);
    } else {
      const exportIndex = updated.indexOf('export const');
      updated = `${updated.slice(0, exportIndex)}${importLine}\n${updated.slice(exportIndex)}`;
    }
  }

  if (!hasCard) {
    const otherPrintsIndex = updated.indexOf('  // Other Prints');
    const beforeOtherPrints = otherPrintsIndex >= 0 ? updated.slice(0, otherPrintsIndex) : updated;
    const cardLines = [...beforeOtherPrints.matchAll(/^ {2}new ([A-Za-z0-9_]+)\(\),$/gm)];
    const nextCard = cardLines.find(match => match[1].localeCompare(className) > 0);
    const cardLine = `  new ${className}(),\n`;
    if (nextCard) {
      updated = updated.slice(0, nextCard.index) + cardLine + updated.slice(nextCard.index);
    } else if (otherPrintsIndex >= 0) {
      updated = updated.slice(0, otherPrintsIndex) + cardLine + updated.slice(otherPrintsIndex);
    } else {
      const closingIndex = updated.lastIndexOf('];');
      updated = updated.slice(0, closingIndex) + cardLine + updated.slice(closingIndex);
    }
  }

  if (updated !== source) writeFileSync(indexPath, updated, 'utf8');
}

function removeCardFromSetIndex(indexPath: string, className: string): void {
  if (!existsSync(indexPath)) return;
  const source = readFileSync(indexPath, 'utf8');
  let updated = source.replace(
    new RegExp(`^import \\{\\s*${escapeRegExp(className)}\\s*\\} from '[^']+';\\r?\\n?`, 'gm'),
    ''
  );
  updated = updated.replace(
    /import \{([^}]+)\} from ('[^']+');/g,
    (line, names: string, module: string) => {
      const parts = names.split(',').map(name => name.trim()).filter(Boolean);
      if (!parts.includes(className)) return line;
      const kept = parts.filter(name => name !== className);
      return kept.length > 0 ? `import { ${kept.join(', ')} } from ${module};` : '';
    }
  );
  updated = updated.replace(new RegExp(`^ {2}new ${escapeRegExp(className)}\\(\\),\\r?\\n?`, 'gm'), '');
  updated = updated.replace(/\n{3,}/g, '\n\n');
  if (updated !== source) writeFileSync(indexPath, updated, 'utf8');
}

function removeUnusedImports(source: string): string {
  const { imports, body } = splitImportLines(source);
  const kept = imports.filter(line => {
    const match = line.match(/^import \{([^}]+)\} from/);
    if (!match) return true;
    const names = match[1].split(',').map(name => name.trim()).filter(Boolean);
    const used = names.filter(name => sourceUsesName(body, name));
    return used.length > 0;
  }).map(line => {
    const match = line.match(/^import \{([^}]+)\} from ('[^']+');$/);
    if (!match) return line;
    const names = match[1].split(',').map(name => name.trim()).filter(Boolean);
    const used = names.filter(name => sourceUsesName(body, name));
    return used.length === names.length
      ? line
      : `import { ${used.join(', ')} } from ${match[2]};`;
  });
  return `${kept.length ? `${kept.join('\n')}\n\n` : ''}${body.trimStart()}`.replace(/\n{3,}/g, '\n\n');
}

function removeExportedClass(source: string, className: string): string {
  const match = new RegExp(`export class\\s+${escapeRegExp(className)}\\b`).exec(source);
  if (!match || match.index === undefined) {
    throw new Error(`Class ${className} was not found in that file.`);
  }
  const open = source.indexOf('{', match.index);
  const close = open < 0 ? -1 : matchingBrace(source, open);
  if (open < 0 || close < 0) {
    throw new Error(`Could not locate the ${className} class body.`);
  }
  let start = match.index;
  while (start > 0 && (source[start - 1] === '\n' || source[start - 1] === '\r')) start--;
  const updated = `${source.slice(0, start)}\n${source.slice(close + 1)}`;
  return removeUnusedImports(updated);
}

function resolveSetsPath(sourcePath: string): string {
  const normalized = normalize(join(serverSetsRoot, sourcePath));
  if (!normalized.startsWith(serverSetsRoot + sep) && normalized !== serverSetsRoot) {
    throw new Error('Source path is outside ptcg-server/src/sets.');
  }
  return normalized;
}

function removeCardFromDisk(sourcePath: string, className: string): { message: string; deletedFile: boolean } {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(className)) {
    throw new Error('Class name is invalid.');
  }
  if (!sourcePath || sourcePath.includes('..') || sourcePath.endsWith('/index.ts') || sourcePath === 'index.ts') {
    throw new Error('That source path cannot be removed.');
  }

  const filePath = resolveSetsPath(sourcePath);
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error(`File not found: ${sourcePath}`);
  }

  const fileName = filePath.split(sep).pop() || '';
  const directory = dirname(filePath);
  const source = readFileSync(filePath, 'utf8');
  if (!hasExportedClass(source, className)) {
    throw new Error(`Class ${className} was not found in ${sourcePath}.`);
  }

  let deletedFile = false;
  if (['other-prints.ts', 'full-art.ts', 'alt-arts.ts'].includes(fileName)) {
    const updated = removeExportedClass(source, className);
    if (!updated.trim()) {
      unlinkSync(filePath);
      deletedFile = true;
    } else {
      writeFileSync(filePath, updated.endsWith('\n') ? updated : `${updated}\n`, 'utf8');
    }
  } else {
    // Single-card stub / implementation files: delete the whole file.
    const exportedClasses = [...source.matchAll(/^export class\s+([A-Za-z_$][\w$]*)/gm)].map(match => match[1]);
    if (exportedClasses.length > 1) {
      const updated = removeExportedClass(source, className);
      writeFileSync(filePath, updated.endsWith('\n') ? updated : `${updated}\n`, 'utf8');
    } else {
      unlinkSync(filePath);
      deletedFile = true;
    }
  }

  removeCardFromSetIndex(join(directory, 'index.ts'), className);
  return {
    message: deletedFile
      ? `Deleted ${sourcePath} and removed ${className} from index.ts`
      : `Removed ${className} from ${sourcePath} and index.ts`,
    deletedFile,
  };
}

async function serveRemoveCard(req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> {
  if (req.url?.split('?')[0] !== '/remove-card' || req.method !== 'POST') {
    next();
    return;
  }

  try {
    const payload = JSON.parse(await readRequestBody(req)) as {
      sourcePath?: string;
      className?: string;
    };
    const sourcePath = payload.sourcePath?.trim().replaceAll('\\', '/') || '';
    const className = payload.className?.trim() || '';
    const result = removeCardFromDisk(sourcePath, className);
    jsonResponse(res, 200, result);
  } catch (error) {
    jsonResponse(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

function hasExportedClass(source: string, className: string): boolean {
  return new RegExp(`export class\\s+${escapeRegExp(className)}\\b`).test(source);
}

function splitImportLines(source: string): { imports: string[]; body: string } {
  const imports: string[] = [];
  const body: string[] = [];
  for (const line of source.split('\n')) {
    if (/^\s*import\s/.test(line) && /;\s*$/.test(line)) {
      imports.push(line.trim());
    } else {
      body.push(line);
    }
  }
  return { imports, body: body.join('\n') };
}

function appendOrReplaceExportedClass(source: string, className: string, replacement: string): string {
  const sourceParts = splitImportLines(source);
  const replacementParts = splitImportLines(replacement);
  const imports = [...new Set([...sourceParts.imports, ...replacementParts.imports])];
  const body = sourceParts.body;
  const replacementBody = replacementParts.body;
  const match = new RegExp(`export class\\s+${escapeRegExp(className)}\\b`).exec(body);
  let updatedBody: string;
  if (!match || match.index === undefined) {
    updatedBody = `${body.trimEnd()}\n\n${replacementBody.trim()}`;
  } else {
    const open = body.indexOf('{', match.index);
    const close = open < 0 ? -1 : matchingBrace(body, open);
    if (open < 0 || close < 0) throw new Error(`Could not locate the ${className} class body.`);
    updatedBody = `${body.slice(0, match.index).trimEnd()}\n\n${replacementBody.trim()}${body.slice(close + 1)}`;
  }
  return `${imports.length ? `${imports.join('\n')}\n\n` : ''}${updatedBody.trimStart()}\n`;
}

function uniqueReprintClassName(directory: string, requested: string, set: string, setNumber: string, existingOtherPrints: string): string {
  if (hasExportedClass(existingOtherPrints, requested)) return requested;
  const occupied = collectTsFiles(directory).some(file => hasExportedClass(readFileSync(file, 'utf8'), requested));
  if (!occupied) return requested;
  const suffix = `${set}${setNumber}`.replace(/[^A-Za-z0-9]/g, '');
  let candidate = `${requested}${suffix}`;
  let index = 2;
  while (collectTsFiles(directory).some(file => hasExportedClass(readFileSync(file, 'utf8'), candidate))) {
    candidate = `${requested}${suffix}${index++}`;
  }
  return candidate;
}

function buildReprintSource(
  candidate: ReprintCandidateRecord,
  directory: string,
  className: string,
  payload: { set: string; setNumber: string; fullName: string; regulationMark?: string }
): string {
  const modulePath = relative(directory, candidate.filePath).replaceAll(sep, '/').replace(/\.ts$/, '');
  const importPath = modulePath.startsWith('.') ? modulePath : `./${modulePath}`;
  const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const lines = [
    `import { ${candidate.className} } from '${importPath}';`,
    '',
    `export class ${className} extends ${candidate.className} {`,
  ];
  if (payload.regulationMark?.trim()) lines.push(`  public regulationMark = ${quote(payload.regulationMark.trim())};`);
  lines.push(
    `  public setNumber = ${quote(payload.setNumber.trim())};`,
    `  public fullName = ${quote(payload.fullName.trim())};`,
    `  public set = ${quote(payload.set.trim().toUpperCase())};`,
    '}',
  );
  return lines.join('\n');
}

async function serveSaveCard(req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> {
  if (req.url?.split('?')[0] !== '/save-card' || req.method !== 'POST') {
    next();
    return;
  }

  try {
    const payload = JSON.parse(await readRequestBody(req)) as {
      set?: string;
      className?: string;
      source?: string;
      overwrite?: boolean;
      reprint?: {
        className: string;
        sourceClassName: string;
        sourcePath: string;
        name: string;
        set: string;
        setNumber: string;
        fullName: string;
        regulationMark?: string;
      };
    };
    const set = payload.set?.trim().toUpperCase() || '';
    const className = payload.className?.trim() || '';
    if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(set) || !/^[A-Za-z][A-Za-z0-9]*$/.test(className)) {
      jsonResponse(res, 400, { error: 'Set code or class name is invalid.' });
      return;
    }
    if (!payload.source?.trim() && !payload.reprint) {
      jsonResponse(res, 400, { error: 'Generated source is empty.' });
      return;
    }
    const directory = findSetDirectory(set);
    if (!directory) {
      jsonResponse(res, 404, {
        error: `Could not find a ptcg-server set folder for ${set}.`,
      });
      return;
    }
    if (payload.reprint) {
      const reprint = payload.reprint;
      const requiredReprintFields = [
        reprint.className,
        reprint.sourceClassName,
        reprint.sourcePath,
        reprint.name,
        reprint.set,
        reprint.setNumber,
        reprint.fullName,
      ];
      if (
        requiredReprintFields.some(value => typeof value !== 'string') ||
        !/^[A-Za-z][A-Za-z0-9]*$/.test(reprint.className) ||
        !reprint.name.trim()
      ) {
        jsonResponse(res, 400, { error: 'Reprint metadata is invalid.' });
        return;
      }
      const candidate = findReprintCandidates(set, reprint.name, '').find(
        item => item.className === reprint.sourceClassName && item.sourcePath === reprint.sourcePath
      );
      if (!candidate) {
        jsonResponse(res, 400, { error: 'The selected reprint source is no longer available.' });
        return;
      }
      const otherPrintsPath = join(directory, 'other-prints.ts');
      const existingOtherPrints = existsSync(otherPrintsPath) ? readFileSync(otherPrintsPath, 'utf8') : '';
      const savedClassName = uniqueReprintClassName(directory, reprint.className, set, reprint.setNumber, existingOtherPrints);
      if (hasExportedClass(existingOtherPrints, savedClassName) && !payload.overwrite) {
        jsonResponse(res, 409, { error: 'That reprint class already exists.', path: otherPrintsPath });
        return;
      }
      const wrapper = buildReprintSource(candidate, directory, savedClassName, reprint);
      const updatedOtherPrints = appendOrReplaceExportedClass(existingOtherPrints, savedClassName, wrapper);
      writeFileSync(otherPrintsPath, updatedOtherPrints, 'utf8');
      addCardToSetIndex(join(directory, 'index.ts'), savedClassName, 'other-prints');
      jsonResponse(res, 200, {
        message: `Saved ${savedClassName} to ${otherPrintsPath.replace(`${serverSetsRoot}/`, '')}`,
        path: otherPrintsPath,
        className: savedClassName,
      });
      return;
    }

    const filePath = join(directory, `${toFileName(className)}.ts`);
    if (existsSync(filePath) && !payload.overwrite) {
      jsonResponse(res, 409, { error: 'File already exists.', path: filePath });
      return;
    }
    writeFileSync(filePath, normalizeSavedSource(payload.source, directory), 'utf8');
    addCardToSetIndex(join(directory, 'index.ts'), className, toFileName(className));
    jsonResponse(res, 200, {
      message: `Saved ${filePath.replace(`${serverSetsRoot}/`, '')}`,
      path: filePath,
    });
  } catch (error) {
    jsonResponse(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

function extractReducerBody(source: string): string | undefined {
  const reducerStart = source.indexOf('public reduceEffect(');
  if (reducerStart < 0) return undefined;
  const open = source.indexOf('{', reducerStart);
  const close = open < 0 ? -1 : matchingBrace(source, open);
  return close < 0 ? undefined : source.slice(open + 1, close);
}

function extractBranchBody(reducer: string, pattern: RegExp): string[] | undefined {
  const match = reducer.match(pattern);
  if (!match || match.index === undefined) return undefined;
  const branchOpen = reducer.indexOf('{', match.index);
  const branchClose = matchingBrace(reducer, branchOpen);
  if (branchOpen < 0 || branchClose < 0) return undefined;
  let body = reducer.slice(branchOpen + 1, branchClose).trim().split('\n').filter(Boolean);
  if (body.some(line => /\bplayer\b/.test(line.replace(/const player = effect\.player;/, '')))) {
    body = body.filter(line => !/const player = effect\.player;/.test(line));
    body.unshift('const player = effect.player;');
  } else {
    body = body.filter(line => !/const player = effect\.player;/.test(line));
  }
  return body;
}

function extractHelperFunctions(source: string): string[] {
  const classStart = source.indexOf('export class ');
  if (classStart < 0) return [];
  const sourceClass = source.slice(classStart).match(/export class\s+([A-Za-z_$][\w$]*)/)?.[1];
  const prefix = source.slice(0, classStart);
  const helpers: string[] = [];
  const pattern = /(?:async\s+)?function\s*\*?\s+[A-Za-z_$][\w$]*\s*\(/g;
  for (const match of prefix.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const open = source.indexOf('{', match.index);
    const close = open < 0 ? -1 : matchingBrace(source, open);
    if (close >= 0) {
      const helper = source.slice(match.index, close + 1).trim();
      helpers.push(sourceClass ? helper.replace(new RegExp(`\\b${sourceClass}\\b`, 'g'), 'any') : helper);
    }
  }
  return helpers;
}

function extractArrayTexts(source: string, property: string, until: number): string[] {
  const start = source.indexOf(property);
  if (start < 0 || start >= until) return [];
  const boundaries = ['public attacks', 'public powers', 'public set', 'public reduceEffect(']
    .map(value => source.indexOf(value, start + property.length))
    .filter(index => index >= 0 && index < until);
  const end = boundaries.length > 0 ? Math.min(...boundaries) : until;
  const section = source.slice(start, end);
  return [...section.matchAll(/text\s*:\s*'((?:\\.|[^'])*)'|text\s*:\s*"((?:\\.|[^"])*)"/g)]
    .map(match => decodeString(match[1] ?? match[2] ?? ''));
}

function buildEffectImports(source: string, body: string, kind: ServerEffect['kind']): string[] {
  const imports = source
    .split('\n')
    .filter(line => line.startsWith('import '))
    .filter(line => /^import .+ from ['"]/.test(line))
    .filter(line => !line.includes('/card/pokemon-card') && !line.includes('/card/trainer-card') &&
      !line.includes('/card/energy-card') && !line.includes('effects/effect'))
    .map(normalizeGameImport)
    .map(line => {
      const importMatch = line.match(/^import \{ ([^}]+) \} from/);
      if (!importMatch) return line;
      const names = importMatch[1].split(',').map(name => name.trim())
        .filter(name => sourceUsesName(body, name));
      return names.length > 0 ? line.replace(importMatch[1], names.join(', ')) : '';
    })
    .filter(line => Boolean(line) && !/^import \{\s*\}(\s+from\s+['"][^'"]+['"])?\s*;?\s*$/.test(line));
  const markerImport = kind === 'attack'
    ? `import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';`
    : kind === 'power'
      ? `import { WAS_POWER_USED } from '../../game/store/prefabs/prefabs';`
      : kind === 'trainer'
        ? `import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';`
        : '';
  if (markerImport && !imports.some(line => line.includes(kind === 'trainer' ? 'WAS_TRAINER_USED' : kind === 'power' ? 'WAS_POWER_USED' : 'WAS_ATTACK_USED'))) {
    imports.push(markerImport);
  }
  return imports;
}

function extractPrefabsUsed(body: string[]): string[] {
  const found = new Set<string>();
  const text = body.join('\n');
  for (const match of text.matchAll(/\b([A-Z][A-Z0-9_]{3,})\s*\(/g)) {
    found.add(match[1]);
  }
  return [...found].sort();
}

function cardMeta(source: string): { cardName: string; set: string; fullName: string } {
  return {
    cardName: extractPublicString(source, 'name'),
    set: extractPublicString(source, 'set'),
    fullName: extractPublicString(source, 'fullName'),
  };
}

function addServerEffect(
  results: ServerEffect[],
  file: string,
  source: string,
  effectText: string,
  body: string[],
  kind: ServerEffect['kind'],
  bodyMode: ServerEffect['bodyMode'] = 'branch',
  helpers: string[] = [],
  guard = '',
): void {
  if (!effectText.trim() || body.length === 0) return;
  const meta = cardMeta(source);
  results.push({
    source: file.replace(`${serverSetsRoot}/`, ''),
    effectText,
    attackText: effectText,
    kind,
    body,
    imports: buildEffectImports(source, `${body.join('\n')}\n${helpers.join('\n')}`, kind),
    similarity: 1,
    bodyMode,
    helpers,
    cardName: meta.cardName,
    set: meta.set,
    fullName: meta.fullName,
    prefabsUsed: extractPrefabsUsed(body),
    guard,
  });
}

function buildServerEffects(): ServerEffect[] {
  const results: ServerEffect[] = [];
  for (const file of collectTsFiles(serverSetsRoot)) {
    const source = readFileSync(file, 'utf8');
    const reducer = extractReducerBody(source);
    if (!reducer) continue;
    const reducerStart = source.indexOf('public reduceEffect(');
    const helpers = extractHelperFunctions(source);
    const meta = cardMeta(source);

    if (source.includes('extends PokemonCard')) {
      const attackTexts = extractArrayTexts(source, 'public attacks', reducerStart);
      const powerTexts = extractArrayTexts(source, 'public powers', reducerStart);
      const seenAttackBranches = new Set<string>();

      const addAttackBranch = (index: number, body: string[] | undefined, guardLabel: string) => {
        if (!body) return;
        const key = `${index}:${guardLabel}:${body.join('\n')}`;
        if (seenAttackBranches.has(key)) return;
        seenAttackBranches.add(key);
        addServerEffect(results, file, source, attackTexts[index] || '', body, 'attack', 'branch', helpers, guardLabel);
      };

      for (const match of reducer.matchAll(/if\s*\(\s*WAS_ATTACK_USED\(effect,\s*(\d+),\s*this\)\s*\)\s*\{/g)) {
        const body = extractBranchBody(reducer.slice(match.index ?? 0), /^if\s*\(/);
        addAttackBranch(Number(match[1]), body, 'WAS_ATTACK_USED');
      }
      for (const match of reducer.matchAll(/if\s*\(\s*AFTER_ATTACK\(effect,\s*(\d+),\s*this\)\s*\)\s*\{/g)) {
        const body = extractBranchBody(reducer.slice(match.index ?? 0), /^if\s*\(/);
        addAttackBranch(Number(match[1]), body, 'AFTER_ATTACK');
      }
      for (const match of reducer.matchAll(/if\s*\(\s*BEFORE_DAMAGE\(effect,\s*(\d+),\s*this\)\s*\)\s*\{/g)) {
        const body = extractBranchBody(reducer.slice(match.index ?? 0), /^if\s*\(/);
        addAttackBranch(Number(match[1]), body, 'BEFORE_DAMAGE');
      }

      for (const match of reducer.matchAll(/if\s*\(\s*WAS_POWER_USED\(effect,\s*(\d+),\s*this\)\s*\)\s*\{/g)) {
        const body = extractBranchBody(reducer.slice(match.index ?? 0), /^if\s*\(/);
        const index = Number(match[1]);
        if (body) addServerEffect(results, file, source, powerTexts[index] || '', body, 'power', 'branch', helpers, 'WAS_POWER_USED');
      }

      // Evolve / play-from-hand powers (non-prefab and JUST_EVOLVED)
      for (const match of reducer.matchAll(/if\s*\(\s*JUST_EVOLVED\(effect,\s*this\)/g)) {
        const body = extractBranchBody(reducer.slice(match.index ?? 0), /^if\s*\(/);
        const text = powerTexts.find(t => /when you play|evolve|put .* from your hand/i.test(t)) || powerTexts[0] || meta.cardName;
        if (body) addServerEffect(results, file, source, text, body, 'power', 'branch', helpers, 'JUST_EVOLVED');
      }
      for (const match of reducer.matchAll(/if\s*\(\s*effect\s+instanceof\s+PlayPokemonEffect\s*&&\s*effect\.pokemonCard\s*===\s*this\s*\)\s*\{/g)) {
        const body = extractBranchBody(reducer.slice(match.index ?? 0), /^if\s*\(/);
        const text = powerTexts.find(t => /when you put|when you play|from your hand/i.test(t)) || powerTexts.join(' ') || meta.cardName;
        if (body && body.length > 2) {
          addServerEffect(results, file, source, text, body, 'power', 'branch', helpers, 'PlayPokemonEffect');
        }
      }

      // Persistent bodies / damage modifiers (Poke-Body style) — index full reducer keyed by power texts
      for (const powerText of powerTexts) {
        if (!/as long as|pok[eé]-?body|prevent all|each of .* attacks does|damage .* is (increased|reduced)/i.test(powerText)) {
          continue;
        }
        // Prefer DealDamage / PutDamage / CheckRetreatCost branches
        for (const ctor of [
          'DealDamageEffect',
          'PutDamageEffect',
          'CheckRetreatCostEffect',
          'CheckTableStateEffect',
          'AttachEnergyEffect',
          'EndTurnEffect',
          'BetweenTurnsEffect',
        ]) {
          const re = new RegExp(`if\\s*\\(\\s*effect\\s+instanceof\\s+${ctor}[\\s\\S]{0,120}?\\)\\s*\\{`);
          const match = re.exec(reducer);
          if (!match || match.index === undefined) continue;
          const body = extractBranchBody(reducer.slice(match.index), /^if\s*\(/);
          if (body && body.length > 1) {
            addServerEffect(results, file, source, powerText, body, 'power', 'branch', helpers, ctor);
          }
        }
      }

      // Fallback: if attacks have text but no WAS_ATTACK_USED branches were found, index full reducer
      if (attackTexts.some(t => t.trim()) && seenAttackBranches.size === 0) {
        addServerEffect(
          results,
          file,
          source,
          attackTexts.filter(Boolean).join(' '),
          reducer.trim().split('\n').filter(Boolean),
          'attack',
          'full',
          helpers,
          'full-reducer',
        );
      }
    }

    if (source.includes('extends TrainerCard')) {
      const text = extractPublicText(source);
      const trainerBody = extractBranchBody(reducer, /if\s*\(\s*WAS_TRAINER_USED\(effect,\s*this\)\s*\)\s*\{|if\s*\(\s*effect\s+instanceof\s+TrainerEffect\s*&&\s*effect\.trainerCard\s*===\s*this\s*\)\s*\{/);
      if (trainerBody) {
        addServerEffect(results, file, source, text, trainerBody, 'trainer', 'branch', helpers, 'WAS_TRAINER_USED');
      } else {
        addServerEffect(results, file, source, text, reducer.trim().split('\n').filter(Boolean), 'trainer', 'full', helpers, 'full-reducer');
      }
    }

    if (source.includes('extends EnergyCard')) {
      const text = extractPublicText(source);
      addServerEffect(results, file, source, text, reducer.trim().split('\n').filter(Boolean), 'energy', 'full', helpers, 'full-reducer');
    }
  }
  return results;
}

interface DuplicateCardRecord {
  className: string;
  name: string;
  set: string;
  setNumber: string;
  fullName: string;
  sourcePath: string;
  kind: string;
  indexCount: number;
  ownSet?: string;
  ownSetNumber?: string;
  directory?: string;
}

interface DuplicateReason {
  id: string;
  message: string;
}

interface DuplicateGroup {
  key: string;
  reasons: DuplicateReason[];
  cards: DuplicateCardRecord[];
}

function cardFileKind(fileName: string): string {
  if (fileName === 'other-prints.ts') return 'other-prints';
  if (fileName === 'full-art.ts') return 'full-art';
  if (fileName === 'alt-arts.ts') return 'alt-arts';
  return 'implementation';
}

function shouldScanCardFile(filePath: string): boolean {
  const base = filePath.split(sep).pop() || '';
  if (!base.endsWith('.ts')) return false;
  if (SKIP_FILE_NAMES.has(base)) return false;
  if (base.startsWith('generate-')) return false;
  if (base.includes('.test.') || base.includes('.spec.')) return false;
  if (filePath.includes(`${sep}tests${sep}`)) return false;
  return true;
}

function parseIndexInstantiations(indexPath: string): Map<string, number> {
  const counts = new Map<string, number>();
  if (!existsSync(indexPath)) return counts;
  const source = readFileSync(indexPath, 'utf8');
  for (const match of source.matchAll(/\bnew\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const className = match[1];
    counts.set(className, (counts.get(className) || 0) + 1);
  }
  return counts;
}

function findCardDuplicates(): DuplicateGroup[] {
  interface ParsedClass {
    className: string;
    extendsName: string;
    classSource: string;
    filePath: string;
  }

  const allFiles = collectTsFiles(serverSetsRoot);
  const classes = allFiles
    .filter(shouldScanCardFile)
    .flatMap(filePath => {
      const source = readFileSync(filePath, 'utf8');
      return [...source.matchAll(/^export class\s+([A-Za-z_$][\w$]*)[^\{]*\{/gm)].flatMap(match => {
        if (match.index === undefined) return [];
        const open = source.indexOf('{', match.index);
        const close = open < 0 ? -1 : matchingBrace(source, open);
        if (open < 0 || close < 0) return [];
        const declaration = match[0];
        const extendsName = declaration.match(/\bextends\s+([A-Za-z_$][\w$]*)/)?.[1] || '';
        // Skip non-card helper classes that don't extend a card base or another card
        if (!extendsName) return [];
        return [{
          className: match[1],
          extendsName,
          classSource: source.slice(match.index, close + 1),
          filePath,
        }];
      });
    });

  const classByName = new Map<string, ParsedClass>();
  for (const parsed of classes) {
    if (!classByName.has(parsed.className)) classByName.set(parsed.className, parsed);
  }

  const resolveProperty = (parsed: ParsedClass, property: string, seen = new Set<string>()): string => {
    const own = extractPublicString(parsed.classSource, property);
    if (own || !parsed.extendsName || seen.has(parsed.className)) return own;
    seen.add(parsed.className);
    const parent = classByName.get(parsed.extendsName);
    return parent ? resolveProperty(parent, property, seen) : '';
  };

  const indexCountsByDir = new Map<string, Map<string, number>>();
  const getIndexCounts = (dir: string): Map<string, number> => {
    let counts = indexCountsByDir.get(dir);
    if (!counts) {
      counts = parseIndexInstantiations(join(dir, 'index.ts'));
      indexCountsByDir.set(dir, counts);
    }
    return counts;
  };

  const cards: DuplicateCardRecord[] = classes.map(parsed => {
    const fileName = parsed.filePath.split(sep).pop() || '';
    const dir = dirname(parsed.filePath);
    const indexCounts = getIndexCounts(dir);
    const ownSet = extractPublicString(parsed.classSource, 'set').toUpperCase();
    const ownSetNumber = extractPublicString(parsed.classSource, 'setNumber');
    const set = ownSet || resolveProperty(parsed, 'set').toUpperCase();
    const setNumber = ownSetNumber || resolveProperty(parsed, 'setNumber');
    const name = resolveProperty(parsed, 'name');
    const fullName = extractPublicString(parsed.classSource, 'fullName') || resolveProperty(parsed, 'fullName');
    return {
      className: parsed.className,
      name,
      set,
      setNumber,
      fullName,
      sourcePath: relative(serverSetsRoot, parsed.filePath).replaceAll(sep, '/'),
      kind: cardFileKind(fileName),
      indexCount: indexCounts.get(parsed.className) || 0,
      ownSet,
      ownSetNumber,
      directory: relative(serverSetsRoot, dir).replaceAll(sep, '/') || '.',
    };
  }).filter(card => card.set || card.setNumber || card.fullName);

  // Reprints often omit `public set` and inherit the parent print's set code.
  // Prefer an own set, else the unique own-set declared by siblings in the same folder.
  const directorySets = new Map<string, Set<string>>();
  for (const card of cards) {
    if (!card.ownSet) continue;
    const sets = directorySets.get(card.directory) || new Set<string>();
    sets.add(card.ownSet);
    directorySets.set(card.directory, sets);
  }
  for (const card of cards) {
    if (card.ownSet) {
      card.set = card.ownSet;
      continue;
    }
    const siblingSets = directorySets.get(card.directory);
    // Do not fall back to an inherited parent set — that causes cross-set false positives
    // when reprints only override setNumber/fullName.
    card.set = siblingSets && siblingSets.size === 1 ? [...siblingSets][0] : '';
  }

  const groups = new Map<string, DuplicateGroup>();

  const addGroup = (key: string, reason: DuplicateReason, groupCards: DuplicateCardRecord[]) => {
    const existing = groups.get(key);
    const strip = (c: DuplicateCardRecord): DuplicateCardRecord => ({
      className: c.className,
      name: c.name,
      set: c.set,
      setNumber: c.setNumber,
      fullName: c.fullName,
      sourcePath: c.sourcePath,
      kind: c.kind,
      indexCount: c.indexCount,
    });
    if (existing) {
      if (!existing.reasons.some(r => r.id === reason.id && r.message === reason.message)) {
        existing.reasons.push(reason);
      }
      for (const card of groupCards) {
        if (!existing.cards.some(c => c.className === card.className && c.sourcePath === card.sourcePath)) {
          existing.cards.push(strip(card));
        }
      }
      return;
    }
    groups.set(key, {
      key,
      reasons: [reason],
      cards: groupCards.map(strip),
    });
  };

  // same-set-number: ≥2 classes share (set, setNumber)
  const bySetNumber = new Map<string, DuplicateCardRecord[]>();
  for (const card of cards) {
    if (!card.set || !card.setNumber) continue;
    const key = `${card.set}:${card.setNumber}`;
    const list = bySetNumber.get(key) || [];
    list.push(card);
    bySetNumber.set(key, list);
  }
  for (const [key, list] of bySetNumber) {
    const unique = list.filter((card, index, all) =>
      all.findIndex(other => other.className === card.className && other.sourcePath === card.sourcePath) === index
    );
    if (unique.length < 2) continue;
    const names = unique.map(c => c.className).join(' and ');
    addGroup(key, {
      id: 'same-set-number',
      message: `Same set + set number (${key.replace(':', ' ')}) registered by ${names}`,
    }, unique);

    // duplicate-other-prints within the colliding group
    const reprintCards = unique.filter(c =>
      REPRINT_FILE_NAMES.has(c.sourcePath.split('/').pop() || '')
    );
    if (reprintCards.length >= 2) {
      const fileLabel = reprintCards[0].sourcePath.split('/').pop() || 'other-prints.ts';
      addGroup(key, {
        id: 'duplicate-other-prints',
        message: `Duplicate reprint for ${key.replace(':', ' ')} in ${fileLabel}`,
      }, unique);
    }
  }

  // duplicate-fullname: ≥2 classes share fullName
  const byFullName = new Map<string, DuplicateCardRecord[]>();
  for (const card of cards) {
    if (!card.fullName) continue;
    const list = byFullName.get(card.fullName) || [];
    list.push(card);
    byFullName.set(card.fullName, list);
  }
  for (const [fullName, list] of byFullName) {
    const unique = list.filter((card, index, all) =>
      all.findIndex(other => other.className === card.className && other.sourcePath === card.sourcePath) === index
    );
    if (unique.length < 2) continue;
    addGroup(`fullname:${fullName}`, {
      id: 'duplicate-fullname',
      message: `Duplicate fullName "${fullName}"`,
    }, unique);
  }

  // duplicate-other-prints by fullName within the same reprint file
  const byReprintFileFullName = new Map<string, DuplicateCardRecord[]>();
  for (const card of cards) {
    const fileName = card.sourcePath.split('/').pop() || '';
    if (!REPRINT_FILE_NAMES.has(fileName) || !card.fullName) continue;
    const key = `${card.sourcePath}::${card.fullName}`;
    const list = byReprintFileFullName.get(key) || [];
    list.push(card);
    byReprintFileFullName.set(key, list);
  }
  for (const [composite, list] of byReprintFileFullName) {
    if (list.length < 2) continue;
    const [sourcePath, fullName] = composite.split('::');
    const fileLabel = sourcePath.split('/').pop() || 'other-prints.ts';
    addGroup(`reprint-fullname:${sourcePath}:${fullName}`, {
      id: 'duplicate-other-prints',
      message: `Duplicate reprint fullName "${fullName}" in ${fileLabel}`,
    }, list);
  }

  // duplicate-index: same class appears ≥2× in a set index.ts
  for (const [dir, counts] of indexCountsByDir) {
    const relDir = relative(serverSetsRoot, dir).replaceAll(sep, '/') || '.';
    for (const [className, count] of counts) {
      if (count < 2) continue;
      const matching = cards.filter(c => {
        const cardDir = c.sourcePath.includes('/')
          ? c.sourcePath.slice(0, c.sourcePath.lastIndexOf('/'))
          : '.';
        return c.className === className && cardDir === relDir;
      });
      const groupCards = matching.length > 0
        ? matching
        : [{
            className,
            name: '',
            set: '',
            setNumber: '',
            fullName: '',
            sourcePath: `${relDir}/index.ts`,
            kind: 'implementation',
            indexCount: count,
          }];
      addGroup(`index:${relDir}:${className}`, {
        id: 'duplicate-index',
        message: `Class ${className} instantiated ${count} times in ${relDir}/index.ts`,
      }, groupCards.map(c => ({ ...c, indexCount: count })));
    }
  }

  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function serveCardDuplicates(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  if (req.url?.split('?')[0] !== '/card-duplicates' || req.method !== 'GET') {
    next();
    return;
  }
  try {
    jsonResponse(res, 200, { duplicates: findCardDuplicates() });
  } catch (error) {
    jsonResponse(res, 500, {
      error: error instanceof Error ? error.message : 'Failed to scan for duplicate cards.',
    });
  }
}

function serveServerCardEffects(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  if (req.url?.split('?')[0] !== '/server-card-effects.json') {
    next();
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(buildServerEffects()));
}

function serveEnginePrefabs(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  if (req.url?.split('?')[0] !== '/engine-prefabs.json') {
    next();
    return;
  }
  try {
    jsonResponse(res, 200, buildEnginePrefabIndex());
  } catch (error) {
    jsonResponse(res, 500, {
      error: error instanceof Error ? error.message : 'Failed to index engine prefabs.',
    });
  }
}

function serveImplementedCardIds(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
): void {
  const pathOnly = req.url?.split('?')[0];
  if (pathOnly !== '/implemented-card-ids.json') {
    next();
    return;
  }

  if (!existsSync(implementedCardIdsPath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'implementedCardIds.json missing',
        hint: 'From ptcg-server: node generate-implemented-card-ids-json.js',
      })
    );
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(readFileSync(implementedCardIdsPath));
}

function serveTcgData(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
): void {
  if (!req.url?.startsWith('/tcg-data/')) {
    next();
    return;
  }

  if (!existsSync(dataRoot)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'pokemon-tcg-data not synced',
        hint: 'Run npm run sync-data in tools/card-builder',
      })
    );
    return;
  }

  const rel = decodeURIComponent(req.url.replace(/^\/tcg-data\/?/, '').split('?')[0]);
  const filePath = normalize(join(dataRoot, rel));
  if (!filePath.startsWith(dataRoot + sep) && filePath !== dataRoot) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  try {
    if (!statSync(filePath).isFile()) {
      res.statusCode = 404;
      res.end(`Not found: ${rel}`);
      return;
    }
    const buf = readFileSync(filePath);
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(buf);
  } catch {
    res.statusCode = 404;
    res.end(`Not found: ${rel}`);
  }
}

function tcgDataPlugin(): Plugin {
  return {
    name: 'tcg-data-static',
    configureServer(server) {
      server.middlewares.use(serveImplementedCardIds);
      server.middlewares.use(serveServerCardEffects);
      server.middlewares.use(serveEnginePrefabs);
      server.middlewares.use(serveCardDuplicates);
      server.middlewares.use(serveReprintCandidates);
      server.middlewares.use(serveSaveCard);
      server.middlewares.use(serveRemoveCard);
      server.middlewares.use(serveTcgData);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveImplementedCardIds);
      server.middlewares.use(serveServerCardEffects);
      server.middlewares.use(serveEnginePrefabs);
      server.middlewares.use(serveCardDuplicates);
      server.middlewares.use(serveReprintCandidates);
      server.middlewares.use(serveSaveCard);
      server.middlewares.use(serveRemoveCard);
      server.middlewares.use(serveTcgData);
    },
  };
}

export default defineConfig({
  root: '.',
  plugins: [tcgDataPlugin()],
  server: {
    port: 5174,
    open: true,
    fs: {
      allow: ['.', join(rootDir, 'data'), join(rootDir, '../../ptcg-server')],
    },
  },
  preview: {
    port: 5174,
  },
});
