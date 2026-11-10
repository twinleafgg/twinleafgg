import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useRef, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card } from 'ptcg-server';
import { CardFace } from '../components/cards';
import { DECK_CARD_GAP_PX, DECK_DEFAULT_SLOT_W } from './deckCardLayout';
import type { DeckSlot } from './types';
import headerStyles from './DeckPaneHeader.module.css';
import styles from './DeckBuildPane.module.css';

const DECK_GAP_PX = DECK_CARD_GAP_PX;

function SortableDeckCard({
  slot,
  scanUrl,
  disabled,
  canAddMore,
  onAddCopy,
  onRemoveCopy,
  onEditQuantity,
  onOpenInfo,
}: {
  slot: DeckSlot;
  scanUrl: string;
  disabled: boolean;
  /** When false, the add-copy button is disabled (cube singletons). */
  canAddMore: boolean;
  onAddCopy: () => void;
  onRemoveCopy: () => void;
  onEditQuantity: () => void;
  onOpenInfo: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.card.fullName,
    disabled,
    data: { source: 'deck' as const, card: slot.card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.slot}>
      <div
        className={`${styles.cardWrap} ${isDragging ? styles.cardWrapDragging : ''}`}
        {...attributes}
        {...listeners}
        onClick={() => onOpenInfo()}
      >
        <CardFace card={slot.card} src={scanUrl} name={slot.card.name} loading="lazy" style={{ width: '100%' }}>
          {slot.count > 0 ? (
            <button
              type="button"
              className={styles.countCircle}
              disabled={disabled}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEditQuantity();
              }}
              aria-label={t('DECK_EDIT_QUANTITY_ARIA', { count: slot.count })}
            >
              {slot.count}
            </button>
          ) : null}
          {slot.count > 0 ? (
            <button
              type="button"
              className={`${styles.circleBtn} ${styles.circleBtnRemove}`}
              disabled={disabled}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveCopy();
              }}
              aria-label={t('DECK_EDIT_REMOVE_ONE')}
            >
              <svg className={styles.circleBtnIcon} viewBox="0 0 24 24" aria-hidden>
                <path d="M19 13H5v-2h14v2z" fill="currentColor" />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.circleBtn} ${styles.circleBtnAdd}`}
            disabled={disabled || !canAddMore}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onAddCopy();
            }}
            aria-label={t('DECK_EDIT_ADD_ONE')}
          >
            <svg className={styles.circleBtnIcon} viewBox="0 0 24 24" aria-hidden>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
            </svg>
          </button>
        </CardFace>
      </div>
    </div>
  );
}

export type DeckBuildPaneProps = {
  slots: DeckSlot[];
  getScanUrl: (card: Card) => string;
  disabled: boolean;
  deckCount: number;
  ruleMessage: string | null;
  showLibraryToggle: boolean;
  libraryHidden: boolean;
  onToggleLibrary: () => void;
  onAddCopy: (fullName: string) => void;
  onRemoveCopy: (fullName: string) => void;
  onEditQuantity: (card: Card) => void;
  onOpenCardInfo: (card: Card) => void;
  /** Override the pane header title (defaults to the deck copy). */
  title?: string;
  /** Override the empty drop-zone hint. */
  emptyHint?: string;
  /** When false, the add-copy button is disabled for that card. */
  canAddCopy?: (card: Card) => boolean;
};

export function DeckBuildPane({
  slots,
  getScanUrl,
  disabled,
  deckCount,
  ruleMessage,
  showLibraryToggle,
  libraryHidden,
  onToggleLibrary,
  onAddCopy,
  onRemoveCopy,
  onEditQuantity,
  onOpenCardInfo,
  title,
  emptyHint,
  canAddCopy,
}: DeckBuildPaneProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: 'deck-drop' });
  const dropElRef = useRef<HTMLDivElement | null>(null);

  const setDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      dropElRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  const ids = slots.map((s) => s.card.fullName);

  const gridStyle = {
    '--deck-slot-w': `${DECK_DEFAULT_SLOT_W}px`,
    '--deck-gap': `${DECK_GAP_PX}px`,
  } as CSSProperties;

  return (
    <div className={styles.wrap}>
      <div className={headerStyles.header}>
        <span className={headerStyles.title}>
          {title ?? t('DECK_EDIT_YOUR_DECK_COUNT', { count: deckCount })}
        </span>
        <div className={headerStyles.aside}>
          {showLibraryToggle ? (
            <button type="button" className={headerStyles.actionBtn} onClick={onToggleLibrary}>
              {libraryHidden ? t('DECK_EDIT_SHOW_LIBRARY') : t('DECK_EDIT_HIDE_LIBRARY')}
            </button>
          ) : null}
        </div>
      </div>
      <div
        ref={setDropRef}
        className={styles.dropZone}
        style={{
          outline: isOver ? '2px solid rgba(0, 0, 0, 0.25)' : undefined,
          outlineOffset: -2,
        }}
      >
        {slots.length === 0 ? (
          <div className={styles.emptyDrop}>{emptyHint ?? t('DECK_BUILD_DROP_HINT')}</div>
        ) : (
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className={styles.grid} style={gridStyle}>
              {slots.map((slot) => (
                <SortableDeckCard
                  key={slot.card.fullName}
                  slot={slot}
                  scanUrl={getScanUrl(slot.card)}
                  disabled={disabled}
                  canAddMore={canAddCopy ? canAddCopy(slot.card) : true}
                  onAddCopy={() => onAddCopy(slot.card.fullName)}
                  onRemoveCopy={() => onRemoveCopy(slot.card.fullName)}
                  onEditQuantity={() => onEditQuantity(slot.card)}
                  onOpenInfo={() => onOpenCardInfo(slot.card)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
      {ruleMessage && (
        <div className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.toast}>{ruleMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
}
