import { useDraggable } from '@dnd-kit/core';
import type { Card, CardList } from 'ptcg-server';
import { CardFace } from '../../components/cards/CardFace';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { cn } from '../../utils/cn';
import { board2dHandDragId } from './board2dDropIds';
import styles from './Board2DHand.module.css';

export type Board2DHandProps = {
  cards: Card[];
  cardList?: CardList | null;
  opponent?: boolean;
  faceDown?: boolean;
  interactive?: boolean;
  /** When false, clicks still work but drag-to-play is disabled (e.g. during prompts). */
  dragEnabled?: boolean;
  /** Hand indices hidden from the row (e.g. Basics already placed during setup). */
  hiddenHandIndexes?: ReadonlySet<number>;
  playableCardIds?: ReadonlySet<number> | number[];
  selectedHandIndexes?: ReadonlySet<number>;
  selectableHandIndexes?: ReadonlySet<number>;
  scanUrl: (card: Card, list?: CardList | null) => string;
  onCardClick?: (card: Card, index: number) => void;
  dense?: boolean;
  handTag?: 'bottom' | 'top';
};

function HandCard({
  card,
  index,
  src,
  interactive,
  dragEnabled,
  playable,
  selected,
  selectable,
  dense,
  faceDown,
  onClick,
}: {
  card: Card;
  index: number;
  src: string;
  interactive: boolean;
  dragEnabled: boolean;
  playable: boolean;
  selected: boolean;
  selectable: boolean;
  dense: boolean;
  faceDown: boolean;
  onClick?: () => void;
}) {
  const canDrag = interactive && dragEnabled && !faceDown;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: board2dHandDragId(index),
    disabled: !canDrag,
    data: { type: 'hand', index, card },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        styles.cardWrap,
        dense && styles.dense,
        playable && styles.playable,
        selected && styles.selected,
        selectable && styles.selectable,
        isDragging && styles.dragging,
      )}
      style={dense && index > 0 ? { marginLeft: -18 } : undefined}
      data-hand-index={index}
      onClick={onClick}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
    >
      {faceDown ? (
        <img
          className={styles.face}
          src={publicAssetUrl('assets/cardback.png')}
          alt="Card back"
          draggable={false}
        />
      ) : (
        <CardFace className={styles.face} src={src} card={card} name={card.name} draggable={false} />
      )}
    </div>
  );
}

export function Board2DHand({
  cards,
  cardList,
  opponent = false,
  faceDown = false,
  interactive = false,
  dragEnabled = true,
  hiddenHandIndexes,
  playableCardIds,
  selectedHandIndexes,
  selectableHandIndexes,
  scanUrl,
  onCardClick,
  dense,
  handTag,
}: Board2DHandProps) {
  const playableSet =
    playableCardIds instanceof Set
      ? playableCardIds
      : new Set(playableCardIds ?? []);
  const visibleCount = hiddenHandIndexes
    ? cards.reduce((n, _c, i) => n + (hiddenHandIndexes.has(i) ? 0 : 1), 0)
    : cards.length;
  const useDense = dense ?? visibleCount > 10;

  return (
    <div
      className={cn(styles.hand, opponent && styles.opponent)}
      data-board2d-hand={handTag}
    >
      <div className={styles.scroller}>
        <div className={styles.track}>
          {cards.map((card, index) => {
            if (hiddenHandIndexes?.has(index)) {
              return null;
            }
            return (
              <HandCard
                key={`${card.id}-${index}`}
                card={card}
                index={index}
                src={scanUrl(card, cardList)}
                interactive={interactive}
                dragEnabled={dragEnabled}
                playable={!faceDown && playableSet.has(card.id)}
                selected={!!selectedHandIndexes?.has(index)}
                selectable={!!selectableHandIndexes?.has(index)}
                dense={useDense}
                faceDown={faceDown}
                onClick={() => onCardClick?.(card, index)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
