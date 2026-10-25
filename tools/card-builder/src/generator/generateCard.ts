import {
  classNameForVariant,
  fullNameForVariant,
  toPascalClassName,
} from '../cardIdentity';
import { getPrefabById } from '../prefabs/catalog';
import { resolveEffectHybrid } from '../serverEffects';
import { healFromDamageCounters, isFossilTrainer, isTechnicalMachine } from '../textAccuracy';
import { formatTrainerAttacks, generateFossilSource, generateTechnicalMachineShell } from './specialCards';
import type {
  AttackDraft,
  CardDraft,
  EnergyShort,
  EffectKind,
  HybridEffectResolution,
  PowerDraft,
  SelectedPrefab,
  ServerEffect,
} from '../types';

export function parseEnergyCost(input: string): EnergyShort[] {
  const cleaned = input.toUpperCase().replace(/ANY/g, 'A').replace(/[^GRWLPFDMYNCA]/g, '');
  return cleaned.split('') as EnergyShort[];
}

function formatEnergyType(type: EnergyShort): string {
  // The card codebase exposes these short aliases globally from card-types.ts.
  // Keep generated cards consistent with the established [L, C, F] style.
  const aliases: Record<EnergyShort, string> = {
    G: 'G',
    R: 'R',
    W: 'W',
    L: 'L',
    P: 'P',
    F: 'F',
    D: 'D',
    M: 'M',
    Y: 'Y',
    N: 'N',
    C: 'C',
    A: 'CardType.ANY',
  };
  return aliases[type];
}

function formatEnergyArray(types: EnergyShort[]): string {
  if (types.length === 0) return '[]';
  return `[${types.map(formatEnergyType).join(', ')}]`;
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function mergeNamedImports(lines: string[]): string[] {
  const named = new Map<string, Set<string>>();
  const other: string[] = [];
  for (const line of lines) {
    // Skip already-empty named imports (e.g. `import { } from '...'`)
    if (/^import \{\s*\} from/.test(line)) {
      continue;
    }
    const match = line.match(/^import \{\s*([^}]*)\s*\} from '([^']+)';$/);
    if (!match) {
      if (line.trim()) other.push(line);
      continue;
    }
    const parsedNames = match[1].split(',').map(name => name.trim()).filter(Boolean);
    if (parsedNames.length === 0) {
      continue;
    }
    const names = named.get(match[2]) ?? new Set<string>();
    parsedNames.forEach(name => names.add(name));
    named.set(match[2], names);
  }
  return [
    ...[...named.entries()]
      .filter(([, names]) => names.size > 0)
      .map(([from, names]) => `import { ${[...names].sort().join(', ')} } from '${from}';`),
    ...other,
  ];
}

/** Activatable powers use WAS_POWER_USED; passive Poké-Bodies / locked abilities do not. */
function isActivatablePower(power: PowerDraft): boolean {
  return power.powerType === 'POKEPOWER' || power.useWhenInPlay;
}

function parseWeaknessPlusValue(value: string): number {
  const n = Number(String(value).replace(/^\+/, ''));
  return Number.isFinite(n) ? n : 30;
}

/** Prefer DP-era Poké-Power helpers over Ability-era names. */
function rewritePokePowerHelpers(text: string): string {
  return text.replace(/\bIS_ABILITY_BLOCKED\b/g, 'IS_POKEPOWER_BLOCKED');
}

function rewritePokePowerImportLine(line: string): string {
  if (!line.includes('IS_ABILITY_BLOCKED')) return line;
  const rewritten = rewritePokePowerHelpers(line);
  // Deduplicate if both names somehow appear after rewrite
  return rewritten.replace(
    /^import \{\s*([^}]*)\s*\} from ('[^']+');$/,
    (_m, names: string, from: string) => {
      const unique = [...new Set(names.split(',').map(n => n.trim()).filter(Boolean))];
      return `import { ${unique.sort().join(', ')} } from ${from};`;
    }
  );
}

function fullNameFor(draft: CardDraft, occurrence = 1): string {
  return fullNameForVariant(draft.name, draft.set, occurrence);
}

function classNameFor(draft: CardDraft, occurrence = 1): string {
  if (draft.className.trim()) return draft.className.trim();
  return classNameForVariant(toPascalClassName(draft.name) || 'NewCard', occurrence);
}

function ensureGuard(prefabImports: Map<string, Set<string>>, kind: EffectKind): void {
  if (kind === 'attack' || kind === 'power') {
    const set = prefabImports.get('../../game/store/prefabs/prefabs') ?? new Set();
    set.add(kind === 'attack' ? 'WAS_ATTACK_USED' : 'WAS_POWER_USED');
    prefabImports.set('../../game/store/prefabs/prefabs', set);
  } else if (kind === 'trainer') {
    const set = prefabImports.get('../../game/store/prefabs/trainer-prefabs') ?? new Set();
    set.add('WAS_TRAINER_USED');
    prefabImports.set('../../game/store/prefabs/trainer-prefabs', set);
  }
}

function collectImports(
  attacks: AttackDraft[],
  powers: PowerDraft[],
  hasPowers: boolean,
  hasAttacks: boolean,
  hasEffects: boolean,
  trainerPrefabs: SelectedPrefab[] = [],
  trainerHasServerEffects = false,
  trainerType?: CardDraft['trainerType']
): { fromGame: Set<string>; lines: string[]; markers: Set<string>; flags: Set<string> } {
  const fromGame = new Set<string>(hasEffects ? ['StoreLike', 'State'] : []);
  const prefabImports = new Map<string, Set<string>>();
  const extraImportLines = new Set<string>();
  const markers = new Set<string>();
  const flags = new Set<string>();

  const addSelected = (
    selected: SelectedPrefab[],
    kind: EffectKind,
    index: number,
    options: { guard?: boolean; pokePower?: boolean } = {}
  ) => {
    const shouldGuard = options.guard !== false;
    for (const sel of selected) {
      const prefab = getPrefabById(sel.prefabId);
      if (!prefab) continue;
      if (prefab.importNames.length > 0) {
        const set = prefabImports.get(prefab.importFrom) ?? new Set();
        for (const name of prefab.importNames) {
          set.add(options.pokePower && name === 'IS_ABILITY_BLOCKED' ? 'IS_POKEPOWER_BLOCKED' : name);
        }
        prefabImports.set(prefab.importFrom, set);
      }
      for (const line of prefab.extraImports ?? []) {
        extraImportLines.add(options.pokePower ? rewritePokePowerImportLine(line) : line);
      }
      if (prefab.id === 'USE_ABILITY_ONCE_PER_TURN') {
        markers.add(sel.params.marker || 'ABILITY_USED_MARKER');
      }
      if (prefab.id === 'SWITCH_ACTIVE_WITH_BENCHED_SELF') {
        flags.add(`usedSwitchAttack${index}`);
      }
      if (shouldGuard) {
        ensureGuard(prefabImports, kind);
      }
    }
  };

  if (hasAttacks) {
    attacks.forEach((a, i) => {
      addSelected(a.selectedPrefabs, 'attack', i);
      if (
        a.selectedPrefabs.length === 0 &&
        (a.serverEffect || (a.serverSnippets?.length ?? 0) > 0 || (a.unmatchedClauses?.length ?? 0) > 0)
      ) {
        ensureGuard(prefabImports, 'attack');
      }
    });
  }
  if (hasPowers) {
    powers.forEach((p, i) => {
      const activatable = isActivatablePower(p);
      addSelected(p.selectedPrefabs, 'power', i, {
        guard: activatable,
        pokePower: p.powerType === 'POKEPOWER',
      });
      if (
        activatable &&
        p.selectedPrefabs.length === 0 &&
        (p.serverEffect || (p.serverSnippets?.length ?? 0) > 0 || (p.unmatchedClauses?.length ?? 0) > 0)
      ) {
        ensureGuard(prefabImports, 'power');
      }
    });
  }
  const stadiumPassive = trainerType === 'STADIUM';
  addSelected(trainerPrefabs, 'trainer', 0, { guard: !stadiumPassive });
  if (!stadiumPassive && trainerPrefabs.length === 0 && trainerHasServerEffects) {
    ensureGuard(prefabImports, 'trainer');
  }
  if (trainerType === 'ITEM' || trainerType === 'SUPPORTER') {
    const prefabs = prefabImports.get('../../game/store/prefabs/prefabs') ?? new Set();
    prefabs.add('MOVE_CARDS');
    prefabImports.set('../../game/store/prefabs/prefabs', prefabs);
    fromGame.add('GameError');
    fromGame.add('GameMessage');
  }

  if (hasPowers) {
    fromGame.add('PowerType');
  }

  const lines: string[] = [];
  for (const [from, names] of prefabImports) {
    if (names.size === 0) continue;
    lines.push(`import { ${[...names].sort().join(', ')} } from '${from}';`);
  }
  for (const line of extraImportLines) {
    lines.push(line);
  }

  return { fromGame, lines, markers, flags };
}

function formatAttack(attack: AttackDraft): string {
  const cost = formatEnergyArray(parseEnergyCost(attack.cost));
  const damage = Number(attack.damage) || 0;
  const lines = [
    `    name: '${escapeString(attack.name)}',`,
    `    cost: ${cost},`,
    `    damage: ${damage},`,
  ];
  if (attack.damageCalculation) {
    lines.push(`    damageCalculation: '${attack.damageCalculation}',`);
  }
  lines.push(`    text: '${escapeString(attack.text)}'`);
  return `{\n${lines.join('\n')}\n  }`;
}

function formatPower(power: PowerDraft): string {
  const boolFlags: Array<[keyof PowerDraft, string]> = [
    ['useWhenInPlay', 'useWhenInPlay'],
    ['useFromHand', 'useFromHand'],
    ['useFromHandToBench', 'useFromHandToBench'],
    ['useFromDiscard', 'useFromDiscard'],
    ['exemptFromAbilityLock', 'exemptFromAbilityLock'],
    ['exemptFromInitialize', 'exemptFromInitialize'],
    ['abilityLock', 'abilityLock'],
    ['barrage', 'barrage'],
    ['knocksOutSelf', 'knocksOutSelf'],
    ['isFossil', 'isFossil'],
  ];
  const body = [
    `    name: '${escapeString(power.name)}',`,
    `    powerType: PowerType.${power.powerType},`,
    `    text: '${escapeString(power.text)}'`,
  ];
  for (const [key, prop] of boolFlags) {
    if (power[key] === true) {
      body[body.length - 1] += ',';
      body.push(`    ${prop}: true`);
    }
  }
  return `{\n${body.join('\n')}\n  }`;
}

function effectHasReduceBody(
  prefabs: SelectedPrefab[],
  serverEffect?: ServerEffect,
  serverSnippets?: ServerEffect[],
  unmatchedClauses?: string[]
): boolean {
  return (
    prefabs.length > 0 ||
    Boolean(serverEffect) ||
    (serverSnippets?.length ?? 0) > 0 ||
    (unmatchedClauses?.length ?? 0) > 0
  );
}

function collectServerMeta(
  serverImports: Set<string>,
  helpers: Set<string>,
  effects: Array<ServerEffect | undefined>,
  options: { pokePower?: boolean } = {}
): void {
  for (const effect of effects) {
    if (!effect) continue;
    for (const line of effect.imports) {
      serverImports.add(options.pokePower ? rewritePokePowerImportLine(line) : line);
    }
    for (const helper of effect.helpers ?? []) {
      helpers.add(options.pokePower ? rewritePokePowerHelpers(helper) : helper);
    }
  }
}

/**
 * Emit prefab calls, then residual server snippets, then TODO comments for
 * unmatched clauses. Dedupes `const player = effect.player`.
 */
function trainerPlayLines(trainerType: CardDraft['trainerType']): string[] {
  if (trainerType === 'STADIUM' || trainerType === 'TOOL') return [];
  if (trainerType === 'SUPPORTER') {
    return [
      'if (player.supporterTurn > 0) {',
      '  throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);',
      '}',
      'MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });',
      'effect.preventDefault = true;',
    ];
  }
  return [
    'MOVE_CARDS(store, state, player.hand, player.discard, { cards: [effect.trainerCard], sourceCard: this });',
    'effect.preventDefault = true;',
  ];
}

function emitHybridBlockBody(options: {
  kind: EffectKind;
  index: number;
  name?: string;
  selectedPrefabs: SelectedPrefab[];
  serverEffect?: ServerEffect;
  serverSnippets?: ServerEffect[];
  unmatchedClauses?: string[];
  companions: string[];
  /** Powers/trainers typically return state; attacks often fall through. */
  defaultReturn: boolean;
  /** Passive Poké-Body: label unmatched TODOs distinctly. */
  passivePokeBody?: boolean;
  /** Rewrite Ability-era helpers to Poké-Power helpers. */
  pokePower?: boolean;
  trainerType?: CardDraft['trainerType'];
}): { lines: string[]; returns: boolean } {
  const {
    kind,
    index,
    name,
    selectedPrefabs,
    serverEffect,
    serverSnippets = [],
    unmatchedClauses = [],
    companions,
    defaultReturn,
    passivePokeBody = false,
    pokePower = false,
    trainerType,
  } = options;

  const maybeRewrite = (line: string) => (pokePower ? rewritePokePowerHelpers(line) : line);

  // Exclusive full-effect copy when no prefabs were kept
  if (serverEffect && selectedPrefabs.length === 0 && serverSnippets.length === 0) {
    return {
      lines: serverEffect.body
        .map(line => (line.startsWith('      ') ? line.trimStart() : line))
        .map(maybeRewrite),
      returns: true,
    };
  }

  let returns = false;
  const generatedLines: string[] = [];

  for (const sel of selectedPrefabs) {
    const prefab = getPrefabById(sel.prefabId);
    if (!prefab) continue;
    const result = prefab.generateCall(sel.params, {
      kind,
      index,
      attackName: kind === 'attack' ? name : undefined,
      powerName: kind !== 'attack' ? name : undefined,
    });
    generatedLines.push(...result.lines.map(maybeRewrite));
    if (result.returns) returns = true;
    if (prefab.generateCompanions) {
      companions.push(
        ...prefab
          .generateCompanions(sel.params, {
            kind,
            index,
            attackName: kind === 'attack' ? name : undefined,
            powerName: kind !== 'attack' ? name : undefined,
          })
          .map(maybeRewrite)
      );
    }
  }

  for (const snippet of serverSnippets) {
    for (const line of snippet.body) {
      const trimmed = line.replace(/^\s*const player = effect\.player;\s*$/, '').trim();
      if (!trimmed) continue;
      // Skip leftover attribution / TODO comments from source cards
      if (/^\s*\/\//.test(trimmed) && /\bfrom\b|\bTODO unmatched\b/i.test(trimmed)) continue;
      generatedLines.push(maybeRewrite(trimmed));
    }
  }

  for (const clause of unmatchedClauses) {
    const label = passivePokeBody ? 'TODO unmatched Poké-Body' : 'TODO unmatched';
    generatedLines.push(`// ${label}: "${clause.replace(/"/g, '\\"')}"`);
  }

  const playLines = kind === 'trainer' && trainerType ? trainerPlayLines(trainerType) : [];
  const alreadyMovesTrainer = generatedLines.some(line =>
    /MOVE_CARDS\(.*effect\.trainerCard/.test(line) || /player\.supporter/.test(line)
  );
  // Bare `player` identifier only — ignore `effect.player`
  const needsPlayer =
    playLines.length > 0 ||
    generatedLines.some(line => /(^|[^.\w])player\b/.test(line));
  const lines: string[] = [];
  if (needsPlayer) {
    lines.push('const player = effect.player;');
  }
  if (playLines.length > 0 && !alreadyMovesTrainer) {
    lines.push(...playLines);
  }
  lines.push(...generatedLines);

  if (defaultReturn && !returns) {
    lines.push('return state;');
    returns = true;
  }

  return { lines, returns };
}

function generateReduceEffect(
  draft: CardDraft,
  markers: Set<string>,
  flags: Set<string>
): { source: string; imports: string[]; helpers: string[] } {
  const attacks = draft.hasAttacks ? draft.attacks : [];
  const powers = draft.hasPowers ? draft.powers : [];
  const trainerPrefabs = draft.extends === 'TrainerCard' ? draft.trainerPrefabs : [];
  const trainerServerEffect = draft.extends === 'TrainerCard' ? draft.trainerServerEffect : undefined;
  const trainerServerSnippets = draft.extends === 'TrainerCard' ? draft.trainerServerSnippets ?? [] : [];
  const trainerUnmatched = draft.extends === 'TrainerCard' ? draft.trainerUnmatchedClauses ?? [] : [];

  const body: string[] = [];
  const companions: string[] = [];
  const serverImports = new Set<string>();
  const helpers = new Set<string>();

  powers.forEach((power, index) => {
    if (
      !effectHasReduceBody(
        power.selectedPrefabs,
        power.serverEffect,
        power.serverSnippets,
        power.unmatchedClauses
      )
    ) {
      return;
    }
    const activatable = isActivatablePower(power);
    const pokePower = power.powerType === 'POKEPOWER';
    const passivePokeBody = power.powerType === 'POKEBODY' || !activatable;
    collectServerMeta(
      serverImports,
      helpers,
      [power.serverEffect, ...(power.serverSnippets ?? [])],
      { pokePower }
    );
    body.push(`    // ${power.name || `Power ${index + 1}`}`);
    const { lines } = emitHybridBlockBody({
      kind: 'power',
      index,
      name: power.name,
      selectedPrefabs: power.selectedPrefabs,
      serverEffect: power.serverEffect,
      serverSnippets: power.serverSnippets,
      unmatchedClauses: power.unmatchedClauses,
      companions,
      defaultReturn: activatable,
      passivePokeBody,
      pokePower,
    });
    if (activatable) {
      body.push(`    if (WAS_POWER_USED(effect, ${index}, this)) {`);
      body.push(...lines.map(line => `      ${line}`));
      body.push(`    }`);
    } else {
      // Passive Poké-Bodies / non-activatable powers: emit reducer checks directly
      body.push(...lines.map(line => `    ${line}`));
    }
    body.push('');
  });

  attacks.forEach((attack, index) => {
    if (
      !effectHasReduceBody(
        attack.selectedPrefabs,
        attack.serverEffect,
        attack.serverSnippets,
        attack.unmatchedClauses
      )
    ) {
      return;
    }
    collectServerMeta(serverImports, helpers, [
      attack.serverEffect,
      ...(attack.serverSnippets ?? []),
    ]);
    body.push(`    // ${attack.name || `Attack ${index + 1}`}`);
    body.push(`    if (WAS_ATTACK_USED(effect, ${index}, this)) {`);
    const { lines } = emitHybridBlockBody({
      kind: 'attack',
      index,
      name: attack.name,
      selectedPrefabs: attack.selectedPrefabs,
      serverEffect: attack.serverEffect,
      serverSnippets: attack.serverSnippets,
      unmatchedClauses: attack.unmatchedClauses,
      companions,
      defaultReturn: false,
    });
    body.push(...lines.map(line => `      ${line}`));
    body.push(`    }`);
    body.push('');
  });

  if (
    effectHasReduceBody(trainerPrefabs, trainerServerEffect, trainerServerSnippets, trainerUnmatched)
  ) {
    collectServerMeta(serverImports, helpers, [trainerServerEffect, ...trainerServerSnippets]);
    const stadiumPassive = draft.trainerType === 'STADIUM';
    const { lines } = emitHybridBlockBody({
      kind: 'trainer',
      index: 0,
      name: draft.name,
      selectedPrefabs: trainerPrefabs,
      serverEffect: trainerServerEffect,
      serverSnippets: trainerServerSnippets,
      unmatchedClauses: trainerUnmatched,
      companions,
      defaultReturn: !stadiumPassive,
      trainerType: draft.trainerType,
    });
    if (stadiumPassive) {
      body.push(...lines.map(line => `    ${line}`));
    } else {
      body.push(`    if (WAS_TRAINER_USED(effect, this)) {`);
      body.push(...lines.map(line => `      ${line}`));
      body.push(`    }`);
    }
    body.push('');
  }

  for (const companion of companions) {
    body.push(`    ${companion}`);
  }

  const markerLines = [...markers].map(m => `  public readonly ${m} = '${m}';`);
  const flagLines = [...flags].map(f => `  public ${f} = false;`);

  const prefix = [...markerLines, ...flagLines].join('\n');
  const prefixBlock = prefix ? `${prefix}\n` : '';

  if (body.length === 0 && !prefix) {
    return {
      imports: [...serverImports],
      source: '',
      helpers: [...helpers],
    };
  }

  return {
    imports: [...serverImports],
    source: `${prefixBlock}  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
${body.join('\n')}
    return state;
  }`,
    helpers: [...helpers],
  };
}

function applyHybridToAttack(attack: AttackDraft, result: HybridEffectResolution): void {
  attack.selectedPrefabs = result.selectedPrefabs;
  attack.serverEffect = result.serverEffect;
  attack.serverSnippets = result.serverSnippets.length > 0 ? result.serverSnippets : undefined;
  attack.unmatchedClauses = result.unmatchedClauses.length > 0 ? result.unmatchedClauses : undefined;
  attack.matchError = undefined;
}

function applyHybridToPower(power: PowerDraft, result: HybridEffectResolution): void {
  power.selectedPrefabs = result.selectedPrefabs;
  power.serverEffect = result.serverEffect;
  power.serverSnippets = result.serverSnippets.length > 0 ? result.serverSnippets : undefined;
  power.unmatchedClauses = result.unmatchedClauses.length > 0 ? result.unmatchedClauses : undefined;
  power.matchError = undefined;
}

function attackNeedsAutoResolve(attack: AttackDraft): boolean {
  return (
    attack.selectedPrefabs.length === 0 &&
    !attack.serverEffect &&
    !(attack.serverSnippets?.length) &&
    !(attack.unmatchedClauses?.length)
  );
}

function powerNeedsAutoResolve(power: PowerDraft): boolean {
  return (
    power.selectedPrefabs.length === 0 &&
    !power.serverEffect &&
    !(power.serverSnippets?.length) &&
    !(power.unmatchedClauses?.length)
  );
}

function trainerNeedsAutoResolve(draft: CardDraft): boolean {
  return (
    draft.trainerPrefabs.length === 0 &&
    !draft.trainerServerEffect &&
    !(draft.trainerServerSnippets?.length) &&
    !(draft.trainerUnmatchedClauses?.length)
  );
}

/**
 * Auto-fill selectedPrefabs / server snippets from effect text when empty.
 * Uses hybrid clause matching: prefabs where possible, server snippets for gaps.
 * Skips effects that already have Match / manual selections so Generate stays in sync.
 */
export async function resolvePrefabs(draft: CardDraft): Promise<CardDraft> {
  const next: CardDraft = structuredClone(draft);

  if (next.hasAttacks) {
    for (const attack of next.attacks) {
      const text = attack.text.trim();
      if (!text) {
        attack.matchError = undefined;
        continue;
      }
      if (!attackNeedsAutoResolve(attack)) {
        attack.matchError = undefined;
        continue;
      }
      const result = await resolveEffectHybrid(text, 'attack');
      applyHybridToAttack(attack, result);
    }
  }

  if (next.hasPowers) {
    for (const power of next.powers) {
      const text = power.text.trim();
      if (!text) {
        power.matchError = undefined;
        continue;
      }
      if (!powerNeedsAutoResolve(power)) {
        power.matchError = undefined;
        continue;
      }
      const result = await resolveEffectHybrid(text, 'power');
      applyHybridToPower(power, result);
    }
  }

  if (next.extends === 'TrainerCard') {
    const text = next.trainerText.trim();
    if (text && trainerNeedsAutoResolve(next)) {
      const result = await resolveEffectHybrid(text, 'trainer');
      next.trainerPrefabs = result.selectedPrefabs;
      next.trainerServerEffect = result.serverEffect;
      next.trainerServerSnippets =
        result.serverSnippets.length > 0 ? result.serverSnippets : undefined;
      next.trainerUnmatchedClauses =
        result.unmatchedClauses.length > 0 ? result.unmatchedClauses : undefined;
    }
  }

  if (next.extends === 'EnergyCard' && next.energyText.trim() && !next.energyServerEffect) {
    const result = await resolveEffectHybrid(next.energyText.trim(), 'energy');
    next.energyServerEffect = result.serverEffect;
  }

  return next;
}

/** Apply a hybrid resolution onto an attack/power/trainer for Match-from-text. */
export { resolveEffectHybrid, describeHybridResolution } from '../serverEffects';
export type { HybridEffectResolution };

export async function generateCardSource(
  draft: CardDraft,
  options: { occurrence?: number } = {}
): Promise<string> {
  const resolved = await resolvePrefabs(draft);
  const occurrence = options.occurrence ?? 1;
  const className = classNameFor(resolved, occurrence);
  const fullName = fullNameFor(resolved, occurrence);

  if (resolved.extends === 'TrainerCard') {
    if (isFossilTrainer(resolved.name, resolved.trainerText)) {
      return generateFossilSource({
        className,
        fullName,
        name: resolved.name,
        set: resolved.set,
        setNumber: resolved.setNumber,
        text: resolved.trainerText,
      });
    }
    if (isTechnicalMachine(resolved.name, resolved.trainerText)) {
      return generateTechnicalMachine(resolved, className, fullName);
    }
    return generateTrainer(resolved, className, fullName);
  }
  if (resolved.extends === 'EnergyCard') {
    return generateEnergy(resolved, className, fullName);
  }
  return generatePokemon(resolved, className, fullName);
}

function generatePokemon(draft: CardDraft, className: string, fullName: string): string {
  const hasEffects =
    (draft.hasPowers &&
      draft.powers.some(power =>
        effectHasReduceBody(
          power.selectedPrefabs,
          power.serverEffect,
          power.serverSnippets,
          power.unmatchedClauses
        )
      )) ||
    (draft.hasAttacks &&
      draft.attacks.some(attack =>
        effectHasReduceBody(
          attack.selectedPrefabs,
          attack.serverEffect,
          attack.serverSnippets,
          attack.unmatchedClauses
        )
      ));
  const { fromGame, lines: prefabLines, markers, flags } = collectImports(
    draft.attacks,
    draft.powers,
    draft.hasPowers,
    draft.hasAttacks,
    hasEffects
  );

  const imports: string[] = [];
  imports.push(`import { PokemonCard } from '../../game/store/card/pokemon-card';`);
  imports.push(`import { Stage, CardType } from '../../game/store/card/card-types';`);
  const gameImports = [...fromGame].sort();
  if (draft.hasPowers) {
    // PowerType comes from pokemon-types via game barrel or card
  }
  if (hasEffects) {
    if (gameImports.length > 0) {
      imports.push(`import { ${gameImports.join(', ')} } from '../../game';`);
    }
    imports.push(`import { Effect } from '../../game/store/effects/effect';`);
  }
  imports.push(...prefabLines);

  // Deduplicate import lines
  const uniqueImports = mergeNamedImports([...new Set(imports)]);

  const props: string[] = [];
  props.push(`  public stage: Stage = Stage.${draft.stage};`);
  if (draft.tags.trim()) {
    const tags = draft.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => (t.startsWith('CardTag.') ? t : `CardTag.${t}`));
    if (tags.length) {
      uniqueImports.splice(1, 0, `import { CardTag } from '../../game/store/card/card-types';`);
      props.push(`  protected _tags = [${tags.join(', ')}];`);
    }
  }
  if (draft.evolvesFrom.trim()) {
    props.push(`  public evolvesFrom: string = '${escapeString(draft.evolvesFrom.trim())}';`);
  }
  props.push(`  public hp: number = ${Number(draft.hp) || 0};`);
  const cardTypes = parseEnergyCost(draft.cardType);
  props.push(
    `  public cardType: CardType[] = ${formatEnergyArray(cardTypes.length > 0 ? cardTypes : ['C'])};`
  );

  if (draft.weaknessType) {
    if (draft.weaknessValue === 'x2') {
      props.push(`  public weakness = [{ type: ${formatEnergyType(draft.weaknessType)} }];`);
    } else {
      const value = parseWeaknessPlusValue(draft.weaknessValue);
      props.push(`  public weakness = [{ type: ${formatEnergyType(draft.weaknessType)}, value: ${value} }];`);
    }
  } else {
    props.push(`  public weakness = [];`);
  }

  if (draft.resistanceType) {
    const value = Number(draft.resistanceValue) || -20;
    props.push(`  public resistance = [{ type: ${formatEnergyType(draft.resistanceType)}, value: ${value} }];`);
  }

  props.push(`  public retreat = ${formatEnergyArray(parseEnergyCost(draft.retreat))};`);

  if (draft.hasPowers && draft.powers.length > 0) {
    props.push('');
    const powerBodies = draft.powers.map(formatPower);
    if (powerBodies.length === 1) {
      props.push(`  public powers = [${powerBodies[0]}];`);
    } else {
      props.push(`  public powers = [${powerBodies[0]},\n${powerBodies.slice(1).join(',\n')}];`);
    }
    props.push('');
  }

  if (draft.hasAttacks && draft.attacks.length > 0) {
    if (!(draft.hasPowers && draft.powers.length > 0)) {
      props.push('');
    }
    const attackBodies = draft.attacks.map(formatAttack);
    if (attackBodies.length === 1) {
      props.push(`  public attacks = [${attackBodies[0]}];`);
    } else {
      props.push(`  public attacks = [${attackBodies[0]},\n${attackBodies.slice(1).join(',\n')}];`);
    }
    props.push('');
  }

  if (draft.regulationMark.trim()) {
    props.push(`  public regulationMark = '${escapeString(draft.regulationMark.trim())}';`);
  }
  props.push(`  public set: string = '${escapeString(draft.set.trim())}';`);
  props.push(`  public cardImage: string = 'assets/cardback.png';`);
  props.push(`  public setNumber: string = '${escapeString(draft.setNumber.trim())}';`);
  props.push(`  public name: string = '${escapeString(draft.name.trim())}';`);
  props.push(`  public fullName: string = '${escapeString(fullName)}';`);

  const reduce = generateReduceEffect(draft, markers, flags);
  uniqueImports.push(...reduce.imports);
  const mergedImports = mergeNamedImports([...new Set(uniqueImports)]);

  // Ensure PowerType import when powers exist
  let importBlock = mergedImports.join('\n');
  if (draft.hasPowers && draft.powers.length > 0 && !importBlock.includes('PowerType')) {
    importBlock += `\nimport { PowerType } from '../../game/store/card/pokemon-types';`;
  }

  const propertyBlock = reduce.source ? props.join('\n') : props.join('\n').replace(/\n+$/, '');
  const reduceBlock = reduce.source ? `\n\n${reduce.source}` : '';
  const helperBlock = reduce.helpers.length > 0 ? `\n\n${reduce.helpers.join('\n\n')}` : '';

  return `${importBlock}${helperBlock}

export class ${className} extends PokemonCard {
${propertyBlock}${reduceBlock}
}
`;
}

function generateTechnicalMachine(draft: CardDraft, className: string, fullName: string): string {
  const attack = draft.attacks[0];
  const companions: string[] = [];
  const { lines } = emitHybridBlockBody({
    kind: 'attack',
    index: 0,
    name: attack?.name,
    selectedPrefabs: attack?.selectedPrefabs ?? [],
    serverEffect: attack?.serverEffect,
    serverSnippets: attack?.serverSnippets,
    unmatchedClauses: attack?.unmatchedClauses,
    companions,
    defaultReturn: false,
  });
  const extraImports: string[] = [];
  for (const sel of attack?.selectedPrefabs ?? []) {
    const prefab = getPrefabById(sel.prefabId);
    if (!prefab) continue;
    extraImports.push(
      `import { ${prefab.importNames.join(', ')} } from '${prefab.importFrom}';`
    );
    extraImports.push(...(prefab.extraImports ?? []));
  }
  extraImports.push(...(attack?.serverEffect?.imports ?? []));
  extraImports.push(...(attack?.serverSnippets ?? []).flatMap(s => s.imports));
  const attackReduceBody = lines.map(line => `      ${line}`).join('\n');
  return generateTechnicalMachineShell({
    className,
    fullName,
    name: draft.name,
    set: draft.set,
    setNumber: draft.setNumber,
    text: draft.trainerText,
    attacksSource: formatTrainerAttacks(draft.attacks),
    attackReduceBody: attackReduceBody ? `\n${attackReduceBody}` : '',
    extraImports: [...new Set(extraImports)],
  });
}

function generateTrainer(draft: CardDraft, className: string, fullName: string): string {
  const hasEffects = effectHasReduceBody(
    draft.trainerPrefabs,
    draft.trainerServerEffect,
    draft.trainerServerSnippets,
    draft.trainerUnmatchedClauses
  );
  const trainerHasServer =
    Boolean(draft.trainerServerEffect) ||
    (draft.trainerServerSnippets?.length ?? 0) > 0 ||
    (draft.trainerUnmatchedClauses?.length ?? 0) > 0;
  const collected = collectImports(
    [],
    [],
    false,
    false,
    hasEffects,
    draft.trainerPrefabs,
    trainerHasServer,
    draft.trainerType
  );
  const reduce = generateReduceEffect(draft, collected.markers, collected.flags);
  const imports: string[] = [
    `import { TrainerCard } from '../../game/store/card/trainer-card';`,
    `import { TrainerType } from '../../game/store/card/card-types';`,
  ];
  if (draft.tags.trim()) {
    imports.push(`import { CardTag } from '../../game/store/card/card-types';`);
  }
  if (hasEffects) {
    const gameImports = [...new Set(['StoreLike', 'State', ...collected.fromGame])].sort();
    imports.push(`import { ${gameImports.join(', ')} } from '../../game';`);
    imports.push(`import { Effect } from '../../game/store/effects/effect';`);
  }
  imports.push(...collected.lines, ...reduce.imports);

  const props = [
    `  protected _trainerType: TrainerType = TrainerType.${draft.trainerType};`,
  ];
  if (draft.tags.trim()) {
    props.push(`  protected _tags = [${formatTags(draft.tags)}];`);
  }
  props.push(
    `  public set: string = '${escapeString(draft.set.trim())}';`,
    `  public cardImage: string = 'assets/cardback.png';`,
    `  public setNumber: string = '${escapeString(draft.setNumber.trim())}';`,
    `  public name: string = '${escapeString(draft.name.trim())}';`,
    `  public fullName: string = '${escapeString(fullName)}';`,
    `  public text: string = '${escapeString(draft.trainerText)}';`,
  );
  if (draft.regulationMark.trim()) {
    props.push(`  public regulationMark = '${escapeString(draft.regulationMark.trim())}';`);
  }

  const importBlock = mergeNamedImports([...new Set(imports)]).join('\n');
  const reduceBlock = reduce.source
    ? `\n\n${reduce.source}`
    : '';
  const helperBlock = reduce.helpers.length > 0 ? `\n\n${reduce.helpers.join('\n\n')}` : '';
  return `${importBlock}${helperBlock}

export class ${className} extends TrainerCard {
${props.join('\n')}${reduceBlock}
}
`;
}

function generateEnergy(draft: CardDraft, className: string, fullName: string): string {
  const provides = formatEnergyArray(parseEnergyCost(draft.provides));
  const blended = formatEnergyArray(parseEnergyCost(draft.blendedEnergies));
  const blendCount = Math.max(1, Number(draft.blendedEnergyCount) || 1);
  const effect = draft.energyServerEffect;
  const imports: string[] = [
    `import { EnergyCard } from '../../game/store/card/energy-card';`,
    `import { EnergyType, CardType } from '../../game/store/card/card-types';`,
  ];
  if (draft.tags.trim()) {
    imports.push(`import { CardTag } from '../../game/store/card/card-types';`);
  }
  const attachText = draft.energyType === 'SPECIAL' ? draft.energyText : '';
  const needsAttachReducer = !effect && /remove (?:\d+|a|an|one|all) (?:damage counters?|special conditions)/i.test(attachText);
  if (effect || blended !== '[]' || needsAttachReducer) {
    imports.push(`import { StoreLike, State } from '../../game';`);
    imports.push(`import { Effect } from '../../game/store/effects/effect';`);
  }
  if (effect) {
    imports.push(...effect.imports);
  }
  if (blended !== '[]') {
    imports.push(`import { CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';`);
    imports.push(`import { EnergyEffect } from '../../game/store/effects/play-card-effects';`);
  }
  const props = [
    `  public provides: CardType[] = ${provides};`,
    `  public energyType = EnergyType.${draft.energyType};`,
  ];
  if (draft.tags.trim()) {
    props.push(`  protected _tags = [${formatTags(draft.tags)}];`);
  }
  props.push(
    `  public set: string = '${escapeString(draft.set.trim())}';`,
    `  public cardImage: string = 'assets/cardback.png';`,
    `  public setNumber: string = '${escapeString(draft.setNumber.trim())}';`,
    `  public name: string = '${escapeString(draft.name.trim())}';`,
    `  public fullName: string = '${escapeString(fullName)}';`,
    `  public text: string = '${escapeString(draft.energyText)}';`,
  );
  if (draft.regulationMark.trim()) {
    props.push(`  public regulationMark = '${escapeString(draft.regulationMark.trim())}';`);
  }

  const bodyLines: string[] = [];
  if (effect) {
    bodyLines.push(...effect.body);
  } else if (needsAttachReducer) {
    const attachHeal = draft.energyText.match(/remove (\d+|a|an|one) damage counters?/i);
    const attachAll = /remove all (?:damage counters|special conditions)/i.test(draft.energyText);
    const attachConditions = /remove all special conditions/i.test(draft.energyText);
    if (attachHeal || attachAll || attachConditions) {
      imports.push(`import { HealEffect } from '../../game/store/effects/game-effects';`);
      imports.push(`import { AttachEnergyEffect } from '../../game/store/effects/play-card-effects';`);
      imports.push(`import { IS_SPECIAL_ENERGY_BLOCKED } from '../../game/store/prefabs/prefabs';`);
      bodyLines.push(
        `    if (effect instanceof AttachEnergyEffect && effect.energyCard === this) {`,
        `      if (IS_SPECIAL_ENERGY_BLOCKED(store, state, effect.player, this, effect.target)) {`,
        `        return state;`,
        `      }`,
      );
      if (attachConditions || /special conditions/i.test(draft.energyText)) {
        bodyLines.push(
          `      const conditions = effect.target.specialConditions.slice();`,
          `      conditions.forEach(condition => effect.target.removeSpecialCondition(condition));`,
        );
      }
      if (attachHeal && !/special conditions/i.test(draft.energyText)) {
        const amount = healFromDamageCounters(attachHeal[1]);
        bodyLines.push(`      store.reduceEffect(state, new HealEffect(effect.player, effect.target, ${amount}));`);
      } else if (/remove all damage counters/i.test(draft.energyText)) {
        bodyLines.push(`      store.reduceEffect(state, new HealEffect(effect.player, effect.target, effect.target.damage));`);
      }
      bodyLines.push(`    }`);
    }
  }
  if (blended !== '[]') {
    const pushLines = Array.from({ length: blendCount }, () =>
      `      effect.energyMap.push({ card: this, provides: [...choosable] });`
    ).join('\n');
    bodyLines.push(
      `    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {`,
      `      try {`,
      `        const energyEffect = new EnergyEffect(effect.player, this);`,
      `        store.reduceEffect(state, energyEffect);`,
      `      } catch {`,
      `        return state;`,
      `      }`,
      `      const choosable = ${blended};`,
      pushLines,
      `    }`,
    );
  }

  const effectBlock = bodyLines.length > 0
    ? `\n\n  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {\n${bodyLines
        .map(line => (line.startsWith('    ') ? line : `    ${line}`))
        .join('\n')}\n    return state;\n  }`
    : '';
  const helperBlock = effect?.helpers && effect.helpers.length > 0 ? `\n\n${effect.helpers.join('\n\n')}` : '';
  return `${mergeNamedImports([...new Set(imports)]).join('\n')}${helperBlock}

export class ${className} extends EnergyCard {
${props.join('\n')}${effectBlock}
}
`;
}

function formatTags(tags: string): string {
  return tags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(tag => (tag.startsWith('CardTag.') ? tag : `CardTag.${tag}`))
    .join(', ');
}
