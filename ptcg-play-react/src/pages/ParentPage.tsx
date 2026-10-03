import { useEffect, useMemo, useState } from 'react';
import { SuperType } from 'ptcg-server';
import { getCardsParentMap } from '../api/cardsApi';
import { ApiError } from '../api/apiError';
import type { CardParentMapEntry } from '../types/responses';
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  buildParentForestLayouts,
  getCanvasSize,
  type ForestLayout,
  type LayoutNode,
} from './parentMapLayout';
import styles from './ParentPage.module.css';

const SUPER_TYPE_FILTERS: { value: SuperType; label: string }[] = [
  { value: SuperType.POKEMON, label: 'Pokémon' },
  { value: SuperType.TRAINER, label: 'Trainer' },
  { value: SuperType.ENERGY, label: 'Energy' },
];

const ALL_SUPER_TYPES = new Set(SUPER_TYPE_FILTERS.map((f) => f.value));

function nodeClassName(node: LayoutNode, query: string): string {
  const classes = [styles.node];
  if (node.kind === 'base') {
    classes.push(styles.nodeBase);
  } else if (node.entry?.superType === SuperType.POKEMON) {
    classes.push(styles.nodePokemon);
  } else if (node.entry?.superType === SuperType.ENERGY) {
    classes.push(styles.nodeEnergy);
  } else {
    classes.push(styles.nodeTrainer);
  }

  if (query && node.entry) {
    const q = query.toLowerCase();
    const hit =
      node.entry.fullName.toLowerCase().includes(q) ||
      node.entry.name.toLowerCase().includes(q) ||
      node.entry.set.toLowerCase().includes(q);
    if (hit) classes.push(styles.nodeSelected);
  }

  return classes.join(' ');
}

function ForestView({ forest, query }: { forest: ForestLayout; query: string }) {
  const arrowId = `parent-arrow-${forest.rootId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  return (
    <div
      className={styles.forest}
      style={{
        left: forest.offsetX,
        top: forest.offsetY,
        width: forest.width,
        height: forest.height,
      }}
    >
      <svg className={styles.edgeSvg} aria-hidden>
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3ec7c9" />
          </marker>
        </defs>
        {forest.edges.map((edge) => {
          const midY = (edge.y1 + edge.y2) / 2;
          const d = `M ${edge.x1} ${edge.y1} V ${midY} H ${edge.x2} V ${edge.y2}`;
          return (
            <path
              key={`${edge.fromId}->${edge.toId}`}
              className={styles.edge}
              d={d}
              style={{ markerEnd: `url(#${arrowId})` }}
            />
          );
        })}
      </svg>
      {forest.nodes.map((node) => (
        <div
          key={node.id}
          className={nodeClassName(node, query)}
          style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
          title={
            node.entry
              ? `${node.entry.fullName}\nclass ${node.entry.className}${
                  node.entry.parentClassName ? `\nextends ${node.entry.parentClassName}` : ''
                }`
              : node.label
          }
        >
          {node.label}
        </div>
      ))}
    </div>
  );
}

export function ParentPage() {
  const [entries, setEntries] = useState<CardParentMapEntry[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [superTypes, setSuperTypes] = useState<Set<SuperType>>(() => new Set(ALL_SUPER_TYPES));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getCardsParentMap()
      .then((res) => {
        if (cancelled) return;
        setEntries(res.parentMap.entries);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load parent map');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const forests = useMemo(
    () =>
      buildParentForestLayouts(entries, {
        query: searchInput.trim(),
        superTypes,
      }),
    [entries, searchInput, superTypes]
  );
  const canvas = useMemo(() => getCanvasSize(forests), [forests]);
  const reprintCount = useMemo(() => {
    const allowed = superTypes.size > 0 ? superTypes : ALL_SUPER_TYPES;
    return entries.filter((e) => e.parentFullName != null && allowed.has(e.superType)).length;
  }, [entries, superTypes]);

  function toggleSuperType(value: SuperType) {
    setSuperTypes((prev) => {
      const allOn = SUPER_TYPE_FILTERS.every((f) => prev.has(f.value));
      if (allOn) {
        return new Set([value]);
      }
      const next = new Set(prev);
      if (next.has(value)) {
        if (next.size === 1) return prev;
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function setAllSuperTypes() {
    setSuperTypes(new Set(ALL_SUPER_TYPES));
  }

  const allSelected = SUPER_TYPE_FILTERS.every((f) => superTypes.has(f.value));

  return (
    <div className={styles.page}>
      <div className={styles.dots} aria-hidden />
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1>Card parent map</h1>
          <p>
            Class inheritance for reprints — cards that <code>extends</code> another card class.
            Scroll the grid horizontally and vertically.
          </p>
        </div>
        <div className={styles.controls}>
          <div className={styles.filterGroup} role="group" aria-label="Card type">
            <button
              type="button"
              className={`${styles.filterChip} ${allSelected ? styles.filterChipActive : ''}`}
              aria-pressed={allSelected}
              onClick={setAllSuperTypes}
            >
              All
            </button>
            {SUPER_TYPE_FILTERS.map((filter) => {
              const active = superTypes.has(filter.value);
              return (
                <button
                  key={filter.value}
                  type="button"
                  className={`${styles.filterChip} ${active ? styles.filterChipActive : ''} ${
                    filter.value === SuperType.POKEMON
                      ? styles.filterChipPokemon
                      : filter.value === SuperType.TRAINER
                        ? styles.filterChipTrainer
                        : styles.filterChipEnergy
                  }`}
                  aria-pressed={active}
                  onClick={() => toggleSuperType(filter.value)}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <input
            className={styles.search}
            type="search"
            placeholder="Filter (e.g. Ultra Ball)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Filter parent trees"
          />
          <span className={styles.meta}>
            {forests.length} trees · {reprintCount} reprint edges
          </span>
        </div>
      </div>

      {loading && <div className={styles.status}>Loading parent map…</div>}
      {error && <div className={`${styles.status} ${styles.error}`}>{error}</div>}

      {!loading && !error && (
        <div className={styles.viewport}>
          <div className={styles.canvas} style={{ width: canvas.width, height: canvas.height }}>
            {forests.map((forest) => (
              <ForestView key={forest.rootId} forest={forest} query={searchInput.trim()} />
            ))}
            {forests.length === 0 && (
              <div className={styles.status}>No matching inheritance trees.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
