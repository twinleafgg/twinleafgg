import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Card, CardList, Player } from 'ptcg-server';
import type { CardInfoPaneOptions, CardInfoTableAction } from './CardInfoPane';
import { CardInfoPane } from './CardInfoPane';
import { CardListPopup } from './CardListPopup';
import { CheckboxField } from '../components/ui/CheckboxField';
import { CardInfoImageColumn } from './CardInfoImageColumn';
import paneStyles from './CardInfoPane.module.css';
import styles from './CardInfoPopup.module.css';

export type CardInfoPopupProps = {
  card: Card;
  /** When set (in-game Pokémon), HP reflects list damage and HP modifiers. */
  cardList?: CardList;
  players?: Player[];
  facedown?: boolean;
  catalog: Card[];
  getScanUrl: (card: Card) => string;
  onClose: () => void;
  onCardSwap?: (event: { originalCard: Card; replacementCard: Card }) => void;
  /** Deck builder: not in game — swap + favorites match Angular out-of-table behavior. */
  isInGame?: boolean;
  options?: CardInfoPaneOptions;
  showTags?: boolean;
  cardTextKerning?: number;
  /** When set (in-game), ability/attack/trainer clicks invoke this then typically close. Return false to keep open. */
  onTableAction?: (action: CardInfoTableAction) => void | boolean;
  /** Browse previous card in the parent list (←). */
  onNavigatePrev?: () => void;
  /** Browse next card in the parent list (→). */
  onNavigateNext?: () => void;
  /** Optional “tested” checkbox in the footer (next to browse hint). */
  tested?: boolean;
  onToggleTested?: () => void;
  testedLabel?: string;
  /** Optional “flag” checkbox in the footer. */
  flagged?: boolean;
  onToggleFlagged?: () => void;
  flaggedLabel?: string;
  /** Hide the alternative-printing swap control on the card image. */
  hideSwapButton?: boolean;
};

function isEditableKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function CardInfoPopup({
  card,
  cardList,
  players,
  facedown = false,
  catalog,
  getScanUrl,
  onClose,
  onCardSwap,
  isInGame = false,
  options,
  showTags,
  cardTextKerning,
  onTableAction,
  onNavigatePrev,
  onNavigateNext,
  tested,
  onToggleTested,
  testedLabel = 'Mark as tested & working',
  flagged,
  onToggleFlagged,
  flaggedLabel = 'Flag this card',
  hideSwapButton = false,
}: CardInfoPopupProps) {
  const { t } = useTranslation();
  const [swapOpen, setSwapOpen] = useState(false);
  const [attachedListOpen, setAttachedListOpen] = useState(false);
  /** In-game Attached Cards picker can swap which card in the pile is viewed. */
  const [viewedCard, setViewedCard] = useState(card);

  useEffect(() => {
    setViewedCard(card);
    setSwapOpen(false);
    setAttachedListOpen(false);
  }, [card]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (attachedListOpen) {
          return;
        }
        onClose();
        return;
      }
      if (swapOpen || attachedListOpen || isEditableKeyTarget(e.target)) {
        return;
      }
      if (e.key === 'ArrowLeft' && onNavigatePrev) {
        e.preventDefault();
        onNavigatePrev();
        return;
      }
      if (e.key === 'ArrowRight' && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigatePrev, onNavigateNext, swapOpen, attachedListOpen]);

  const canNavigate = Boolean(onNavigatePrev || onNavigateNext);
  const showAttachedCards = isInGame && !!cardList;

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && !attachedListOpen && onClose()}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-info-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="card-info-dialog-title" className={styles.title}>
          {facedown ? t('CARDS_UNKNOWN') : ''}
        </h2>
        <div className={styles.content}>
          <div className={paneStyles.pane}>
            <CardInfoImageColumn
              key={`img-${viewedCard.fullName}-${viewedCard.id}`}
              card={viewedCard}
              catalog={catalog}
              facedown={facedown}
              getScanUrl={getScanUrl}
              isInGame={isInGame}
              onSwapClick={() => setSwapOpen(true)}
              hideSwapButton={hideSwapButton}
            />
            <CardInfoPane
              key={`${viewedCard.fullName}-${viewedCard.id}`}
              card={viewedCard}
              cardList={cardList}
              players={players}
              facedown={facedown}
              catalog={catalog}
              getScanUrl={getScanUrl}
              isInGame={isInGame}
              options={options}
              showTags={showTags}
              cardTextKerning={cardTextKerning}
              onCardSwap={onCardSwap}
              onTableAction={
                onTableAction
                  ? (action) => {
                      const shouldClose = onTableAction(action);
                      if (shouldClose !== false) {
                        onClose();
                      }
                    }
                  : undefined
              }
              omitScanColumn
              swapOpen={swapOpen}
              onSwapOpenChange={setSwapOpen}
            />
          </div>
        </div>
        <div className={styles.footer}>
          {showAttachedCards ? (
            <button
              type="button"
              className={styles.closeBtn}
              disabled={!viewedCard}
              onClick={() => setAttachedListOpen(true)}
            >
              {t('CARDS_SHOW_CARD_LIST', { defaultValue: 'Attached Cards' })}
            </button>
          ) : null}
          {(canNavigate || onToggleTested || onToggleFlagged) && (
            <div className={styles.footerLeft}>
              {canNavigate && (
                <span className={styles.navHint}>← → browse</span>
              )}
              {onToggleTested && (
                <CheckboxField
                  plain
                  className={styles.footerCheck}
                  checked={Boolean(tested)}
                  onChange={() => onToggleTested()}
                >
                  <span>Tested</span>
                </CheckboxField>
              )}
              {onToggleFlagged && (
                <CheckboxField
                  plain
                  className={`${styles.footerCheck} ${styles.flagCheck}`}
                  checked={Boolean(flagged)}
                  onChange={() => onToggleFlagged()}
                >
                  <span>Flag</span>
                </CheckboxField>
              )}
            </div>
          )}
          <span className={styles.spacer} />
          <button type="button" className={styles.closeBtn} onClick={() => onClose()}>
            {t('BUTTON_CLOSE')}
          </button>
        </div>
      </div>

      {attachedListOpen && cardList ? (
        <CardListPopup
          cardList={cardList}
          selected={viewedCard}
          facedown={facedown}
          getScanUrl={getScanUrl}
          onClose={() => setAttachedListOpen(false)}
          onSelect={(next) => {
            setViewedCard(next);
            setAttachedListOpen(false);
          }}
        />
      ) : null}
    </div>,
    document.body,
  );
}
