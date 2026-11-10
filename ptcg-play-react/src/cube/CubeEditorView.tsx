import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Card } from 'ptcg-server';
import { useAuth } from '../context/AuthContext';
import { CardInfoPopup } from '../card-info/CardInfoPopup';
import { readFavoriteCards } from '../card-info/favoriteCardsStorage';
import { useDeckCardScanUrl } from '../context/CardImagesContext';
import { DeckBuildPane } from '../deck-editor/DeckBuildPane';
import { DeckEditToolbar } from '../deck-editor/DeckEditToolbar';
import { DeckLibraryPane } from '../deck-editor/DeckLibraryPane';
import { DeckQuantityDialog } from '../deck-editor/DeckQuantityDialog';
import { DECK_DEFAULT_SLOT_W } from '../deck-editor/deckCardLayout';
import { clipboardImportFromText, formatPtcgoImportFailures } from '../deck-editor/clipboardDeckImport';
import { deckListExportAngularCountedLines } from '../deck-editor/deckListExportText';
import { sortLibraryCatalog } from '../deck-editor/filterLibrary';
import { useIncrementalFilteredLibrary } from '../deck-editor/useIncrementalFilteredLibrary';
import {
  addCardToCube,
  canAddCopyToCube,
  cubeCardCount,
  cubeCardNames,
  getCubeCopyCount,
  buildRandomCubeCardNames,
  orderedSetCodesByRelease,
  removeCardFromCube,
  setCubeSlotCount,
  slotsFromCubeCards,
} from './cubeRules';
import {
  createCubeDraftRoom,
  draftCardsRequired,
} from './draftEngine';
import {
  deleteCube,
  getCube,
  getCubeClientId,
  newDraftRoomCode,
  saveCube,
  saveDraftRoom,
} from './cubeStorage';
import {
  CUBE_MAX_COPIES,
  CUBE_MIN_PLAYERS,
  CUBE_TARGET_SIZE_OPTIONS,
  normalizeCubeTargetSize,
  type CubeDefinition,
} from './types';
import type { DeckSlot } from '../deck-editor/types';
import { defaultToolbarFilter, type DeckEditToolbarFilter } from '../deck-editor/types';
import { ShellButton } from '../components/ui/ShellButton';
import { TextField } from '../components/ui/TextField';
import deckStyles from '../deck-editor/DeckEditView.module.css';
import styles from './CubeEditorView.module.css';

type EditTarget = 'cube' | 'starters';

function useNarrowLayout(breakpointPx: number): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${breakpointPx}px)`).matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpointPx]);

  return narrow;
}

export function CubeEditorView({ cubeId }: { cubeId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cardsInfo, serverConfig, user } = useAuth();
  const isNarrow = useNarrowLayout(899);

  const [cube, setCube] = useState<CubeDefinition | null>(() => getCube(cubeId));
  const [name, setName] = useState(() => getCube(cubeId)?.name ?? '');
  const [targetSize, setTargetSize] = useState(() =>
    normalizeCubeTargetSize(getCube(cubeId)?.targetSize),
  );
  const [mutantEvolution, setMutantEvolution] = useState(
    () => Boolean(getCube(cubeId)?.mutantEvolution),
  );
  const [editedSlots, setEditedSlots] = useState<DeckSlot[] | null>(null);
  const [editedStarters, setEditedStarters] = useState<DeckSlot[] | null>(null);
  const [unknownCards, setUnknownCards] = useState<string[] | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>('cube');
  const [filter, setFilter] = useState<DeckEditToolbarFilter>(() => defaultToolbarFilter());
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [libraryHidden, setLibraryHidden] = useState(false);
  const [mobileTab, setMobileTab] = useState<'library' | 'cube'>('cube');
  const [cardInfoCard, setCardInfoCard] = useState<Card | null>(null);
  const [quantityEditCard, setQuantityEditCard] = useState<Card | null>(null);
  const [randomFromSet, setRandomFromSet] = useState('');
  const [randomToSet, setRandomToSet] = useState('');
  const [randomSingleton, setRandomSingleton] = useState(false);

  const allCards = useMemo(
    () => sortLibraryCatalog(cardsInfo?.cards ?? []),
    [cardsInfo?.cards],
  );
  const byFullName = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of allCards) {
      map.set(card.fullName, card);
    }
    return map;
  }, [allCards]);

  const catalogHash = cardsInfo?.hash ?? '';
  const { cards: filteredLibrary, done, requestScrollBoost } = useIncrementalFilteredLibrary(
    allCards,
    filter,
  );
  const getScanUrl = useDeckCardScanUrl(serverConfig?.scansUrl);
  const setOptions = useMemo(() => orderedSetCodesByRelease(allCards), [allCards]);

  const initialCubeSlots = useMemo(() => {
    if (!cube || byFullName.size === 0) {
      return null;
    }
    return slotsFromCubeCards(cube.cards, byFullName);
  }, [byFullName, cube]);
  const initialStarterSlots = useMemo(() => {
    if (!cube || byFullName.size === 0) {
      return null;
    }
    return slotsFromCubeCards(cube.startingCards ?? [], byFullName);
  }, [byFullName, cube]);

  const slots = editedSlots ?? initialCubeSlots?.slots ?? null;
  const starterSlots = editedStarters ?? initialStarterSlots?.slots ?? null;
  const activeSlots = editTarget === 'starters' ? starterSlots : slots;
  const unknown = useMemo(
    () => unknownCards ?? initialCubeSlots?.unknown ?? [],
    [initialCubeSlots, unknownCards],
  );

  useEffect(() => {
    if (!notice) {
      return;
    }
    const id = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
  }, []);

  const cardCount = slots ? cubeCardCount(slots) : 0;
  const starterCount = starterSlots ? cubeCardCount(starterSlots) : 0;

  const persist = useCallback((): CubeDefinition | null => {
    if (!cube || !slots || !starterSlots) {
      return null;
    }
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 32) {
      setError(t('CUBE_NAME_RULES'));
      return null;
    }
    const cards = [...cubeCardNames(slots), ...unknown];
    const startingCards = cubeCardNames(starterSlots);
    const saved = saveCube({
      ...cube,
      name: trimmed,
      cards,
      startingCards,
      targetSize: normalizeCubeTargetSize(targetSize),
      mutantEvolution,
    });
    setCube(saved);
    setName(saved.name);
    setTargetSize(saved.targetSize);
    setMutantEvolution(saved.mutantEvolution);
    setDirty(false);
    setError(null);
    setNotice(t('CUBE_SAVED'));
    return saved;
  }, [cube, mutantEvolution, name, slots, starterSlots, t, targetSize, unknown]);

  const onSave = useCallback(() => {
    setSaving(true);
    persist();
    setSaving(false);
  }, [persist]);

  const setActiveSlots = useCallback(
    (next: DeckSlot[]) => {
      if (editTarget === 'starters') {
        setEditedStarters(next);
      } else {
        setEditedSlots(next);
      }
      setDirty(true);
    },
    [editTarget],
  );

  const onAddCard = useCallback(
    (card: Card) => {
      if (!activeSlots) {
        return;
      }
      const next = addCardToCube(activeSlots, card);
      if (!next) {
        showNotice(t('CUBE_COPY_CAP'));
        return;
      }
      setActiveSlots(next);
    },
    [activeSlots, setActiveSlots, showNotice, t],
  );

  const onRemoveCard = useCallback(
    (fullName: string) => {
      if (!activeSlots) {
        return;
      }
      setActiveSlots(removeCardFromCube(activeSlots, fullName));
    },
    [activeSlots, setActiveSlots],
  );

  const onAddCopy = useCallback(
    (fullName: string) => {
      const card = byFullName.get(fullName);
      if (!card || !activeSlots) {
        return;
      }
      const next = addCardToCube(activeSlots, card);
      if (!next) {
        showNotice(t('CUBE_COPY_CAP'));
        return;
      }
      setActiveSlots(next);
    },
    [activeSlots, byFullName, setActiveSlots, showNotice, t],
  );

  const openQuantityEdit = useCallback((card: Card) => {
    setQuantityEditCard(card);
  }, []);

  const onQuantityConfirm = useCallback(
    (count: number) => {
      if (!quantityEditCard || !activeSlots) {
        return;
      }
      setActiveSlots(setCubeSlotCount(activeSlots, quantityEditCard, count));
    },
    [activeSlots, quantityEditCard, setActiveSlots],
  );

  const onExport = useCallback(() => {
    if (!slots) {
      return;
    }
    void navigator.clipboard
      .writeText(deckListExportAngularCountedLines(slots))
      .then(() => showNotice(t('CUBE_COPIED')))
      .catch(() => setError(t('ERROR_CLIPBOARD_ACCESS')));
  }, [showNotice, slots, t]);

  const onImport = useCallback(() => {
    if (!slots) {
      return;
    }
    void navigator.clipboard
      .readText()
      .then((text) => {
        const imported = clipboardImportFromText(text, allCards, byFullName, readFavoriteCards());
        const parsed = slotsFromCubeCards(imported.flatFullNames, byFullName);
        if (parsed.slots.length === 0) {
          setNotice(t('CUBE_IMPORT_EMPTY'));
          return;
        }
        setEditedSlots(parsed.slots);
        setUnknownCards([]);
        setDirty(true);
        const unknownCount =
          parsed.unknown.length +
          imported.fallbackUnknown.length +
          formatPtcgoImportFailures(imported.ptcgoFailureCounts).length;
        setNotice(t('CUBE_IMPORTED', { count: cubeCardCount(parsed.slots) }));
        if (unknownCount > 0) {
          setError(t('CUBE_IMPORT_UNKNOWN', { count: unknownCount }));
        } else {
          setError(null);
        }
      })
      .catch(() => setError(t('ERROR_CLIPBOARD_ACCESS')));
  }, [allCards, byFullName, slots, t]);

  const onRandomCube = useCallback(() => {
    if (!slots) {
      return;
    }
    if (slots.length > 0 && !window.confirm(t('CUBE_RANDOM_CONFIRM'))) {
      return;
    }
    const names = buildRandomCubeCardNames(allCards, {
      count: targetSize,
      fromSet: randomFromSet || null,
      toSet: randomToSet || null,
      mutantEvolution,
      singleton: randomSingleton,
    });
    if (names.length === 0) {
      showNotice(t('CUBE_RANDOM_EMPTY'));
      return;
    }
    const parsed = slotsFromCubeCards(names, byFullName);
    setEditedSlots(parsed.slots);
    setUnknownCards([]);
    setDirty(true);
    setError(null);
    showNotice(t('CUBE_RANDOM_ADDED', { count: cubeCardCount(parsed.slots) }));
  }, [
    allCards,
    byFullName,
    mutantEvolution,
    randomFromSet,
    randomSingleton,
    randomToSet,
    showNotice,
    slots,
    t,
    targetSize,
  ]);

  const onDelete = useCallback(() => {
    if (!window.confirm(t('CUBE_DELETE_CONFIRM'))) {
      return;
    }
    deleteCube(cubeId);
    navigate('/cube');
  }, [cubeId, navigate, t]);

  const onHostDraft = useCallback(() => {
    const saved = dirty ? persist() : getCube(cubeId) ?? cube;
    if (!saved) {
      return;
    }
    const needed = draftCardsRequired(CUBE_MIN_PLAYERS);
    if (saved.cards.length < needed) {
      setError(
        t('DRAFT_NEEDS_CARDS', {
          needed,
          players: CUBE_MIN_PLAYERS,
          count: saved.cards.length,
        }),
      );
      return;
    }
    const code = newDraftRoomCode();
    saveDraftRoom(
      createCubeDraftRoom({
        code,
        cube: saved,
        hostClientId: getCubeClientId(),
        hostName: user?.name ?? 'Host',
        hostUserId: user?.userId ?? null,
      }),
    );
    navigate(`/draft/${code}`);
  }, [cube, cubeId, dirty, navigate, persist, t, user?.name, user?.userId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  if (!cube) {
    return (
      <div className={deckStyles.shell}>
        <div className={styles.missing}>
          <p>{t('CUBE_NOT_FOUND')}</p>
          <ShellButton variant="ghost" onClick={() => navigate('/cube')}>
            {t('CUBE_BACK_TO_CUBES')}
          </ShellButton>
        </div>
      </div>
    );
  }

  const loadingCatalog = !catalogHash || slots === null || starterSlots === null;
  const countComplete = cardCount >= targetSize;
  const inDeckCounts = new Map(
    (activeSlots ?? []).map((slot) => [slot.card.fullName, slot.count]),
  );
  const quantityEditValue = quantityEditCard
    ? getCubeCopyCount(activeSlots ?? [], quantityEditCard.fullName)
    : 0;

  const libraryPane = activeSlots ? (
    <DeckLibraryPane
      cardSlotW={DECK_DEFAULT_SLOT_W}
      cards={filteredLibrary}
      scanComplete={done}
      onNearCatalogEnd={requestScrollBoost}
      getScanUrl={getScanUrl}
      showTypeBadge={false}
      disabled={false}
      onAddCard={onAddCard}
      onRemoveOneFromDeck={onRemoveCard}
      onEditQuantity={openQuantityEdit}
      inDeckCounts={inDeckCounts}
      canAddCard={(card) => canAddCopyToCube(activeSlots, card)}
      onOpenCardInfo={setCardInfoCard}
    />
  ) : null;

  const buildPane = activeSlots ? (
    <DeckBuildPane
      slots={activeSlots}
      getScanUrl={getScanUrl}
      disabled={false}
      deckCount={editTarget === 'starters' ? starterCount : cardCount}
      ruleMessage={notice}
      showLibraryToggle={!isNarrow}
      libraryHidden={libraryHidden}
      onToggleLibrary={() => setLibraryHidden((value) => !value)}
      onAddCopy={onAddCopy}
      onRemoveCopy={onRemoveCard}
      onEditQuantity={openQuantityEdit}
      onOpenCardInfo={setCardInfoCard}
      title={
        editTarget === 'starters'
          ? t('CUBE_STARTERS_TITLE', { count: starterCount })
          : t('CUBE_BUILD_TITLE', { count: cardCount })
      }
      emptyHint={editTarget === 'starters' ? t('CUBE_STARTERS_HINT') : t('CUBE_DROP_HINT')}
      canAddCopy={(card) => canAddCopyToCube(activeSlots, card)}
    />
  ) : null;

  return (
    <div className={deckStyles.noSelectWrap}>
      <DndContext sensors={sensors} collisionDetection={closestCenter}>
        <div className={deckStyles.shell}>
          <DeckEditToolbar
            deckName={name}
            filter={filter}
            onFilterChange={setFilter}
            allCards={allCards}
            disabled={false}
            isAdmin={false}
            saving={saving}
            onSave={onSave}
            onExport={onExport}
            onImport={onImport}
            backTo="/cube"
            onDelete={onDelete}
          />

          <div className={styles.infoBar}>
            <TextField
              id="cube-name"
              label={t('CUBE_PANEL_NAME')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              maxLength={32}
              rootClassName={styles.nameField}
            />
            <label className={styles.selectField} htmlFor="cube-target-size">
              <span>{t('CUBE_TARGET_LABEL')}</span>
              <select
                id="cube-target-size"
                value={targetSize}
                onChange={(e) => {
                  setTargetSize(normalizeCubeTargetSize(Number(e.target.value)));
                  setDirty(true);
                }}
              >
                {CUBE_TARGET_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {t('CUBE_TARGET_VALUE', { count: size })}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.checkField}>
              <input
                type="checkbox"
                checked={mutantEvolution}
                onChange={(e) => {
                  setMutantEvolution(e.target.checked);
                  setDirty(true);
                }}
              />
              <span>
                <strong>{t('CUBE_MUTANT_EVOLUTION')}</strong>
                <small>{t('CUBE_MUTANT_EVOLUTION_HINT')}</small>
              </span>
            </label>
            <div className={styles.countBlock}>
              <span className={`${styles.count} ${countComplete ? styles.countComplete : ''}`}>
                {t('CUBE_CARD_COUNT', { count: cardCount, target: targetSize })}
              </span>
              {dirty ? <span className={styles.dirty}>{t('CUBE_UNSAVED')}</span> : null}
            </div>
            <div className={styles.randomControls}>
              <label className={styles.selectField} htmlFor="cube-random-from">
                <span>{t('CUBE_RANDOM_FROM_SET')}</span>
                <select
                  id="cube-random-from"
                  value={randomFromSet}
                  onChange={(e) => setRandomFromSet(e.target.value)}
                >
                  <option value="">{t('CUBE_RANDOM_ANY_SET')}</option>
                  {setOptions.map((code) => (
                    <option key={`from-${code}`} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.selectField} htmlFor="cube-random-to">
                <span>{t('CUBE_RANDOM_TO_SET')}</span>
                <select
                  id="cube-random-to"
                  value={randomToSet}
                  onChange={(e) => setRandomToSet(e.target.value)}
                >
                  <option value="">{t('CUBE_RANDOM_ANY_SET')}</option>
                  {setOptions.map((code) => (
                    <option key={`to-${code}`} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.checkField}>
                <input
                  type="checkbox"
                  checked={randomSingleton}
                  onChange={(e) => setRandomSingleton(e.target.checked)}
                />
                <span>
                  <strong>{t('CUBE_RANDOM_SINGLETON')}</strong>
                  <small>{t('CUBE_RANDOM_SINGLETON_HINT')}</small>
                </span>
              </label>
              <ShellButton variant="ghost" onClick={onRandomCube} disabled={loadingCatalog}>
                {t('CUBE_RANDOM')}
              </ShellButton>
            </div>
            <ShellButton variant="secondary" onClick={onHostDraft}>
              {t('CUBE_HOST_DRAFT')}
            </ShellButton>
          </div>
          <div className={styles.randomHint}>{t('CUBE_RANDOM_HINT')}</div>

          <div className={styles.editTabs} role="tablist" aria-label={t('CUBE_TITLE')}>
            <button
              type="button"
              role="tab"
              aria-selected={editTarget === 'cube'}
              className={`${styles.editTab} ${editTarget === 'cube' ? styles.editTabActive : ''}`}
              onClick={() => setEditTarget('cube')}
            >
              {t('CUBE_TAB_CUBE')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={editTarget === 'starters'}
              className={`${styles.editTab} ${editTarget === 'starters' ? styles.editTabActive : ''}`}
              onClick={() => setEditTarget('starters')}
            >
              {t('CUBE_TAB_STARTERS')} ({starterCount})
            </button>
          </div>

          {error ? <div className={deckStyles.errorBanner}>{error}</div> : null}
          {loadingCatalog ? <div className={deckStyles.warnBanner}>{t('DECK_EDIT_WAITING_CATALOG')}</div> : null}

          <div className={deckStyles.panes}>
            {isNarrow ? (
              <div className={deckStyles.mobileTabs}>
                <button
                  type="button"
                  className={`${deckStyles.tab} ${mobileTab === 'library' ? deckStyles.tabActive : ''}`}
                  onClick={() => setMobileTab('library')}
                >
                  {t('LIBRARY_TITLE')}
                </button>
                <button
                  type="button"
                  className={`${deckStyles.tab} ${mobileTab === 'cube' ? deckStyles.tabActive : ''}`}
                  onClick={() => setMobileTab('cube')}
                >
                  {editTarget === 'starters' ? t('CUBE_TAB_STARTERS') : t('CUBE_TAB_CUBE')}
                </button>
              </div>
            ) : null}
            <div
              className={`${deckStyles.libraryCol} ${libraryHidden && !isNarrow ? deckStyles.libraryColHidden : ''} ${
                isNarrow && mobileTab !== 'library' ? deckStyles.paneMobileInactive : ''
              }`}
            >
              {libraryPane}
            </div>
            <div
              className={`${deckStyles.deckCol} ${
                isNarrow && mobileTab !== 'cube' ? deckStyles.paneMobileInactive : ''
              }`}
            >
              {buildPane}
            </div>
          </div>

          {editTarget === 'cube' && slots && cardCount > 0 && !countComplete ? (
            <div className={styles.targetHint}>
              {t('CUBE_SHORT_OF_TARGET', {
                count: targetSize - cardCount,
                target: targetSize,
              })}
            </div>
          ) : null}
        </div>

        {cardInfoCard ? (
          <CardInfoPopup
            card={cardInfoCard}
            catalog={allCards}
            getScanUrl={getScanUrl}
            isInGame={false}
            onClose={() => setCardInfoCard(null)}
          />
        ) : null}
        <DeckQuantityDialog
          open={quantityEditCard !== null}
          value={quantityEditValue}
          maxValue={CUBE_MAX_COPIES}
          onClose={() => setQuantityEditCard(null)}
          onConfirm={onQuantityConfirm}
        />
      </DndContext>
    </div>
  );
}
