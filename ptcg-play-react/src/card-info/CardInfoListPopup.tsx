import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Card, CardList, Player } from 'ptcg-server';
import { SuperType as SuperTypeEnum } from 'ptcg-server';
import { CardFace } from '../components/cards/CardFace';
import { CheckboxField } from '../components/ui/CheckboxField';
import { CARDBACK_ASSET_URL } from '../deck-editor/resolveScanUrl';
import type { CardInfoPaneOptions, CardInfoTableAction } from './CardInfoPane';
import { CardInfoPopup } from './CardInfoPopup';
import styles from './CardInfoListPopup.module.css';

export type CardInfoListPopupProps = {
  cardList: CardList;
  players?: Player[];
  catalog: Card[];
  getScanUrl: (card: Card) => string;
  facedown?: boolean;
  allowReveal?: boolean;
  options?: CardInfoPaneOptions;
  isInGame?: boolean;
  showTags?: boolean;
  cardTextKerning?: number;
  onClose: () => void;
  onResolve?: (result: CardInfoTableAction & { cardList?: CardList }) => void;
};

function sortCardsLikeAngular(cards: Card[]): Card[] {
  return cards.slice().sort((a, b) => {
    const typeOrder = (c: Card): number => {
      if (c.superType === SuperTypeEnum.POKEMON) return 0;
      if (c.superType === SuperTypeEnum.TRAINER) return 1;
      return 2;
    };
    const aType = typeOrder(a);
    const bType = typeOrder(b);
    if (aType !== bType) return aType - bType;
    if (a.set !== b.set) return a.set.localeCompare(b.set);
    return (parseInt(a.setNumber || '0', 10) - parseInt(b.setNumber || '0', 10));
  });
}

export function CardInfoListPopup({
  cardList,
  players,
  catalog,
  getScanUrl,
  facedown = false,
  allowReveal = false,
  options,
  isInGame = true,
  showTags,
  cardTextKerning,
  onClose,
  onResolve,
}: CardInfoListPopupProps) {
  const { t } = useTranslation();
  const [sortDiscards, setSortDiscards] = useState(false);
  const [originalOrder] = useState(() => cardList.cards.slice());
  const [faceDownState, setFaceDownState] = useState(facedown);
  const [detailCard, setDetailCard] = useState<Card | null>(null);

  const displayCards = useMemo(
    () => (sortDiscards ? sortCardsLikeAngular(originalOrder) : originalOrder),
    [sortDiscards, originalOrder],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !detailCard) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, detailCard]);

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && !detailCard && onClose()}
    >
      <div className={styles.panel} role="dialog" aria-modal="true">
        <h2 className={styles.title}>{t('CARDS_LIST_OF_CARDS', 'Cards')}</h2>
        <div className={styles.sortRow}>
          <CheckboxField
            plain
            checked={sortDiscards}
            onChange={(e) => setSortDiscards(e.target.checked)}
          >
            Sort discard
          </CheckboxField>
          {allowReveal ? (
            <CheckboxField
              plain
              className={styles.reveal}
              checked={!faceDownState}
              onChange={() => setFaceDownState((v) => !v)}
            >
              {t('CARDS_REVEAL_CARDS')}
            </CheckboxField>
          ) : null}
        </div>
        <div className={styles.grid}>
          {displayCards.map((c) => (
            <button
              key={`${c.fullName}-${c.id}`}
              type="button"
              className={styles.cardBtn}
              aria-label={faceDownState ? t('CARDS_UNKNOWN') : c.name}
              onClick={() => setDetailCard(c)}
            >
              <CardFace
                card={faceDownState ? null : c}
                src={faceDownState ? CARDBACK_ASSET_URL : getScanUrl(c)}
                name=""
                className={styles.cardThumb}
              />
            </button>
          ))}
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            {t('BUTTON_CLOSE')}
          </button>
        </div>
      </div>

      {detailCard ? (
        <CardInfoPopup
          card={detailCard}
          cardList={cardList}
          players={players}
          facedown={faceDownState}
          catalog={catalog}
          getScanUrl={getScanUrl}
          showTags={showTags}
          cardTextKerning={cardTextKerning}
          onClose={() => setDetailCard(null)}
          isInGame={isInGame}
          options={options}
          onTableAction={
            onResolve
              ? (action) => {
                onResolve({ ...action, cardList });
                onClose();
              }
              : undefined
          }
        />
      ) : null}
    </div>,
    document.body,
  );
}
