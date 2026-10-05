import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { TFunction } from 'i18next';
import type { Card, ChooseCardsPrompt, Player } from 'ptcg-server';
import { chooseCardsSelectionValid, matchesPromptFilter } from './matchesPromptFilter';
import { CardFace } from '../../components/cards/CardFace';
import { CardInfoPopup } from '../../card-info/CardInfoPopup';
import { CheckboxField } from '../../components/ui/CheckboxField';
import { ShellButton } from '../../components/ui/ShellButton';
import { cn } from '../../utils/cn';
import styles from './ChooseCardsPromptPanel.module.css';

const CARD_BACK = '/assets/cardback.png';
const MAX_VISIBLE_SLOTS = 8;
const WHEEL_DELAY_MS = 200;
const FLIGHT_DURATION_MS = 480;

export type ChooseCardsPromptPanelProps = {
  prompt: ChooseCardsPrompt;
  players: Player[];
  catalog: Card[];
  getScanUrl: (card: Card) => string;
  t: TFunction;
  gameMessageText: (t: TFunction, message: string | number) => string;
  resolve: (id: number, result: unknown) => void;
  replay: boolean;
};

type PromptItem = {
  card: Card;
  originalIndex: number;
  isAvailable: boolean;
};

type FanItem = PromptItem & {
  role: 'cardMain' | 'cardLeft' | 'cardLeftBack' | 'cardSide' | 'cardBack' | 'cardExit';
};

type CardFlight = {
  id: number;
  card: Card;
  originalIndex: number;
  src: string;
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
  /** Hide face in slot (to-slot) or fan (to-fan) until flight ends. */
  hideUntil: 'slot' | 'fan';
  active: boolean;
};

function rectOf(el: Element): { x: number; y: number; w: number; h: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function buildFilterMapByIndex(
  cards: Card[],
  filter: ChooseCardsPrompt['filter'],
  blocked: number[],
): Record<number, boolean> {
  const filterMap: Record<number, boolean> = {};
  for (let i = 0; i < cards.length; i++) {
    filterMap[i] = !blocked.includes(i) && matchesPromptFilter(cards[i], filter);
  }
  return filterMap;
}

function resolveSourceCard(prompt: ChooseCardsPrompt): Card | undefined {
  if (prompt.sourceCard) {
    return prompt.sourceCard;
  }
  const supporter = prompt.player?.supporter?.cards;
  if (supporter && supporter.length > 0) {
    return supporter[supporter.length - 1];
  }
  return undefined;
}

function buildFanItems(promptItems: PromptItem[], currentIndex: number): FanItem[] {
  if (promptItems.length === 0) {
    return [];
  }

  const startIdx = Math.max(0, currentIndex);
  const endIdx = Math.min(promptItems.length, startIdx + 3);
  const mainCards = promptItems.slice(startIdx, endIdx);
  const visible: Array<PromptItem & { isLeftSide?: boolean; isLeftBack?: boolean }> = [];

  if (currentIndex > 0) {
    const leftCard = promptItems[currentIndex - 1];
    if (leftCard) {
      visible.push({ ...leftCard, isLeftSide: true, isLeftBack: false });
    }
    if (currentIndex > 1) {
      const leftBackCard = promptItems[currentIndex - 2];
      if (leftBackCard) {
        visible.unshift({ ...leftBackCard, isLeftSide: true, isLeftBack: true });
      }
    }
  }

  visible.push(...mainCards.map((item) => ({ ...item })));

  const mainOffset = currentIndex > 1 ? 2 : currentIndex > 0 ? 1 : 0;

  return visible.map((item, i) => {
    let role: FanItem['role'] = 'cardExit';
    if (item.isLeftBack) {
      role = 'cardLeftBack';
    } else if (item.isLeftSide) {
      role = 'cardLeft';
    } else {
      const relative = i - mainOffset;
      if (relative === 0) {
        role = 'cardMain';
      } else if (relative === 1) {
        role = 'cardSide';
      } else if (relative === 2) {
        role = 'cardBack';
      } else {
        role = 'cardExit';
      }
    }
    return {
      card: item.card,
      originalIndex: item.originalIndex,
      isAvailable: item.isAvailable,
      role,
    };
  });
}

const ROLE_CLASS: Record<FanItem['role'], string> = {
  cardMain: styles.cardMain,
  cardLeft: styles.cardLeft,
  cardLeftBack: styles.cardLeftBack,
  cardSide: styles.cardSide,
  cardBack: styles.cardBack,
  cardExit: styles.cardExit,
};

export function ChooseCardsPromptPanel(props: ChooseCardsPromptPanelProps) {
  const { prompt, players, catalog, getScanUrl, t, gameMessageText, resolve, replay } = props;
  const cards = prompt.cards.cards;
  const blocked = prompt.options.blocked ?? [];
  const { max, allowCancel, isSecret } = prompt.options;

  const filterMap = useMemo(
    () => buildFilterMapByIndex(cards, prompt.filter, blocked),
    [cards, prompt.filter, blocked],
  );

  const [tab, setTab] = useState<'valid' | 'all'>('valid');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [detail, setDetail] = useState<{ card: Card; index: number } | null>(null);
  const [flights, setFlights] = useState<CardFlight[]>([]);
  const lastWheelTimeRef = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const deckLengthRef = useRef(0);
  const fanElRefs = useRef(new Map<number, HTMLButtonElement>());
  const slotElRefs = useRef(new Map<number, HTMLButtonElement>());
  const flightIdRef = useRef(0);
  const flightTimeoutsRef = useRef(new Map<number, number>());

  useEffect(() => {
    setTab('valid');
    setSelectedIndices([]);
    setCurrentIndex(0);
    setRevealed(false);
    setDetail(null);
    setFlights([]);
    for (const t of flightTimeoutsRef.current.values()) {
      window.clearTimeout(t);
    }
    flightTimeoutsRef.current.clear();
  }, [prompt.id]);

  useEffect(() => {
    return () => {
      for (const t of flightTimeoutsRef.current.values()) {
        window.clearTimeout(t);
      }
      flightTimeoutsRef.current.clear();
    };
  }, []);

  const deckItems = useMemo(() => {
    const selected = new Set(selectedIndices);
    return cards
      .map((card, originalIndex) => ({
        card,
        originalIndex,
        isAvailable: filterMap[originalIndex] ?? false,
      }))
      .filter((item) => !selected.has(item.originalIndex))
      .filter((item) => tab === 'all' || item.isAvailable);
  }, [cards, filterMap, selectedIndices, tab]);

  deckLengthRef.current = deckItems.length;

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) {
      return;
    }
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTimeRef.current < WHEEL_DELAY_MS) {
        return;
      }
      lastWheelTimeRef.current = now;
      if (e.deltaY > 0) {
        setCurrentIndex((idx) =>
          Math.min(Math.max(deckLengthRef.current - 1, 0), idx + 1),
        );
      } else if (e.deltaY < 0) {
        setCurrentIndex((idx) => Math.max(0, idx - 1));
      }
    };
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, []);

  useEffect(() => {
    setCurrentIndex((idx) => {
      if (deckItems.length === 0) {
        return 0;
      }
      return Math.min(idx, deckItems.length - 1);
    });
  }, [deckItems.length, tab]);

  const fanItems = useMemo(
    () => buildFanItems(deckItems, currentIndex),
    [deckItems, currentIndex],
  );

  const sourceCard = useMemo(() => resolveSourceCard(prompt), [prompt]);
  const slotCount = Math.min(Math.max(max || 1, 1), MAX_VISIBLE_SLOTS);
  const selectedCards = selectedIndices.map((i) => cards[i]);
  const canConfirm = chooseCardsSelectionValid(cards, selectedCards, prompt.filter, prompt.options);
  const useCardBack = isSecret && (!replay || !revealed);

  const hiddenInSlot = useMemo(() => {
    const set = new Set<number>();
    for (const f of flights) {
      if (f.hideUntil === 'slot') {
        set.add(f.originalIndex);
      }
    }
    return set;
  }, [flights]);

  const hiddenInFan = useMemo(() => {
    const set = new Set<number>();
    for (const f of flights) {
      if (f.hideUntil === 'fan') {
        set.add(f.originalIndex);
      }
    }
    return set;
  }, [flights]);

  const endFlight = (flightId: number) => {
    setFlights((prev) => prev.filter((f) => f.id !== flightId));
    const timeout = flightTimeoutsRef.current.get(flightId);
    if (timeout != null) {
      window.clearTimeout(timeout);
      flightTimeoutsRef.current.delete(flightId);
    }
  };

  const startFlight = (flight: Omit<CardFlight, 'id' | 'active'>) => {
    const id = ++flightIdRef.current;
    setFlights((prev) => [...prev, { ...flight, id, active: false }]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlights((prev) => prev.map((f) => (f.id === id ? { ...f, active: true } : f)));
      });
    });
    const timeout = window.setTimeout(() => endFlight(id), FLIGHT_DURATION_MS + 40);
    flightTimeoutsRef.current.set(id, timeout);
  };

  const selectCard = (originalIndex: number, fromEl: HTMLElement | null) => {
    if (!filterMap[originalIndex]) {
      return;
    }
    if (selectedIndices.includes(originalIndex) || selectedIndices.length >= max) {
      return;
    }
    const card = cards[originalIndex];
    if (!card) {
      return;
    }

    const targetSlot = selectedIndices.length;
    const toEl = slotElRefs.current.get(targetSlot) ?? null;
    const from = fromEl ? rectOf(fromEl) : null;
    const to = toEl ? rectOf(toEl) : null;

    const deckPos = deckItems.findIndex((item) => item.originalIndex === originalIndex);
    if (deckPos !== -1 && deckPos < currentIndex) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
    setSelectedIndices((prev) => [...prev, originalIndex]);

    if (from && to) {
      startFlight({
        card,
        originalIndex,
        src: useCardBack ? CARD_BACK : getScanUrl(card),
        from,
        to,
        hideUntil: 'slot',
      });
    }
  };

  const deselectSlot = (slotIndex: number, fromEl: HTMLElement | null) => {
    if (slotIndex < 0 || slotIndex >= selectedIndices.length) {
      return;
    }
    const removed = selectedIndices[slotIndex];
    const card = cards[removed];
    if (!card) {
      return;
    }
    const from = fromEl ? rectOf(fromEl) : null;
    const nextSelected = [
      ...selectedIndices.slice(0, slotIndex),
      ...selectedIndices.slice(slotIndex + 1),
    ];
    const afterDeck = cards
      .map((_, originalIndex) => originalIndex)
      .filter(
        (i) =>
          i === removed ||
          (!nextSelected.includes(i) && (tab === 'all' || (filterMap[i] ?? false))),
      );
    const insertIndex = afterDeck.indexOf(removed);
    if (insertIndex !== -1 && insertIndex <= currentIndex) {
      setCurrentIndex(Math.min(Math.max(afterDeck.length - 1, 0), currentIndex + 1));
    }

    // Hide fan face until we measure destination and finish flight.
    const pendingId = ++flightIdRef.current;
    setFlights((prev) => [
      ...prev,
      {
        id: pendingId,
        card,
        originalIndex: removed,
        src: useCardBack ? CARD_BACK : getScanUrl(card),
        from: from ?? { x: 0, y: 0, w: 100, h: 140 },
        to: from ?? { x: 0, y: 0, w: 100, h: 140 },
        hideUntil: 'fan',
        active: false,
      },
    ]);
    setSelectedIndices(nextSelected);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const toEl = fanElRefs.current.get(removed);
        const to = toEl
          ? rectOf(toEl)
          : (() => {
              const carousel = carouselRef.current;
              if (!carousel) {
                return from ?? { x: 0, y: 0, w: 100, h: 140 };
              }
              const r = carousel.getBoundingClientRect();
              return {
                x: r.left + r.width / 2 - 50,
                y: r.top + r.height / 2 - 70,
                w: 100,
                h: 140,
              };
            })();
        setFlights((prev) =>
          prev.map((f) =>
            f.id === pendingId
              ? {
                  ...f,
                  from: from ?? f.from,
                  to,
                  active: false,
                }
              : f,
          ),
        );
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setFlights((prev) =>
              prev.map((f) => (f.id === pendingId ? { ...f, active: true } : f)),
            );
          });
        });
        const timeout = window.setTimeout(() => endFlight(pendingId), FLIGHT_DURATION_MS + 80);
        flightTimeoutsRef.current.set(pendingId, timeout);
      });
    });
  };

  const previousCards = () => {
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  };

  const nextCards = () => {
    setCurrentIndex((idx) => Math.min(Math.max(deckItems.length - 1, 0), idx + 1));
  };

  const onFanCardClick = (
    e: ReactMouseEvent<HTMLButtonElement>,
    item: FanItem,
  ) => {
    if (!item.isAvailable) {
      return;
    }
    if (e.shiftKey) {
      setDetail({ card: item.card, index: item.originalIndex });
      return;
    }
    selectCard(item.originalIndex, e.currentTarget);
  };

  const onTabChange = (nextTab: 'valid' | 'all') => {
    setTab(nextTab);
    setCurrentIndex(0);
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={gameMessageText(t, prompt.message)}
    >
      <div className={styles.titleBar}>
        <h2 className={styles.title}>
          {t('PROMPT_CHOOSE_CARDS_TITLE', { defaultValue: 'Choose cards' })}
        </h2>
      </div>

      <div className={styles.tabsRow}>
        <div className={styles.tabs} role="tablist" aria-label={t('REACT_CARD_FILTER_TABS', { defaultValue: 'Card filter' })}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'valid'}
            className={cn(styles.tab, tab === 'valid' && styles.tabActive)}
            onClick={() => onTabChange('valid')}
          >
            {t('CARDS_VALID', { defaultValue: 'Valid' })}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            className={cn(styles.tab, tab === 'all' && styles.tabActive)}
            onClick={() => onTabChange('all')}
          >
            {t('CARDS_ALL', { defaultValue: 'All' })}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.carouselSection}>
          <div className={styles.carouselContainer} ref={carouselRef}>
            <button
              type="button"
              className={cn(styles.navBtn, styles.navPrev)}
              disabled={currentIndex <= 0}
              aria-label={t('REACT_SCROLL_LEFT', { defaultValue: 'Previous cards' })}
              onClick={previousCards}
            >
              ‹
            </button>

            <div className={styles.cardsCarousel}>
              {fanItems.map((item) => (
                <button
                  key={`${item.originalIndex}-${item.card.id}-${item.card.fullName}`}
                  type="button"
                  ref={(el) => {
                    if (el) {
                      fanElRefs.current.set(item.originalIndex, el);
                    } else {
                      fanElRefs.current.delete(item.originalIndex);
                    }
                  }}
                  className={cn(
                    styles.fanCard,
                    ROLE_CLASS[item.role],
                    !item.isAvailable && styles.fanCardUnavailable,
                    hiddenInFan.has(item.originalIndex) && styles.fanCardHidden,
                  )}
                  disabled={!item.isAvailable || item.role === 'cardExit'}
                  onClick={(e) => onFanCardClick(e, item)}
                  title={t('REACT_CHOOSE_CARDS_CARD_HINT', {
                    defaultValue: '{{name}} — Shift+click for card info',
                    name: item.card.name,
                  })}
                >
                  <CardFace
                    card={useCardBack ? null : item.card}
                    src={useCardBack ? CARD_BACK : getScanUrl(item.card)}
                    name={item.card.name}
                    style={{ width: '100%', height: '100%' }}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              className={cn(styles.navBtn, styles.navNext)}
              disabled={currentIndex >= deckItems.length - 1 || deckItems.length === 0}
              aria-label={t('REACT_SCROLL_RIGHT', { defaultValue: 'Next cards' })}
              onClick={nextCards}
            >
              ›
            </button>
          </div>

          {sourceCard ? (
            <div className={styles.sourceCard} aria-label={sourceCard.name}>
              <CardFace
                card={sourceCard}
                src={getScanUrl(sourceCard)}
                name={sourceCard.name}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ) : null}
        </div>

        <div className={styles.message}>
          <p className={styles.messageText}>{gameMessageText(t, prompt.message)}</p>
        </div>

        <div
          className={styles.slots}
          aria-label={t('REACT_CHOOSE_CARDS_SLOTS', { defaultValue: 'Selected cards' })}
        >
          {Array.from({ length: slotCount }, (_, slotIndex) => {
            const cardIndex = selectedIndices[slotIndex];
            const selectedCard = cardIndex !== undefined ? cards[cardIndex] : undefined;
            const faceHidden =
              selectedCard != null &&
              cardIndex !== undefined &&
              hiddenInSlot.has(cardIndex);
            return (
              <button
                key={`slot-${slotIndex}-${prompt.id}`}
                type="button"
                ref={(el) => {
                  if (el) {
                    slotElRefs.current.set(slotIndex, el);
                  } else {
                    slotElRefs.current.delete(slotIndex);
                  }
                }}
                className={cn(
                  styles.slot,
                  selectedCard && styles.slotFilled,
                  faceHidden && styles.slotHiddenFace,
                )}
                disabled={!selectedCard || faceHidden}
                onClick={(e) => {
                  if (selectedCard) {
                    deselectSlot(slotIndex, e.currentTarget);
                  }
                }}
                aria-label={
                  selectedCard
                    ? t('REACT_CHOOSE_CARDS_SLOT_SELECTED', {
                        defaultValue: 'Selected {{name}}, click to remove',
                        name: selectedCard.name,
                      })
                    : t('REACT_CHOOSE_CARDS_SLOT_EMPTY', { defaultValue: 'Empty slot' })
                }
              >
                {selectedCard ? (
                  <CardFace
                    card={useCardBack ? null : selectedCard}
                    src={useCardBack ? CARD_BACK : getScanUrl(selectedCard)}
                    name={selectedCard.name}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {flights.length > 0 ? (
        <div className={styles.flightLayer} aria-hidden>
          {flights.map((flight) => {
            const sx = flight.active ? flight.to.w / Math.max(flight.from.w, 1) : 1;
            const sy = flight.active ? flight.to.h / Math.max(flight.from.h, 1) : 1;
            const tx = flight.active ? flight.to.x : flight.from.x;
            const ty = flight.active ? flight.to.y : flight.from.y;
            return (
              <div
                key={flight.id}
                className={styles.flightCard}
                style={{
                  width: flight.from.w,
                  height: flight.from.h,
                  transform: `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`,
                  transition: flight.active
                    ? `transform ${FLIGHT_DURATION_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
                    : 'none',
                }}
              >
                <CardFace
                  card={useCardBack ? null : flight.card}
                  src={flight.src}
                  name={flight.card.name}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      <div className={styles.actions}>
        {replay && isSecret ? (
          <div className={styles.revealRow}>
            <CheckboxField
              id={`choose-cards-reveal-${prompt.id}`}
              checked={revealed}
              onChange={() => setRevealed((r) => !r)}
            >
              {t('REACT_REVEAL_SECRET_CARDS', { defaultValue: 'Reveal cards' })}
            </CheckboxField>
          </div>
        ) : null}
        {allowCancel ? (
          <ShellButton
            type="button"
            variant="plain"
            className={styles.cancelBtn}
            onClick={() => resolve(prompt.id, null)}
          >
            {t('BUTTON_CANCEL')}
          </ShellButton>
        ) : null}
        <ShellButton
          type="button"
          variant="plain"
          className={styles.confirmBtn}
          disabled={!canConfirm}
          onClick={() => {
            if (canConfirm) {
              resolve(prompt.id, selectedIndices);
            }
          }}
        >
          {t('BUTTON_OK')}
        </ShellButton>
      </div>

      {detail ? (
        <CardInfoPopup
          card={detail.card}
          facedown={useCardBack}
          players={players}
          catalog={catalog}
          getScanUrl={getScanUrl}
          onClose={() => setDetail(null)}
          isInGame
        />
      ) : null}
    </div>
  );
}
