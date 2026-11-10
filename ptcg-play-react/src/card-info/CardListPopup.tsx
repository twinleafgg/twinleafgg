import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Card, CardList } from 'ptcg-server';
import { CardFace } from '../components/cards/CardFace';
import { CARDBACK_ASSET_URL } from '../deck-editor/resolveScanUrl';
import { cn } from '../utils/cn';
import { getAttachedCardsForList } from './cardInfoUtils';
import styles from './CardListPopup.module.css';

export type CardListPopupProps = {
  cardList: CardList;
  /** Currently viewed card in the parent info popup (highlight). */
  selected?: Card;
  facedown?: boolean;
  getScanUrl: (card: Card) => string;
  onClose: () => void;
  /** Selecting a card closes this popup and returns it to the parent. */
  onSelect: (card: Card) => void;
};

export function CardListPopup({
  cardList,
  selected,
  facedown = false,
  getScanUrl,
  onClose,
  onSelect,
}: CardListPopupProps) {
  const { t } = useTranslation();
  const allCards = useMemo(() => getAttachedCardsForList(cardList), [cardList]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attached-cards-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="attached-cards-title" className={styles.title}>
          {t('CARDS_SHOW_CARD_LIST', { defaultValue: 'Attached Cards' })}
        </h2>
        <div className={styles.grid}>
          {allCards.map((c, index) => {
            const isSelected =
              !!selected &&
              (selected === c ||
                (selected.id != null && selected.id === c.id) ||
                selected.fullName === c.fullName);
            return (
              <button
                key={`${c.fullName}-${c.id}-${index}`}
                type="button"
                className={cn(styles.cardBtn, isSelected && styles.selected)}
                aria-label={facedown ? t('CARDS_UNKNOWN', { defaultValue: 'Unknown' }) : c.name}
                aria-pressed={isSelected}
                onClick={() => onSelect(c)}
              >
                <CardFace
                  card={facedown ? null : c}
                  src={facedown ? CARDBACK_ASSET_URL : getScanUrl(c)}
                  name=""
                  className={styles.cardThumb}
                />
              </button>
            );
          })}
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            {t('BUTTON_CLOSE', { defaultValue: 'Close' })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
