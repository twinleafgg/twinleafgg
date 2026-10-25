import {
  TcgDexApiError,
  cardImageUrl,
  getActiveSource,
  getCard,
  getSerie,
  getSet,
  listSeries,
  searchCardsByName,
  setLogoUrl,
  type TcgDexCardResume,
  type TcgDexSerieResume,
  type TcgDexSet,
  type TcgDexSetResume,
} from './client';
import { mapTcgDexCardToDraft, type BrowseSourceMeta } from './mapCardToDraft';
import { isImplemented, loadImplementedCardIds } from '../data/implemented';
import type { CardDraft } from '../types';

export type BrowseLevel = 'series' | 'sets' | 'cards' | 'search';

export interface BrowseState {
  level: BrowseLevel;
  loading: boolean;
  error: string;
  series: TcgDexSerieResume[];
  sets: TcgDexSetResume[];
  activeSerieId: string;
  activeSerieName: string;
  activeSet: TcgDexSet | null;
  cards: TcgDexCardResume[];
  searchQuery: string;
  filter: string;
  searchOffset: number;
  searchPageSize: number;
  searchHasMore: boolean;
  implementedIds: Set<string>;
  hideImplemented: boolean;
  selectedIds: Set<string>;
  overwriteExisting: boolean;
  bulkRunning: boolean;
  bulkStatus: string;
}

export function createBrowseState(): BrowseState {
  return {
    level: 'series',
    loading: false,
    error: '',
    series: [],
    sets: [],
    activeSerieId: '',
    activeSerieName: '',
    activeSet: null,
    cards: [],
    searchQuery: '',
    filter: '',
    searchOffset: 0,
    searchPageSize: 80,
    searchHasMore: false,
    implementedIds: new Set(),
    hideImplemented: false,
    selectedIds: new Set(),
    overwriteExisting: false,
    bulkRunning: false,
    bulkStatus: '',
  };
}

export function clearBrowseSelection(state: BrowseState): void {
  state.selectedIds = new Set();
}

export async function ensureImplementedLoaded(state: BrowseState): Promise<void> {
  state.implementedIds = await loadImplementedCardIds();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function matchesFilter(name: string, filter: string): boolean {
  if (!filter.trim()) return true;
  return name.toLowerCase().includes(filter.trim().toLowerCase());
}

export function renderBrowse(state: BrowseState): string {
  const source = getActiveSource();
  const crumbs: string[] = [];
  crumbs.push(`<button type="button" class="linkish" data-browse="go-series">Series</button>`);
  if (state.level === 'sets' || state.level === 'cards') {
    crumbs.push(`<span>/</span><button type="button" class="linkish" data-browse="go-sets">${escapeHtml(state.activeSerieName || 'Sets')}</button>`);
  }
  if (state.level === 'cards' && state.activeSet) {
    crumbs.push(`<span>/</span><span>${escapeHtml(state.activeSet.name)}</span>`);
  }
  if (state.level === 'search') {
    crumbs.push(`<span>/</span><span>Search</span>`);
  }

  return `
    <section class="browse">
      <div class="browse-toolbar">
        <div class="crumbs">${crumbs.join(' ')}</div>
        <form class="search-row" data-browse-form="search">
          <input name="q" placeholder="Search card name…" value="${escapeHtml(state.searchQuery)}" />
          <button type="submit">Search</button>
        </form>
      </div>

      <div class="status-box muted-note">${escapeHtml(source.note)}</div>
      ${
        state.implementedIds.size
          ? `<div class="browse-options">
              <label class="check-inline">
                <input type="checkbox" data-browse-hide-implemented ${state.hideImplemented ? 'checked' : ''} />
                Hide implemented (${state.implementedIds.size.toLocaleString()} in catalog)
              </label>
            </div>`
          : ''
      }
      ${state.error ? `<div class="error-box">${escapeHtml(state.error)}</div>` : ''}
      ${state.loading ? `<div class="status-box">Loading local card data…</div>` : ''}

      ${
        state.level === 'series' || state.level === 'sets'
          ? `<div class="filter-row">
              <label>Filter list
                <input data-browse-filter value="${escapeHtml(state.filter)}" placeholder="Type to filter…" />
              </label>
            </div>`
          : ''
      }

      ${renderBrowseBody(state)}
    </section>
  `;
}

function renderBrowseBody(state: BrowseState): string {
  if (state.loading && state.series.length === 0 && state.sets.length === 0 && state.cards.length === 0) {
    return '';
  }

  if (state.level === 'series') {
    const items = state.series.filter(s => matchesFilter(s.name, state.filter));
    return `<div class="tile-grid">
      ${items
        .map(s => {
          const logo = setLogoUrl(s.logo);
          return `<button type="button" class="tile" data-browse="open-serie" data-id="${escapeHtml(s.id)}" data-name="${escapeHtml(s.name)}">
            ${logo ? `<img src="${escapeHtml(logo)}" alt="" loading="lazy" onerror="this.style.display='none'" />` : '<div class="tile-placeholder"></div>'}
            <span>${escapeHtml(s.name)}</span>
            <small>${escapeHtml(s.id)}</small>
          </button>`;
        })
        .join('')}
    </div>`;
  }

  if (state.level === 'sets') {
    const items = state.sets.filter(s => matchesFilter(s.name, state.filter) || matchesFilter(s.id, state.filter));
    return `<div class="tile-grid">
      ${items
        .map(s => {
          const logo = setLogoUrl(s.logo);
          return `<button type="button" class="tile" data-browse="open-set" data-id="${escapeHtml(s.id)}">
            ${logo ? `<img src="${escapeHtml(logo)}" alt="" loading="lazy" onerror="this.style.display='none'" />` : '<div class="tile-placeholder"></div>'}
            <span>${escapeHtml(s.name)}</span>
            <small>${escapeHtml(s.id)} · ${s.cardCount?.official ?? s.cardCount?.total ?? '?'} cards</small>
          </button>`;
        })
        .join('')}
    </div>`;
  }

  // cards or search
  let cards = state.cards;
  if (state.hideImplemented) {
    cards = cards.filter(c => !isImplemented(state.implementedIds, c.id));
  }
  if (state.cards.length === 0 && !state.loading) {
    return `<p class="muted">No cards found.</p>`;
  }
  const implementedCount = state.cards.filter(c => isImplemented(state.implementedIds, c.id)).length;
  const filteredOutCount = state.hideImplemented ? cards.length : state.cards.length;
  const allHiddenByFilter =
    state.hideImplemented && state.cards.length > 0 && filteredOutCount === 0 && !state.loading;

  const searchPagination =
    state.level === 'search'
      ? `<div class="search-pagination">
          <div class="search-range muted">
            ${
              state.cards.length
                ? `Showing ${escapeHtml(String(state.searchOffset + 1))}–${escapeHtml(
                    String(state.searchOffset + state.cards.length)
                  )}`
                : 'Showing 0 results'
            }
          </div>
          <div class="search-pagination-buttons">
            <button type="button" data-browse="search-prev" ${
              state.searchOffset <= 0 ? 'disabled' : ''
            }>Prev</button>
            <button type="button" data-browse="search-next" ${!state.searchHasMore ? 'disabled' : ''}>
              Next
            </button>
          </div>
        </div>`
      : '';

  return `
  ${
    state.cards.length && state.implementedIds.size
      ? `<p class="muted browse-impl-summary">${implementedCount} of ${state.cards.length} shown as implemented</p>`
      : ''
  }
  ${allHiddenByFilter ? `<p class="muted">All ${state.cards.length} result(s) on this page are already implemented.</p>` : ''}
  <div class="card-grid">
    ${cards
      .map(c => {
        const img = cardImageUrl(c.image, 'low');
        const done = isImplemented(state.implementedIds, c.id);
        const selected = state.selectedIds.has(c.id);
        return `<div class="card-tile-wrap${selected ? ' is-selected' : ''}${done ? ' is-implemented' : ''}" data-card-wrap="${escapeHtml(c.id)}">
          <label class="card-select" title="Select for bulk generate">
            <input type="checkbox" data-browse-select="${escapeHtml(c.id)}" ${selected ? 'checked' : ''} ${state.bulkRunning ? 'disabled' : ''} />
          </label>
          <button type="button" class="card-tile${done ? ' is-implemented' : ''}" data-browse="pick-card" data-id="${escapeHtml(c.id)}" ${done ? 'title="Already implemented"' : ''}>
            ${done ? '<span class="impl-badge">Implemented</span>' : ''}
            ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(c.name)}" loading="lazy" onerror="this.src=''; this.classList.add('missing')" />` : '<div class="card-missing">No art</div>'}
            <div class="card-meta">
              <strong>${escapeHtml(c.name)}</strong>
              <small>#${escapeHtml(c.localId)}${c.localId ? ' · ' : ''}${escapeHtml(c.id.length > 18 ? `${c.id.slice(0, 14)}…` : c.id)}</small>
            </div>
          </button>
        </div>`;
      })
      .join('')}
  </div>
  ${searchPagination}
  ${renderBulkBar(state)}`;
}

function renderBulkBar(state: BrowseState): string {
  if (state.level !== 'cards' && state.level !== 'search') return '';
  if (state.cards.length === 0 && state.selectedIds.size === 0) return '';
  const selected = state.selectedIds.size;
  const noun = selected === 1 ? 'card' : 'cards';
  const busy = state.bulkRunning;
  return `
    <div class="bulk-bar" data-bulk-bar>
      <strong class="bulk-count">${selected} selected</strong>
      <button type="button" data-browse="select-unimplemented" ${busy ? 'disabled' : ''}>Select unimplemented</button>
      <button type="button" data-browse="select-all-visible" ${busy ? 'disabled' : ''}>Select all visible</button>
      <button type="button" data-browse="clear-selection" ${busy || selected === 0 ? 'disabled' : ''}>Clear</button>
      <label class="check-inline">
        <input type="checkbox" data-browse-overwrite ${state.overwriteExisting ? 'checked' : ''} ${busy ? 'disabled' : ''} />
        Overwrite existing files
      </label>
      <button type="button" class="primary" data-browse="bulk-save" ${busy || selected === 0 ? 'disabled' : ''}>
        Generate and save ${selected} ${noun}
      </button>
      ${
        state.bulkStatus
          ? `<span class="bulk-status muted" data-bulk-status>${escapeHtml(state.bulkStatus)}</span>`
          : '<span class="bulk-status muted" data-bulk-status hidden></span>'
      }
    </div>
  `;
}

export async function loadSeries(state: BrowseState): Promise<void> {
  state.loading = true;
  state.error = '';
  state.level = 'series';
  clearBrowseSelection(state);
  try {
    state.series = await listSeries();
  } catch (e) {
    state.error = e instanceof TcgDexApiError ? e.message : String(e);
    state.series = [];
  } finally {
    state.loading = false;
  }
}

export async function loadSerieSets(state: BrowseState, serieId: string, serieName: string): Promise<void> {
  state.loading = true;
  state.error = '';
  state.activeSerieId = serieId;
  state.activeSerieName = serieName;
  state.level = 'sets';
  state.filter = '';
  clearBrowseSelection(state);
  try {
    const serie = await getSerie(serieId);
    state.sets = serie.sets || [];
    state.activeSerieName = serie.name || serieName;
  } catch (e) {
    state.error = e instanceof TcgDexApiError ? e.message : String(e);
    state.sets = [];
  } finally {
    state.loading = false;
  }
}

export async function loadSetCards(state: BrowseState, setId: string): Promise<void> {
  state.loading = true;
  state.error = '';
  state.level = 'cards';
  clearBrowseSelection(state);
  try {
    const set = await getSet(setId);
    state.activeSet = set;
    state.cards = set.cards || [];
  } catch (e) {
    state.error = e instanceof TcgDexApiError ? e.message : String(e);
    state.activeSet = null;
    state.cards = [];
  } finally {
    state.loading = false;
  }
}

export async function runSearch(state: BrowseState, query: string): Promise<void> {
  state.searchQuery = query;
  state.loading = true;
  state.error = '';
  state.level = 'search';
  try {
    const { cards, hasMore } = await searchCardsByName(query, {
      offset: state.searchOffset,
      limit: state.searchPageSize,
    });
    state.cards = cards;
    state.searchHasMore = hasMore;
  } catch (e) {
    state.error = e instanceof TcgDexApiError ? e.message : String(e);
    state.cards = [];
    state.searchHasMore = false;
  } finally {
    state.loading = false;
  }
}

/** Cards currently shown in the browse grid (respects hide-implemented). */
export function visibleBrowseCards(state: BrowseState): TcgDexCardResume[] {
  if (state.hideImplemented) {
    return state.cards.filter(c => !isImplemented(state.implementedIds, c.id));
  }
  return state.cards;
}

export function unimplementedVisibleCards(state: BrowseState): TcgDexCardResume[] {
  return visibleBrowseCards(state).filter(c => !isImplemented(state.implementedIds, c.id));
}

/** Selected cards in visible order, then any other selected ids (e.g. other search pages). */
export function selectedBrowseCards(state: BrowseState): TcgDexCardResume[] {
  if (state.selectedIds.size === 0) return [];
  const visibleSelected = visibleBrowseCards(state).filter(c => state.selectedIds.has(c.id));
  const visibleIds = new Set(visibleSelected.map(c => c.id));
  const hiddenSelected = state.cards.filter(c => state.selectedIds.has(c.id) && !visibleIds.has(c.id));
  const knownIds = new Set(state.cards.map(c => c.id));
  const unknown = [...state.selectedIds]
    .filter(id => !knownIds.has(id))
    .map(id => ({ id, localId: '', name: id }));
  return [...visibleSelected, ...hiddenSelected, ...unknown];
}

export async function pickCardToDraft(cardId: string): Promise<{
  draft: CardDraft;
  meta: BrowseSourceMeta;
}> {
  const card = await getCard(cardId);
  const draft = mapTcgDexCardToDraft(card);
  return {
    draft,
    meta: {
      tcgDexId: card.id,
      imageUrl: cardImageUrl(card.image, 'high') || cardImageUrl(card.image, 'low'),
      setName: card.set?.name,
      rarity: card.rarity,
    },
  };
}
