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
  const lastWheelTimeRef = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const deckLengthRef = useRef(0);

  useEffect(() => {
    setTab('valid');
    setSelectedIndices([]);
    setCurrentIndex(0);
    setRevealed(false);
    setDetail(null);
  }, [prompt.id]);

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

  const selectCard = (originalIndex: number) => {
    if (!filterMap[originalIndex]) {
      return;
    }
    if (selectedIndices.includes(originalIndex) || selectedIndices.length >= max) {
      return;
    }
    const deckPos = deckItems.findIndex((item) => item.originalIndex === originalIndex);
    if (deckPos !== -1 && deckPos < currentIndex) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
    setSelectedIndices((prev) => [...prev, originalIndex]);
  };

  const deselectSlot = (slotIndex: number) => {
    if (slotIndex < 0 || slotIndex >= selectedIndices.length) {
      return;
    }
    const removed = selectedIndices[slotIndex];
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
    setSelectedIndices(nextSelected);
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
    selectCard(item.originalIndex);
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
                  className={cn(
                    styles.fanCard,
                    ROLE_CLASS[item.role],
                    !item.isAvailable && styles.fanCardUnavailable,
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
            return (
              <button
                key={`slot-${slotIndex}-${prompt.id}`}
                type="button"
                className={cn(styles.slot, selectedCard && styles.slotFilled)}
                disabled={!selectedCard}
                onClick={() => {
                  if (selectedCard) {
                    deselectSlot(slotIndex);
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
