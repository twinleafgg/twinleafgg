import type {
  AttackDraft,
  CardDraft,
  EnergyShort,
  PowerDraft,
  PowerTypeName,
  ReprintCandidate,
  ServerEffect,
  StageName,
  WeaknessValue,
} from './types';
import {
  ENERGY_LABELS,
  ENERGY_SHORTS,
  POWER_TYPES,
  STAGES,
} from './types';
import {
  classNameForVariant,
  fullNameForVariant,
  toPascalClassName,
} from './cardIdentity';
import { catalogStats, getPrefabById, mergeEnginePrefabs, prefabsForScope } from './prefabs/catalog';
import { createManualSelected } from './prefabs/matcher';
import { engineRecordToPrefab, loadEnginePrefabIndex } from './prefabs/enginePrefabs';
import { clearServerEffectsCache } from './serverEffects';
import {
  describeHybridResolution,
  generateCardSource,
  parseEnergyCost,
  resolveEffectHybrid,
} from './generator/generateCard';
import {
  clearBrowseSelection,
  createBrowseState,
  ensureImplementedLoaded,
  loadSerieSets,
  loadSeries,
  loadSetCards,
  pickCardToDraft,
  renderBrowse,
  runSearch,
  selectedBrowseCards,
  unimplementedVisibleCards,
  visibleBrowseCards,
} from './tcgdex/browse';
import {
  generateAndSaveCatalogCards,
  saveCardToServer,
  summarizeBulkSave,
} from './saveCard';
import type { BrowseSourceMeta } from './tcgdex/mapCardToDraft';
import {
  cardImageUrl,
  findCardsByNameAndSet,
  findReprintCandidates,
  TcgDexApiError,
  resetDataSource,
} from './tcgdex/client';
import { clearImplementedCache, isImplemented, markImplemented } from './data/implemented';
import {
  applyRemovedDuplicate,
  createDuplicatesState,
  loadDuplicates,
  removeDuplicateCard,
  renderDuplicates,
} from './duplicates';
import type { DuplicatesState } from './duplicates';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyAttack(): AttackDraft {
  return {
    id: uid('atk'),
    enabled: true,
    name: '',
    cost: 'C',
    damage: '0',
    damageCalculation: '',
    text: '',
    selectedPrefabs: [],
  };
}

function emptyPower(): PowerDraft {
  return {
    id: uid('pwr'),
    name: '',
    powerType: 'ABILITY',
    text: '',
    useWhenInPlay: false,
    useFromHand: false,
    useFromHandToBench: false,
    useFromDiscard: false,
    exemptFromAbilityLock: false,
    exemptFromInitialize: false,
    abilityLock: false,
    barrage: false,
    knocksOutSelf: false,
    isFossil: false,
    selectedPrefabs: [],
  };
}

function defaultDraft(): CardDraft {
  return {
    className: '',
    extends: 'PokemonCard',
    stage: 'BASIC',
    evolvesFrom: '',
    tags: '',
    hp: '60',
    cardType: 'C',
    weaknessType: '',
    weaknessValue: 'x2',
    resistanceType: '',
    resistanceValue: '-20',
    retreat: 'C',
    hasPowers: false,
    hasAttacks: true,
    powers: [emptyPower()],
    attacks: [emptyAttack()],
    regulationMark: '',
    set: '',
    setNumber: '',
    name: '',
    trainerType: 'ITEM',
    trainerText: '',
    trainerPrefabs: [],
    energyType: 'BASIC',
    provides: 'C',
    blendedEnergies: '',
    blendedEnergyCount: '1',
    energyText: '',
  };
}

let draft = defaultDraft();
let outputCode = '';
let outputError = '';
let statusMessage = '';
let view: 'browse' | 'editor' | 'duplicates' = 'browse';
let browse = createBrowseState();
let duplicates: DuplicatesState = createDuplicatesState();
let browseScrollY = 0;
let sourceMeta: BrowseSourceMeta | null = null;
let imageModalOpen = false;
let imageModalUrl = '';
let imageModalAlt = '';
let reprintCandidates: Array<ReprintCandidate & { imageUrl?: string }> = [];
let selectedReprintKey = '';
let saveAsReprint = false;
let reprintLoading = false;
let reprintError = '';
let reprintLookupVersion = 0;
let reprintNextOccurrence = 1;
let reprintSuggestedClassName = '';
let reprintSuggestedFullName = '';
let reprintRefreshTimer: ReturnType<typeof setTimeout> | undefined;

const app = document.querySelector<HTMLDivElement>('#app')!;

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && imageModalOpen) {
    imageModalOpen = false;
    imageModalUrl = '';
    render();
  }
});

function reprintKey(candidate: ReprintCandidate): string {
  return `${candidate.sourcePath}:${candidate.className}`;
}

function selectedReprintCandidate(): (ReprintCandidate & { imageUrl?: string }) | undefined {
  return reprintCandidates.find(candidate => reprintKey(candidate) === selectedReprintKey);
}

function clearReprintState(): void {
  reprintLookupVersion++;
  reprintCandidates = [];
  selectedReprintKey = '';
  saveAsReprint = false;
  reprintLoading = false;
  reprintError = '';
  reprintNextOccurrence = 1;
  reprintSuggestedClassName = '';
  reprintSuggestedFullName = '';
  if (reprintRefreshTimer) {
    clearTimeout(reprintRefreshTimer);
    reprintRefreshTimer = undefined;
  }
}

function scheduleReprintRefresh(): void {
  if (reprintRefreshTimer) clearTimeout(reprintRefreshTimer);
  reprintRefreshTimer = setTimeout(() => {
    reprintRefreshTimer = undefined;
    void refreshReprintCandidates();
  }, 300);
}

function hasIdenticalReprint(): boolean {
  return reprintCandidates.some(candidate => candidate.identical);
}

/** Occurrence for a new distinct file — 1 when saving a true reprint or no name collision. */
function effectiveVariantOccurrence(): number {
  if (saveAsReprint && selectedReprintCandidate()?.identical) return 1;
  if (hasIdenticalReprint()) return 1;
  return reprintNextOccurrence;
}

async function refreshReprintCandidates(): Promise<void> {
  const name = draft.name.trim();
  const set = draft.set.trim().toUpperCase();
  const lookupVersion = ++reprintLookupVersion;
  reprintCandidates = [];
  selectedReprintKey = '';
  saveAsReprint = false;
  reprintError = '';
  reprintNextOccurrence = 1;
  reprintSuggestedClassName = '';
  reprintSuggestedFullName = '';
  if (!name || !set) {
    reprintLoading = false;
    render();
    return;
  }

  reprintLoading = true;
  render();
  try {
    const result = await findReprintCandidates(draft);
    const cardsBySet = new Map<string, Awaited<ReturnType<typeof findCardsByNameAndSet>>>();
    await Promise.all(
      [...new Set(result.candidates.map(candidate => candidate.set))].map(async candidateSet => {
        cardsBySet.set(candidateSet, await findCardsByNameAndSet(name, candidateSet));
      })
    );
    if (lookupVersion !== reprintLookupVersion) return;
    reprintCandidates = result.candidates.map(candidate => ({
      ...candidate,
      imageUrl: cardImageUrl(
        cardsBySet.get(candidate.set)?.find(card => card.localId === candidate.setNumber)?.image,
        'high'
      ),
    }));
    reprintNextOccurrence = result.nextOccurrence;
    reprintSuggestedClassName = result.suggestedClassName;
    reprintSuggestedFullName = result.suggestedFullName;
    const identical = reprintCandidates.filter(candidate => candidate.identical);
    if (identical.length > 0) {
      selectedReprintKey = reprintKey(identical[0]);
      saveAsReprint = true;
    } else {
      selectedReprintKey = '';
      saveAsReprint = false;
    }
  } catch (error) {
    if (lookupVersion !== reprintLookupVersion) return;
    reprintError = error instanceof Error ? error.message : String(error);
  } finally {
    if (lookupVersion === reprintLookupVersion) {
      reprintLoading = false;
      render();
    }
  }
}

async function ensureSeriesLoaded() {
  if (browse.series.length > 0 || browse.loading) return;
  await ensureImplementedLoaded(browse);
  await loadSeries(browse);
  render();
}

function browseCardNav(): {
  cards: ReturnType<typeof visibleBrowseCards>;
  index: number;
  canPrev: boolean;
  canNext: boolean;
  label: string;
} | null {
  if (!sourceMeta || browse.cards.length === 0) return null;
  const visible = visibleBrowseCards(browse);
  let cards = visible;
  let index = cards.findIndex(c => c.id === sourceMeta!.tcgDexId);
  // Current card may be hidden by the implemented filter — fall back to full list.
  if (index < 0) {
    cards = browse.cards;
    index = cards.findIndex(c => c.id === sourceMeta!.tcgDexId);
  }
  if (index < 0) return null;
  const canPrev =
    index > 0 || (browse.level === 'search' && browse.searchOffset > 0);
  const canNext =
    index < cards.length - 1 || (browse.level === 'search' && browse.searchHasMore);
  return {
    cards,
    index,
    canPrev,
    canNext,
    label: `${index + 1 + (browse.level === 'search' ? browse.searchOffset : 0)} / ${
      browse.level === 'search' && browse.searchHasMore
        ? `${cards.length + browse.searchOffset}+`
        : String(cards.length + (browse.level === 'search' ? browse.searchOffset : 0))
    }`,
  };
}

async function openCardInEditor(id: string): Promise<void> {
  clearReprintState();
  imageModalOpen = false;
  imageModalUrl = '';
  browse.loading = true;
  statusMessage = `Loading ${id}…`;
  outputError = '';
  render();
  try {
    const { draft: next, meta } = await pickCardToDraft(id);
    draft = next;
    sourceMeta = meta;
    outputCode = '';
    view = 'editor';
    statusMessage = `Pre-filled from ${id}. Match prefabs, then Generate.`;
    browse.loading = false;
  } catch (err) {
    browse.loading = false;
    statusMessage = '';
    outputError =
      err instanceof TcgDexApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
  }
  render(view === 'editor' ? 'top' : 'preserve');
  if (view === 'editor') void refreshReprintCandidates();
}

async function navigateBrowseCard(direction: -1 | 1): Promise<void> {
  const nav = browseCardNav();
  if (!nav) return;
  const nextIndex = nav.index + direction;
  if (nextIndex >= 0 && nextIndex < nav.cards.length) {
    await openCardInEditor(nav.cards[nextIndex].id);
    return;
  }
  if (browse.level !== 'search') return;

  if (direction === 1 && browse.searchHasMore) {
    browse.loading = true;
    statusMessage = `Searching ${browse.searchQuery}…`;
    outputError = '';
    browse.searchOffset += browse.searchPageSize;
    render();
    await runSearch(browse, browse.searchQuery);
    const nextCards = visibleBrowseCards(browse);
    const target = nextCards[0] || browse.cards[0];
    if (target) await openCardInEditor(target.id);
    else render();
    return;
  }

  if (direction === -1 && browse.searchOffset > 0) {
    browse.loading = true;
    statusMessage = `Searching ${browse.searchQuery}…`;
    outputError = '';
    browse.searchOffset = Math.max(0, browse.searchOffset - browse.searchPageSize);
    render();
    await runSearch(browse, browse.searchQuery);
    const prevCards = visibleBrowseCards(browse);
    const list = prevCards.length > 0 ? prevCards : browse.cards;
    const target = list[list.length - 1];
    if (target) await openCardInEditor(target.id);
    else render();
  }
}

async function ensureDuplicatesLoaded(force = false) {
  if (!force && (duplicates.groups.length > 0 || duplicates.loading)) return;
  await loadDuplicates(duplicates);
  if (view === 'duplicates') render();
}

function bindDuplicatesEvents() {
  const filter = app.querySelector<HTMLSelectElement>('[data-duplicates="reason-filter"]');
  filter?.addEventListener('change', () => {
    duplicates.reasonFilter = filter.value;
    render();
  });
}

function energyOptions(selected: string, includeEmpty = false): string {
  const opts = ENERGY_SHORTS.map(
    e => `<option value="${e}" ${selected === e ? 'selected' : ''}>${ENERGY_LABELS[e]}</option>`
  );
  if (includeEmpty) {
    opts.unshift(`<option value="" ${selected === '' ? 'selected' : ''}>(none)</option>`);
  }
  return opts.join('');
}

function renderHybridSources(options: {
  serverEffect?: ServerEffect;
  serverSnippets?: ServerEffect[];
  unmatchedClauses?: string[];
}): string {
  const parts: string[] = [];
  if (options.serverEffect) {
    parts.push(
      `<div class="hybrid-source">
        <strong>Full server match</strong>
        <span class="badge">${Math.round(options.serverEffect.similarity * 100)}%</span>
        <p class="muted">${escapeHtml(options.serverEffect.source)}</p>
        <p class="muted">${escapeHtml(options.serverEffect.effectText || options.serverEffect.attackText || '')}</p>
      </div>`
    );
  }
  for (const snippet of options.serverSnippets ?? []) {
    const clause = snippet.matchedClause || snippet.effectText;
    parts.push(
      `<div class="hybrid-source">
        <strong>Server snippet</strong>
        <span class="badge">${Math.round(snippet.similarity * 100)}%</span>
        <p class="muted">${escapeHtml(snippet.source)}</p>
        <p class="muted">Clause: ${escapeHtml(clause)}</p>
      </div>`
    );
  }
  for (const clause of options.unmatchedClauses ?? []) {
    parts.push(
      `<div class="hybrid-unmatched">
        <strong>Unmatched</strong>
        <p class="muted">${escapeHtml(clause)}</p>
      </div>`
    );
  }
  if (parts.length === 0) return '';
  return `<div class="hybrid-panel">${parts.join('')}</div>`;
}

function renderPrefabPicker(
  kind: 'attack' | 'power' | 'trainer',
  itemId: string,
  selected: AttackDraft['selectedPrefabs'],
  hybrid?: {
    serverEffect?: ServerEffect;
    serverSnippets?: ServerEffect[];
    unmatchedClauses?: string[];
  }
): string {
  const catalog = prefabsForScope(kind);
  const options = catalog
    .map(p => `<option value="${p.id}">${p.name} — ${p.description}</option>`)
    .join('');

  const rows = selected
    .map(sel => {
      const prefab = getPrefabById(sel.prefabId);
      if (!prefab) return '';
      const paramFields = prefab.params
        .map(p => {
          const val = sel.params[p.key] ?? '';
          return `<label class="param">${p.label}
            <input data-action="prefab-param" data-kind="${kind}" data-item="${itemId}" data-sel="${sel.id}" data-key="${p.key}" value="${escapeAttr(val)}" />
          </label>`;
        })
        .join('');
      return `<div class="prefab-row">
        <div class="prefab-row-head">
          <strong>${prefab.name}</strong>
          <span class="badge">${sel.source}</span>
          <button type="button" class="danger" data-action="remove-prefab" data-kind="${kind}" data-item="${itemId}" data-sel="${sel.id}">Remove</button>
        </div>
        <p class="muted">${escapeHtml(prefab.description)}</p>
        <div class="param-row">${paramFields || '<span class="muted">No parameters</span>'}</div>
      </div>`;
    })
    .join('');

  return `<div class="prefab-panel">
    <h4>reduceEffect (prefabs + snippets)</h4>
    ${rows || '<p class="muted">No prefabs selected yet. Match from text or add manually.</p>'}
    ${hybrid ? renderHybridSources(hybrid) : ''}
    <div class="row">
      <select data-role="prefab-select" data-kind="${kind}" data-item="${itemId}">
        <option value="">Add prefab…</option>
        ${options}
      </select>
      <button type="button" data-action="add-prefab" data-kind="${kind}" data-item="${itemId}">Add</button>
      <button type="button" data-action="match-prefabs" data-kind="${kind}" data-item="${itemId}">Match from text</button>
    </div>
  </div>`;
}

function renderAttack(attack: AttackDraft, index: number): string {
  return `<section class="card-block" data-attack-id="${attack.id}">
    <div class="block-head">
      <h3>Attack ${index + 1}</h3>
      <button type="button" class="danger" data-action="remove-attack" data-id="${attack.id}" ${draft.attacks.length <= 1 ? 'disabled' : ''}>Remove</button>
    </div>
    <div class="grid-3">
      <label>Name<input data-field="attack" data-id="${attack.id}" data-key="name" value="${escapeAttr(attack.name)}" /></label>
      <label>Cost (e.g. RCC)<input data-field="attack" data-id="${attack.id}" data-key="cost" value="${escapeAttr(attack.cost)}" placeholder="RCC" /></label>
      <label>Damage<input type="number" data-field="attack" data-id="${attack.id}" data-key="damage" value="${escapeAttr(attack.damage)}" /></label>
    </div>
    <div class="grid-2">
      <label>Damage calculation
        <select data-field="attack" data-id="${attack.id}" data-key="damageCalculation">
          <option value="" ${attack.damageCalculation === '' ? 'selected' : ''}>(none)</option>
          <option value="+" ${attack.damageCalculation === '+' ? 'selected' : ''}>+</option>
          <option value="x" ${attack.damageCalculation === 'x' ? 'selected' : ''}>x</option>
          <option value="-" ${attack.damageCalculation === '-' ? 'selected' : ''}>-</option>
        </select>
      </label>
      <label>Parsed cost preview
        <input readonly value="${parseEnergyCost(attack.cost).join(', ') || '(empty)'}" />
      </label>
    </div>
    <label>Attack text
      <textarea data-field="attack" data-id="${attack.id}" data-key="text" rows="3" placeholder="Flip a coin. If heads, the Defending Pokemon is now Paralyzed.">${escapeHtml(attack.text)}</textarea>
    </label>
    ${attack.matchError ? `<div class="error-box">${escapeHtml(attack.matchError)}</div>` : ''}
    ${renderPrefabPicker('attack', attack.id, attack.selectedPrefabs, {
      serverEffect: attack.serverEffect,
      serverSnippets: attack.serverSnippets,
      unmatchedClauses: attack.unmatchedClauses,
    })}
  </section>`;
}

function renderPower(power: PowerDraft, index: number): string {
  const powerTypeOpts = POWER_TYPES.map(
    t => `<option value="${t}" ${power.powerType === t ? 'selected' : ''}>${t}</option>`
  ).join('');

  const bools: Array<[keyof PowerDraft, string]> = [
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

  const boolHtml = bools
    .map(
      ([key, label]) =>
        `<label class="check"><input type="checkbox" data-field="power-bool" data-id="${power.id}" data-key="${key}" ${power[key] ? 'checked' : ''} /> ${label}</label>`
    )
    .join('');

  return `<section class="card-block" data-power-id="${power.id}">
    <div class="block-head">
      <h3>Power ${index + 1}</h3>
      <button type="button" class="danger" data-action="remove-power" data-id="${power.id}" ${draft.powers.length <= 1 ? 'disabled' : ''}>Remove</button>
    </div>
    <div class="grid-2">
      <label>Name<input data-field="power" data-id="${power.id}" data-key="name" value="${escapeAttr(power.name)}" /></label>
      <label>Power type<select data-field="power" data-id="${power.id}" data-key="powerType">${powerTypeOpts}</select></label>
    </div>
    <div class="checks">${boolHtml}</div>
    <label>Power text
      <textarea data-field="power" data-id="${power.id}" data-key="text" rows="3">${escapeHtml(power.text)}</textarea>
    </label>
    ${power.matchError ? `<div class="error-box">${escapeHtml(power.matchError)}</div>` : ''}
    ${renderPrefabPicker('power', power.id, power.selectedPrefabs, {
      serverEffect: power.serverEffect,
      serverSnippets: power.serverSnippets,
      unmatchedClauses: power.unmatchedClauses,
    })}
  </section>`;
}

function renderPokemonFields(): string {
  const stageOpts = STAGES.map(
    s => `<option value="${s}" ${draft.stage === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  return `
    <div class="grid-3">
      <label>Stage<select data-root="stage">${stageOpts}</select></label>
      <label>Card type (e.g. R or FM)<input data-root="cardType" value="${escapeAttr(draft.cardType)}" placeholder="R" /></label>
      <label>HP<input type="number" data-root="hp" value="${escapeAttr(draft.hp)}" /></label>
    </div>
    <div class="grid-2">
      <label>Evolves from<input data-root="evolvesFrom" value="${escapeAttr(draft.evolvesFrom)}" placeholder="optional" /></label>
      <label>Tags (comma CardTag names)<input data-root="tags" value="${escapeAttr(draft.tags)}" placeholder="POKEMON_ex, MEGA" /></label>
    </div>
    <div class="grid-3">
      <label>Weakness type<select data-root="weaknessType">${energyOptions(draft.weaknessType, true)}</select></label>
      <label>Weakness value
        <select data-root="weaknessValue">
          <option value="x2" ${draft.weaknessValue === 'x2' ? 'selected' : ''}>2x</option>
          <option value="+10" ${draft.weaknessValue === '+10' ? 'selected' : ''}>+10</option>
          <option value="+20" ${draft.weaknessValue === '+20' ? 'selected' : ''}>+20</option>
          <option value="+30" ${draft.weaknessValue === '+30' ? 'selected' : ''}>+30</option>
          <option value="+40" ${draft.weaknessValue === '+40' ? 'selected' : ''}>+40</option>
        </select>
      </label>
      <label>Retreat (C per cost)<input data-root="retreat" value="${escapeAttr(draft.retreat)}" placeholder="CCC" /></label>
    </div>
    <div class="grid-2">
      <label>Resistance type<select data-root="resistanceType">${energyOptions(draft.resistanceType, true)}</select></label>
      <label>Resistance value<input data-root="resistanceValue" value="${escapeAttr(draft.resistanceValue)}" placeholder="-20" /></label>
    </div>

    <div class="toggle-row">
      <label class="check"><input type="checkbox" data-root="hasPowers" ${draft.hasPowers ? 'checked' : ''} /> Has powers / abilities</label>
      <label class="check"><input type="checkbox" data-root="hasAttacks" ${draft.hasAttacks ? 'checked' : ''} /> Has attacks</label>
    </div>

  `;
}

function renderPokemonEffects(): string {
  return `
    ${
      draft.hasPowers
        ? `<section class="section effects-section">
            <div class="block-head"><h2>Powers</h2>
              <button type="button" data-action="add-power">Add power</button>
            </div>
            ${draft.powers.map(renderPower).join('')}
          </section>`
        : ''
    }

    ${
      draft.hasAttacks
        ? `<section class="section effects-section">
            <div class="block-head"><h2>Attacks</h2>
              <button type="button" data-action="add-attack">Add attack</button>
            </div>
            ${draft.attacks.map(renderAttack).join('')}
          </section>`
        : ''
    }
  `;
}

function renderTrainerFields(): string {
  return `
    <div class="grid-2">
      <label>Trainer type
        <select data-root="trainerType">
          ${(['ITEM', 'SUPPORTER', 'STADIUM', 'TOOL'] as const)
            .map(t => `<option value="${t}" ${draft.trainerType === t ? 'selected' : ''}>${t}</option>`)
            .join('')}
        </select>
      </label>
      <label>Tags (comma CardTag names)<input data-root="tags" value="${escapeAttr(draft.tags)}" placeholder="ACE_SPEC" /></label>
    </div>
    <label>Text<textarea data-root="trainerText" rows="4">${escapeHtml(draft.trainerText)}</textarea></label>
    ${renderPrefabPicker('trainer', 'trainer-effect', draft.trainerPrefabs, {
      serverEffect: draft.trainerServerEffect,
      serverSnippets: draft.trainerServerSnippets,
      unmatchedClauses: draft.trainerUnmatchedClauses,
    })}
    <p class="muted">Trainer effects match prefabs clause-by-clause, then fill gaps from similar Trainer reducers.</p>
  `;
}

function renderEnergyFields(): string {
  return `
    <div class="grid-2">
      <label>Energy type
        <select data-root="energyType">
          <option value="BASIC" ${draft.energyType === 'BASIC' ? 'selected' : ''}>BASIC</option>
          <option value="SPECIAL" ${draft.energyType === 'SPECIAL' ? 'selected' : ''}>SPECIAL</option>
        </select>
      </label>
      <label>Provides (e.g. CC)<input data-root="provides" value="${escapeAttr(draft.provides)}" /></label>
      <label>Choosable types (blend/unit, e.g. FDY)<input data-root="blendedEnergies" value="${escapeAttr(draft.blendedEnergies)}" placeholder="optional — listed in provides at check time" /></label>
      <label>Choosable unit count<input type="number" min="1" data-root="blendedEnergyCount" value="${escapeAttr(draft.blendedEnergyCount)}" /></label>
    </div>
    <label>Tags (comma CardTag names)<input data-root="tags" value="${escapeAttr(draft.tags)}" placeholder="ACE_SPEC" /></label>
    <label>Text<textarea data-root="energyText" rows="3">${escapeHtml(draft.energyText)}</textarea></label>
    ${draft.energyServerEffect ? `<p class="muted">Fallback matched ${escapeHtml(draft.energyServerEffect.source)} (${Math.round(draft.energyServerEffect.similarity * 100)}% text similarity).</p>` : ''}
  `;
}

function computedFullName(): string {
  const name = draft.name.trim();
  const set = draft.set.trim();
  if (!name) return '(name + set)';
  if (saveAsReprint && selectedReprintCandidate()?.identical) {
    return set ? `${name} ${set}` : name;
  }
  return fullNameForVariant(name, set, effectiveVariantOccurrence()) || '(name + set)';
}

function computedClassName(): string {
  if (draft.className.trim()) return draft.className.trim();
  const base = toPascalClassName(draft.name) || 'NewCard';
  if (saveAsReprint && selectedReprintCandidate()?.identical) {
    return base;
  }
  const occurrence = effectiveVariantOccurrence();
  if (occurrence > 1 && reprintSuggestedClassName) {
    return reprintSuggestedClassName;
  }
  return classNameForVariant(base, occurrence);
}

function renderReprintSection(): string {
  const selected = selectedReprintCandidate();
  const name = draft.name.trim();
  const set = draft.set.trim();
  const identicalCount = reprintCandidates.filter(c => c.identical).length;
  const distinctCount = reprintCandidates.length - identicalCount;
  let content = '';
  if (!name || !set) {
    content = '<p class="muted">Enter a card name and set to check for existing reprint sources.</p>';
  } else if (reprintLoading) {
    content = '<p class="muted">Checking the set for an existing card with this name…</p>';
  } else if (reprintError) {
    content = `<p class="muted">${escapeHtml(reprintError)}</p>`;
  } else if (reprintCandidates.length === 0) {
    content = '<p class="muted">No same-set card with this name found.</p>';
  } else {
    const variantNote =
      identicalCount === 0 && distinctCount > 0
        ? `<p class="muted">Same name, different attacks/abilities — will save as <code>${escapeHtml(
            reprintSuggestedClassName || computedClassName()
          )}</code> with fullName <code>${escapeHtml(
            reprintSuggestedFullName || computedFullName()
          )}</code> (not a reprint).</p>`
        : identicalCount > 0
          ? `<p class="muted">Found ${identicalCount} matching reprint source${identicalCount === 1 ? '' : 's'} (same attacks/abilities). Confirm before saving.</p>`
          : '';
    content = `
      ${variantNote}
      ${distinctCount > 0 && identicalCount > 0 ? `<p class="muted">Also found ${distinctCount} same-name card${distinctCount === 1 ? '' : 's'} with different attacks (not reprints).</p>` : ''}
      <div class="reprint-options">
        ${reprintCandidates
          .map(candidate => {
            const key = reprintKey(candidate);
            const label = candidate.identical ? 'identical' : 'different attacks';
            const disabled = candidate.identical ? '' : 'disabled';
            return `<div class="reprint-option${key === selectedReprintKey ? ' is-selected' : ''}${candidate.identical ? '' : ' is-distinct'}">
              <input type="radio" name="reprint-source" data-reprint-candidate="${escapeAttr(key)}" value="${escapeAttr(key)}" ${key === selectedReprintKey ? 'checked' : ''} ${disabled} aria-label="Use ${escapeAttr(candidate.fullName || candidate.name)} as reprint source" />
              ${candidate.imageUrl
                ? `<button type="button" class="reprint-image-button" data-action="open-reprint-image" data-image-url="${escapeAttr(candidate.imageUrl)}" data-image-alt="${escapeAttr(candidate.fullName || candidate.name)}" aria-label="Enlarge ${escapeAttr(candidate.fullName || candidate.name)} image"><img src="${escapeAttr(candidate.imageUrl)}" alt="${escapeAttr(candidate.fullName || candidate.name)}" /></button>`
                : '<div class="reprint-image-missing">No art</div>'}
              <div><strong>${escapeHtml(candidate.fullName || candidate.name)}</strong><small>${escapeHtml(candidate.set)} · #${escapeHtml(candidate.setNumber)} · ${escapeHtml(label)} · ${escapeHtml(candidate.sourcePath)}</small></div>
            </div>`;
          })
          .join('')}
      </div>
      <label class="reprint-toggle"><input type="checkbox" data-reprint-enabled ${saveAsReprint ? 'checked' : ''} ${identicalCount === 0 ? 'disabled' : ''} /> Save as a reprint in <code>other-prints.ts</code></label>
      ${selected?.identical ? `<p class="muted">The saved class will inherit <code>${escapeHtml(selected.className)}</code> and override this print’s set metadata.</p>` : ''}
    `;
  }
  return `<section class="reprint-section">
    <div class="block-head"><h3>Possible reprint</h3></div>
    ${content}
  </section>`;
}

type RenderScrollMode = 'preserve' | 'top' | 'browse';

function render(scrollMode: RenderScrollMode = 'preserve') {
  const scrollY =
    scrollMode === 'top' ? 0 : scrollMode === 'browse' ? browseScrollY : window.scrollY;
  const active = document.activeElement as HTMLElement | null;
  const activeKey =
    active?.getAttribute('data-output') ||
    active?.getAttribute('data-root') ||
    active?.getAttribute('data-key') ||
    active?.getAttribute('data-action') ||
    '';
  const activeId = active?.getAttribute('data-id') || active?.getAttribute('data-item') || '';
  const selStart =
    active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
      ? active.selectionStart
      : null;
  const selEnd =
    active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
      ? active.selectionEnd
      : null;
  const selectedReprint = selectedReprintCandidate();
  const canSave = Boolean(
    (saveAsReprint && selectedReprint?.identical) ||
      (draft.name.trim() && draft.set.trim() && (outputCode || !saveAsReprint))
  );
  const cardNav = view === 'editor' ? browseCardNav() : null;

  const heroActions =
    view === 'browse'
      ? `<button type="button" data-action="show-editor">Blank card form</button>
         <button type="button" data-action="show-duplicates">Duplicates</button>
         <button type="button" data-action="reload-browse">Reload catalog</button>`
      : view === 'duplicates'
        ? `<button type="button" data-action="show-browse">← Browse cards</button>
           <button type="button" data-action="reload-duplicates">Rescan</button>
           <button type="button" data-action="show-editor">Blank card form</button>`
        : `<button type="button" data-action="show-browse">← Browse cards</button>
         ${
           cardNav
             ? `<button type="button" data-action="prev-card" ${cardNav.canPrev ? '' : 'disabled'} title="Previous card in browse list">← Prev</button>
                <button type="button" data-action="next-card" ${cardNav.canNext ? '' : 'disabled'} title="Next card in browse list">Next →</button>`
             : ''
         }
         <button type="button" class="primary" data-action="generate">Generate card</button>
         <button type="button" data-action="save" ${canSave ? '' : 'disabled'}>${saveAsReprint && selectedReprint ? 'Save reprint to other-prints.ts' : 'Save to ptcg-server'}</button>
         <button type="button" data-action="copy" ${outputCode ? '' : 'disabled'}>Copy output</button>
         <button type="button" data-action="reset">Reset form</button>`;

  const cardIsImplemented =
    Boolean(sourceMeta) && isImplemented(browse.implementedIds, sourceMeta!.tcgDexId);
  const sourceBanner =
    view === 'editor' && sourceMeta
      ? `<div class="source-banner${cardIsImplemented ? ' is-implemented' : ''}">
          ${sourceMeta.imageUrl ? `<button type="button" class="source-image-button" data-action="open-image-modal" aria-label="Enlarge card image"><img src="${escapeAttr(sourceMeta.imageUrl)}" alt="Reference card" /></button>` : ''}
          <div>
            <div class="source-banner-head">
              <strong>Loaded from local catalog</strong>
              ${cardIsImplemented ? '<span class="impl-status" title="This card ID is already present in ptcg-server">Implemented</span>' : ''}
            </div>
            <p class="muted">${escapeHtml(sourceMeta.tcgDexId)}${sourceMeta.setName ? ` · ${escapeHtml(sourceMeta.setName)}` : ''}${sourceMeta.rarity ? ` · ${escapeHtml(sourceMeta.rarity)}` : ''}</p>
            <p class="muted">Art is reference only — generated <code>cardImage</code> stays <code>assets/cardback.png</code>. Match prefabs from attack/power text before generating.</p>
            ${
              cardNav
                ? `<div class="card-nav">
                    <button type="button" data-action="prev-card" ${cardNav.canPrev ? '' : 'disabled'} aria-label="Previous card">← Previous</button>
                    <span class="card-nav-label muted">${escapeHtml(cardNav.label)}</span>
                    <button type="button" data-action="next-card" ${cardNav.canNext ? '' : 'disabled'} aria-label="Next card">Next →</button>
                  </div>`
                : ''
            }
          </div>
        </div>`
      : '';

  const body =
    view === 'browse'
      ? renderBrowse(browse)
      : view === 'duplicates'
        ? renderDuplicates(duplicates)
        : `<main class="layout">
      <form class="form" id="card-form">
        ${sourceBanner}
        <section class="section identity-section">
          <h2>Identity</h2>
          <div class="grid-3">
            <label>Class name<input data-root="className" value="${escapeAttr(draft.className)}" placeholder="${escapeAttr(computedClassName())}" /></label>
            <label>Extends
              <select data-root="extends">
                <option value="PokemonCard" ${draft.extends === 'PokemonCard' ? 'selected' : ''}>PokemonCard</option>
                <option value="TrainerCard" ${draft.extends === 'TrainerCard' ? 'selected' : ''}>TrainerCard</option>
                <option value="EnergyCard" ${draft.extends === 'EnergyCard' ? 'selected' : ''}>EnergyCard</option>
              </select>
            </label>
            <label>Name<input data-root="name" value="${escapeAttr(draft.name)}" /></label>
          </div>
          <div class="grid-3">
            <label>Set<input data-root="set" value="${escapeAttr(draft.set)}" placeholder="TEF" /></label>
            <label>Set number<input data-root="setNumber" value="${escapeAttr(draft.setNumber)}" /></label>
            <label>Regulation mark<input data-root="regulationMark" value="${escapeAttr(draft.regulationMark)}" placeholder="H" /></label>
          </div>
          <div class="grid-2">
            <label>cardImage<input readonly value="assets/cardback.png" /></label>
            <label>fullName (name + set[+N])<input readonly value="${escapeAttr(computedFullName())}" /></label>
          </div>
          ${
            draft.extends === 'PokemonCard'
              ? renderPokemonFields()
              : ''
          }
        </section>

        ${
          draft.extends === 'PokemonCard'
            ? renderPokemonEffects()
            : draft.extends === 'TrainerCard'
              ? renderTrainerFields()
              : renderEnergyFields()
        }
      </form>

      <aside class="output">
        <div class="block-head">
          <h2>Generated TypeScript</h2>
        </div>
        <textarea
          class="generated-code"
          data-output="generated-code"
          aria-label="Generated TypeScript"
          spellcheck="false"
          placeholder="Click “Generate card” to emit source."
        >${escapeHtml(outputCode)}</textarea>
        ${renderReprintSection()}
        <details class="catalog-help">
          <summary>Available prefabs (${catalogStats().total}: ${catalogStats().curated} curated + ${catalogStats().total - catalogStats().curated} engine; ${catalogStats().withPatterns} with text patterns)</summary>
          <ul>
            ${prefabsForScope('attack')
              .concat(prefabsForScope('power'))
              .concat(prefabsForScope('trainer'))
              .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
              .filter(p => p.patterns.length > 0 || !p.description.startsWith('[helper]'))
              .slice(0, 200)
              .map(
                (p) =>
                  `<li><strong>${escapeHtml(p.name)}</strong> — ${escapeHtml(p.exampleTexts[0] || p.description)}</li>`
              )
              .join('')}
          </ul>
          <p class="muted">Full engine catalog is in the Add prefab dropdown (includes helpers). Match from text uses curated patterns first, then JSDoc examples, then similar card reducers from every implemented set card.</p>
        </details>
      </aside>
    </main>`;

  const title =
    view === 'browse' ? 'Browse cards' : view === 'duplicates' ? 'Duplicate cards' : 'Card Builder';
  const lede =
    view === 'browse'
      ? 'Pick a series → set → card to pre-fill the generator, or check cards in a set and generate + save them to ptcg-server in one click.'
      : view === 'duplicates'
        ? 'Cards that share a set number, fullName, index entry, or reprint slot. Compare each copy side by side with catalog art.'
        : 'Scaffold card TypeScript from form fields. Attack/ability effects emit reduceEffect code when a matching prefab exists.';

  app.innerHTML = `
    <header class="hero">
      <div>
        <p class="eyebrow">Local only · PTCG Elite · pokemon-tcg-data</p>
        <h1>${title}</h1>
        <p class="lede">${lede}</p>
      </div>
      <div class="hero-actions">
        ${heroActions}
      </div>
    </header>

    ${statusMessage ? `<div class="status-box">${escapeHtml(statusMessage)}</div>` : ''}
    ${outputError ? `<div class="error-box">${escapeHtml(outputError)}</div>` : ''}

    ${body}
    ${
      imageModalOpen && imageModalUrl
        ? `<div class="image-modal-backdrop" data-image-modal role="dialog" aria-modal="true" aria-label="Card image preview">
            <div class="image-modal">
              <button type="button" class="modal-close" data-action="close-image-modal" aria-label="Close image preview">×</button>
              <img src="${escapeAttr(imageModalUrl)}" alt="${escapeAttr(imageModalAlt || 'Card image enlarged')}" />
            </div>
          </div>`
        : ''
    }
  `;

  bindEvents();
  if (view === 'browse') bindBrowseEvents();
  if (view === 'duplicates') bindDuplicatesEvents();

  // Restore focus roughly
  if (activeKey && view === 'editor') {
    const candidates = Array.from(
      app.querySelectorAll<HTMLElement>(
        `[data-output="${activeKey}"], [data-root="${activeKey}"], [data-key="${activeKey}"]`
      )
    );
    const el =
      (activeId
        ? candidates.find(
            c =>
              c.getAttribute('data-id') === activeId || c.getAttribute('data-item') === activeId
          )
        : candidates[0]) || candidates[0];
    if (el && 'focus' in el) {
      (el as HTMLInputElement).focus();
      if (
        selStart !== null &&
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      ) {
        try {
          el.setSelectionRange(selStart, selEnd ?? selStart);
        } catch {
          /* ignore */
        }
      }
    }
  }
  window.scrollTo(0, scrollY);
}

function bindBrowseEvents() {
  app.querySelectorAll<HTMLButtonElement>('[data-browse]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.preventDefault();
      const action = btn.getAttribute('data-browse');
      await handleBrowse(action, btn);
    });
  });

  const searchForm = app.querySelector<HTMLFormElement>('[data-browse-form="search"]');
  searchForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const q = new FormData(searchForm).get('q');
    const query = String(q || '').trim();
    if (!query) return;
    browse.searchOffset = 0;
    browse.searchHasMore = false;
    browse.cards = [];
    clearBrowseSelection(browse);
    statusMessage = '';
    outputError = '';
    browse.loading = true;
    render();
    await runSearch(browse, query);
    render();
  });

  const filterInput = app.querySelector<HTMLInputElement>('[data-browse-filter]');
  filterInput?.addEventListener('input', () => {
    browse.filter = filterInput.value;
    // Re-render body only would be nicer; full render is ok
    const pos = filterInput.selectionStart;
    render();
    const again = app.querySelector<HTMLInputElement>('[data-browse-filter]');
    if (again) {
      again.focus();
      try {
        again.setSelectionRange(pos, pos);
      } catch {
        /* ignore */
      }
    }
  });

  const hideImpl = app.querySelector<HTMLInputElement>('[data-browse-hide-implemented]');
  hideImpl?.addEventListener('change', () => {
    browse.hideImplemented = hideImpl.checked;
    render();
  });

  app.querySelectorAll<HTMLInputElement>('[data-browse-select]').forEach(el => {
    el.addEventListener('click', e => e.stopPropagation());
    el.addEventListener('change', () => {
      const id = el.getAttribute('data-browse-select');
      if (!id || browse.bulkRunning) return;
      if (el.checked) browse.selectedIds.add(id);
      else browse.selectedIds.delete(id);
      render();
    });
  });

  app.querySelectorAll<HTMLLabelElement>('.card-select').forEach(label => {
    label.addEventListener('click', e => e.stopPropagation());
  });

  const overwrite = app.querySelector<HTMLInputElement>('[data-browse-overwrite]');
  overwrite?.addEventListener('change', () => {
    browse.overwriteExisting = overwrite.checked;
  });
}

async function handleBrowse(action: string | null, btn: HTMLButtonElement) {
  switch (action) {
    case 'search-prev': {
      if (browse.searchOffset <= 0) return;
      browse.loading = true;
      statusMessage = `Searching ${browse.searchQuery}…`;
      outputError = '';
      browse.searchOffset = Math.max(0, browse.searchOffset - browse.searchPageSize);
      render();
      await runSearch(browse, browse.searchQuery);
      render();
      break;
    }
    case 'search-next': {
      if (!browse.searchHasMore) return;
      browse.loading = true;
      statusMessage = `Searching ${browse.searchQuery}…`;
      outputError = '';
      browse.searchOffset += browse.searchPageSize;
      render();
      await runSearch(browse, browse.searchQuery);
      render();
      break;
    }
    case 'go-series':
      browse.level = 'series';
      browse.filter = '';
      browse.error = '';
      clearBrowseSelection(browse);
      if (browse.series.length === 0) {
        browse.loading = true;
        render();
        await loadSeries(browse);
      }
      render();
      break;
    case 'go-sets':
      clearBrowseSelection(browse);
      if (browse.activeSerieId) {
        browse.level = 'sets';
        browse.filter = '';
        render();
      } else {
        browse.level = 'series';
        render();
      }
      break;
    case 'open-serie': {
      const id = btn.getAttribute('data-id')!;
      const name = btn.getAttribute('data-name') || id;
      browse.loading = true;
      render();
      await loadSerieSets(browse, id, name);
      render();
      break;
    }
    case 'open-set': {
      const id = btn.getAttribute('data-id')!;
      browse.loading = true;
      render();
      await loadSetCards(browse, id);
      render();
      break;
    }
    case 'pick-card': {
      const id = btn.getAttribute('data-id')!;
      browseScrollY = window.scrollY;
      await openCardInEditor(id);
      break;
    }
    case 'select-unimplemented': {
      for (const card of unimplementedVisibleCards(browse)) {
        browse.selectedIds.add(card.id);
      }
      render();
      break;
    }
    case 'select-all-visible': {
      for (const card of visibleBrowseCards(browse)) {
        browse.selectedIds.add(card.id);
      }
      render();
      break;
    }
    case 'clear-selection':
      clearBrowseSelection(browse);
      render();
      break;
    case 'bulk-save': {
      if (browse.bulkRunning) return;
      const cards = selectedBrowseCards(browse);
      if (cards.length === 0) return;
      browse.bulkRunning = true;
      browse.bulkStatus = `Saving 1/${cards.length}…`;
      statusMessage = browse.bulkStatus;
      outputError = '';
      render();
      try {
        const results = await generateAndSaveCatalogCards(
          cards.map(card => card.id),
          {
            overwrite: browse.overwriteExisting,
            onProgress: ({ index, total, cardId }) => {
              const name = cards.find(card => card.id === cardId)?.name || cardId;
              browse.bulkStatus = `Saving ${index}/${total}: ${name}…`;
              const statusEl = app.querySelector<HTMLElement>('[data-bulk-status]');
              if (statusEl) {
                statusEl.hidden = false;
                statusEl.textContent = browse.bulkStatus;
              }
            },
          }
        );
        for (const result of results) {
          if ((result.outcome === 'saved' || result.outcome === 'reprint') && result.cardId) {
            browse.implementedIds.add(result.cardId);
            markImplemented(result.cardId);
            browse.selectedIds.delete(result.cardId);
          }
        }
        statusMessage = summarizeBulkSave(results);
        const failed = results.filter(result => result.outcome === 'failed');
        outputError = failed.length
          ? failed.map(result => `${result.name || result.cardId}: ${result.message}`).join(' · ')
          : '';
      } catch (error) {
        outputError = error instanceof Error ? error.message : String(error);
        statusMessage = '';
      } finally {
        browse.bulkRunning = false;
        browse.bulkStatus = '';
        render();
      }
      break;
    }
  }
}

function findAttack(id: string): AttackDraft | undefined {
  return draft.attacks.find(a => a.id === id);
}

function findPower(id: string): PowerDraft | undefined {
  return draft.powers.find(p => p.id === id);
}

function findSelectedPrefabs(kind: 'attack' | 'power' | 'trainer', itemId: string): AttackDraft['selectedPrefabs'] | undefined {
  if (kind === 'attack') return findAttack(itemId)?.selectedPrefabs;
  if (kind === 'power') return findPower(itemId)?.selectedPrefabs;
  return draft.trainerPrefabs;
}

function bindEvents() {
  const imageModal = app.querySelector<HTMLDivElement>('[data-image-modal]');
  imageModal?.addEventListener('click', event => {
    if (event.target === imageModal) {
      imageModalOpen = false;
      render();
    }
  });

  app.querySelectorAll<HTMLInputElement>('[data-reprint-candidate]').forEach(input => {
    input.addEventListener('change', () => {
      selectedReprintKey = input.value;
      const selected = selectedReprintCandidate();
      saveAsReprint = Boolean(selected?.identical);
      render();
    });
  });

  const reprintToggle = app.querySelector<HTMLInputElement>('[data-reprint-enabled]');
  reprintToggle?.addEventListener('change', () => {
    saveAsReprint = reprintToggle.checked && Boolean(selectedReprintCandidate()?.identical);
    render();
  });

  const generatedCode = app.querySelector<HTMLTextAreaElement>('[data-output="generated-code"]');
  generatedCode?.addEventListener('input', () => {
    outputCode = generatedCode.value;
  });

  app.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-root]').forEach(el => {
    const key = el.getAttribute('data-root')!;
    const handler = () => {
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        (draft as any)[key] = el.checked;
      } else {
        (draft as any)[key] = el.value;
      }
      if (key === 'extends' || key === 'hasPowers' || key === 'hasAttacks') {
        render();
        scheduleReprintRefresh();
      }
      if (key === 'name' || key === 'set' || key === 'setNumber') {
        void refreshReprintCandidates();
      }
      if (key === 'trainerText' || key === 'energyText') {
        scheduleReprintRefresh();
      }
    };
    el.addEventListener('change', handler);
    if (!(el instanceof HTMLSelectElement) && !(el instanceof HTMLInputElement && el.type === 'checkbox')) {
      el.addEventListener('input', () => {
        (draft as any)[key] = el.value;
        if (key === 'trainerText' || key === 'energyText') {
          scheduleReprintRefresh();
        }
      });
    }
  });

  app.querySelectorAll<HTMLElement>('[data-field="attack"]').forEach(el => {
    const id = el.getAttribute('data-id')!;
    const key = el.getAttribute('data-key')!;
    const apply = () => {
      const attack = findAttack(id);
      if (!attack) return;
      (attack as any)[key] = (el as HTMLInputElement).value;
      if (key === 'cost') render();
      if (key === 'name' || key === 'text') scheduleReprintRefresh();
    };
    el.addEventListener('change', apply);
    el.addEventListener('input', () => {
      const attack = findAttack(id);
      if (!attack) return;
      (attack as any)[key] = (el as HTMLInputElement).value;
      if (key === 'name' || key === 'text') scheduleReprintRefresh();
    });
  });

  app.querySelectorAll<HTMLElement>('[data-field="power"]').forEach(el => {
    const id = el.getAttribute('data-id')!;
    const key = el.getAttribute('data-key')!;
    el.addEventListener('change', () => {
      const power = findPower(id);
      if (!power) return;
      (power as any)[key] = (el as HTMLInputElement).value;
      if (key === 'name' || key === 'text') scheduleReprintRefresh();
    });
    el.addEventListener('input', () => {
      const power = findPower(id);
      if (!power) return;
      (power as any)[key] = (el as HTMLInputElement).value;
      if (key === 'name' || key === 'text') scheduleReprintRefresh();
    });
  });

  app.querySelectorAll<HTMLInputElement>('[data-field="power-bool"]').forEach(el => {
    el.addEventListener('change', () => {
      const power = findPower(el.getAttribute('data-id')!);
      if (!power) return;
      (power as any)[el.getAttribute('data-key')!] = el.checked;
    });
  });

  app.querySelectorAll<HTMLInputElement>('[data-action="prefab-param"]').forEach(el => {
    el.addEventListener('input', () => {
      const kind = el.getAttribute('data-kind') as 'attack' | 'power' | 'trainer';
      const itemId = el.getAttribute('data-item')!;
      const selId = el.getAttribute('data-sel')!;
      const key = el.getAttribute('data-key')!;
      const selected = findSelectedPrefabs(kind, itemId);
      const sel = selected?.find(s => s.id === selId);
      if (sel) sel.params[key] = el.value;
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const action = btn.getAttribute('data-action');
      handleAction(action, btn);
    });
  });
}

async function handleAction(action: string | null, btn: HTMLButtonElement) {
  switch (action) {
    case 'prev-card':
      void navigateBrowseCard(-1);
      break;
    case 'next-card':
      void navigateBrowseCard(1);
      break;
    case 'show-browse':
      imageModalOpen = false;
      imageModalUrl = '';
      clearReprintState();
      view = 'browse';
      statusMessage = '';
      outputError = '';
      render('browse');
      void ensureSeriesLoaded();
      break;
    case 'show-duplicates':
      imageModalOpen = false;
      imageModalUrl = '';
      clearReprintState();
      browseScrollY = window.scrollY;
      view = 'duplicates';
      statusMessage = '';
      outputError = '';
      render('top');
      void ensureDuplicatesLoaded(true);
      break;
    case 'reload-duplicates':
      imageModalOpen = false;
      imageModalUrl = '';
      statusMessage = '';
      outputError = '';
      view = 'duplicates';
      render('top');
      void ensureDuplicatesLoaded(true);
      break;
    case 'show-editor':
      imageModalOpen = false;
      imageModalUrl = '';
      clearReprintState();
      browseScrollY = window.scrollY;
      view = 'editor';
      sourceMeta = null;
      statusMessage = '';
      render('top');
      break;
    case 'reload-browse':
      imageModalOpen = false;
      imageModalUrl = '';
      clearReprintState();
      browse = createBrowseState();
      view = 'browse';
      statusMessage = '';
      outputError = '';
      clearImplementedCache();
      render();
      void (async () => {
        await resetDataSource();
        await ensureImplementedLoaded(browse);
        await loadSeries(browse);
        render();
      })();
      break;
    case 'add-attack':
      draft.attacks.push(emptyAttack());
      render();
      break;
    case 'remove-attack': {
      const id = btn.getAttribute('data-id')!;
      draft.attacks = draft.attacks.filter(a => a.id !== id);
      if (draft.attacks.length === 0) draft.attacks.push(emptyAttack());
      render();
      break;
    }
    case 'add-power':
      draft.powers.push(emptyPower());
      render();
      break;
    case 'remove-power': {
      const id = btn.getAttribute('data-id')!;
      draft.powers = draft.powers.filter(p => p.id !== id);
      if (draft.powers.length === 0) draft.powers.push(emptyPower());
      render();
      break;
    }
    case 'add-prefab': {
      const kind = btn.getAttribute('data-kind') as 'attack' | 'power' | 'trainer';
      const itemId = btn.getAttribute('data-item')!;
      const select = app.querySelector<HTMLSelectElement>(
        `select[data-role="prefab-select"][data-kind="${kind}"][data-item="${itemId}"]`
      );
      const prefabId = select?.value;
      if (!prefabId) return;
      const created = createManualSelected(prefabId);
      if (!created) return;
      const selected = findSelectedPrefabs(kind, itemId);
      selected?.push(created);
      render();
      break;
    }
    case 'remove-prefab': {
      const kind = btn.getAttribute('data-kind') as 'attack' | 'power' | 'trainer';
      const itemId = btn.getAttribute('data-item')!;
      const selId = btn.getAttribute('data-sel')!;
      const selected = findSelectedPrefabs(kind, itemId);
      if (selected) {
        selected.splice(0, selected.length, ...selected.filter(s => s.id !== selId));
      }
      render();
      break;
    }
    case 'match-prefabs': {
      syncAllInputs();
      const kind = btn.getAttribute('data-kind') as 'attack' | 'power' | 'trainer';
      const itemId = btn.getAttribute('data-item')!;
      const item = kind === 'attack' ? findAttack(itemId) : kind === 'power' ? findPower(itemId) : undefined;
      const text = kind === 'trainer' ? draft.trainerText : item?.text;
      if (!text?.trim()) return;
      try {
        const result = await resolveEffectHybrid(text, kind);
        if (kind === 'trainer') {
          draft.trainerPrefabs = result.selectedPrefabs;
          draft.trainerServerEffect = result.serverEffect;
          draft.trainerServerSnippets =
            result.serverSnippets.length > 0 ? result.serverSnippets : undefined;
          draft.trainerUnmatchedClauses =
            result.unmatchedClauses.length > 0 ? result.unmatchedClauses : undefined;
        } else if (item) {
          item.selectedPrefabs = result.selectedPrefabs;
          item.serverEffect = result.serverEffect;
          item.serverSnippets =
            result.serverSnippets.length > 0 ? result.serverSnippets : undefined;
          item.unmatchedClauses =
            result.unmatchedClauses.length > 0 ? result.unmatchedClauses : undefined;
          item.matchError = undefined;
        }
        statusMessage = describeHybridResolution(result);
        outputError = '';
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (kind === 'trainer') {
          draft.trainerPrefabs = [];
          draft.trainerServerEffect = undefined;
          draft.trainerServerSnippets = undefined;
          draft.trainerUnmatchedClauses = undefined;
        } else if (item) {
          item.matchError = msg;
          item.selectedPrefabs = [];
          item.serverEffect = undefined;
          item.serverSnippets = undefined;
          item.unmatchedClauses = undefined;
        }
        statusMessage = '';
        outputError = msg;
      }
      render();
      break;
    }
    case 'generate': {
      // Sync latest input values that may not have blurred
      syncAllInputs();
      try {
        outputCode = await generateCardSource(draft, {
          occurrence: effectiveVariantOccurrence(),
        });
        outputError = '';
        statusMessage = 'Generated successfully.';
      } catch (err) {
        outputCode = '';
        outputError = err instanceof Error ? err.message : String(err);
        statusMessage = '';
      }
      render();
      break;
    }
    case 'open-image-modal':
      if (!sourceMeta?.imageUrl) return;
      imageModalOpen = true;
      imageModalUrl = sourceMeta.imageUrl;
      imageModalAlt = 'Reference card enlarged';
      render();
      app.querySelector<HTMLButtonElement>('[data-action="close-image-modal"]')?.focus();
      break;
    case 'open-reprint-image': {
      const imageUrl = btn.getAttribute('data-image-url');
      if (!imageUrl) return;
      imageModalOpen = true;
      imageModalUrl = imageUrl;
      imageModalAlt = btn.getAttribute('data-image-alt') || 'Reprint source card enlarged';
      render();
      app.querySelector<HTMLButtonElement>('[data-action="close-image-modal"]')?.focus();
      break;
    }
    case 'remove-duplicate': {
      const className = btn.getAttribute('data-class-name') || '';
      const sourcePath = btn.getAttribute('data-source-path') || '';
      if (!className || !sourcePath) return;
      const confirmed = window.confirm(
        `Remove ${className} from ptcg-server?\n\n${sourcePath}\n\nThis deletes the card class (and its file when it is the only export) and unhooks it from index.ts.`
      );
      if (!confirmed) return;
      btn.disabled = true;
      try {
        statusMessage = await removeDuplicateCard(className, sourcePath);
        outputError = '';
        applyRemovedDuplicate(duplicates, className, sourcePath);
      } catch (error) {
        outputError = error instanceof Error ? error.message : String(error);
        statusMessage = '';
      }
      render();
      break;
    }
    case 'close-image-modal':
      imageModalOpen = false;
      imageModalUrl = '';
      render();
      break;
    case 'copy':
      if (outputCode) {
        navigator.clipboard.writeText(outputCode).then(() => {
          statusMessage = 'Copied to clipboard.';
          render();
        });
      }
      break;
    case 'save': {
      syncAllInputs();
      const selected = selectedReprintCandidate();
      const reprint =
        saveAsReprint && selected?.identical
          ? {
              className: draft.className || computedClassName().replace(/[^A-Za-z0-9]/g, ''),
              sourceClassName: selected.className,
              sourcePath: selected.sourcePath,
              name: draft.name,
              set: draft.set,
              setNumber: draft.setNumber,
              fullName: computedFullName(),
              regulationMark: draft.regulationMark,
            }
          : undefined;
      const resolvedClassName =
        draft.className.trim() || computedClassName().replace(/[^A-Za-z0-9]/g, '');
      void saveCardToServer({
        draft,
        source: outputCode,
        className: resolvedClassName,
        occurrence: effectiveVariantOccurrence(),
        reprint,
        onConflict: () => window.confirm('That card file already exists. Overwrite it?'),
      })
        .then(result => {
          if (result.source) outputCode = result.source;
          if (result.outcome === 'cancelled') return;
          if (result.outcome === 'failed') {
            outputError = result.message;
            statusMessage = '';
          } else {
            statusMessage = result.message;
            outputError = '';
          }
          render();
        })
        .catch(err => {
          outputError = err instanceof Error ? err.message : String(err);
          statusMessage = '';
          render();
        });
      break;
    }
    case 'reset':
      imageModalOpen = false;
      imageModalUrl = '';
      clearReprintState();
      draft = defaultDraft();
      sourceMeta = null;
      outputCode = '';
      outputError = '';
      statusMessage = '';
      render();
      break;
  }
}

function syncAllInputs() {
  app.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-root]').forEach(el => {
    const key = el.getAttribute('data-root')!;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      (draft as any)[key] = el.checked;
    } else {
      (draft as any)[key] = el.value;
    }
  });
  app.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field="attack"]').forEach(el => {
    const attack = findAttack(el.getAttribute('data-id')!);
    if (attack) (attack as any)[el.getAttribute('data-key')!] = el.value;
  });
  app.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field="power"]').forEach(el => {
    const power = findPower(el.getAttribute('data-id')!);
    if (power) (power as any)[el.getAttribute('data-key')!] = el.value;
  });
  app.querySelectorAll<HTMLInputElement>('[data-field="power-bool"]').forEach(el => {
    const power = findPower(el.getAttribute('data-id')!);
    if (power) (power as any)[el.getAttribute('data-key')!] = el.checked;
  });
  app.querySelectorAll<HTMLInputElement>('[data-action="prefab-param"]').forEach(el => {
    const kind = el.getAttribute('data-kind') as 'attack' | 'power' | 'trainer';
    const selected = findSelectedPrefabs(kind, el.getAttribute('data-item')!);
    const sel = selected?.find(s => s.id === el.getAttribute('data-sel'));
    if (sel) sel.params[el.getAttribute('data-key')!] = el.value;
  });

  const generatedCode = app.querySelector<HTMLTextAreaElement>('[data-output="generated-code"]');
  if (generatedCode) outputCode = generatedCode.value;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

// Silence unused type imports used only for casts in comments
void (0 as unknown as EnergyShort | PowerTypeName | StageName | WeaknessValue);

async function ensureEngineKnowledgeLoaded(): Promise<void> {
  try {
    const index = await loadEnginePrefabIndex();
    mergeEnginePrefabs(index.prefabs.map(engineRecordToPrefab));
    clearServerEffectsCache();
    const stats = catalogStats();
    console.info(
      `[card-builder] Engine knowledge: ${index.count} prefabs indexed, catalog ${stats.total} (${stats.curated} curated, ${stats.withPatterns} with patterns)`
    );
  } catch (error) {
    console.warn('[card-builder] Failed to load engine prefabs; using curated catalog only.', error);
  }
}

render();
void ensureEngineKnowledgeLoaded().then(() => render());
void ensureSeriesLoaded();
