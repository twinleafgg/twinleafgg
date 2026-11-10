import { useDroppable, useDraggable } from '@dnd-kit/core';
import {
  PlayerType,
  SlotType,
  type Card,
  type CardList,
  type CardTarget,
  type Player,
  type PokemonCardList,
} from 'ptcg-server';
import { cn } from '../../utils/cn';
import { Board2DCard } from './Board2DCard';
import {
  board2dActiveBenchDragId,
  board2dSlotDropId,
} from './board2dDropIds';
import styles from './Board2D.module.css';

const DEFAULT_BENCH_SLOTS = 5;

export function slotKey(player: PlayerType, slot: SlotType, index = 0): string {
  return `${player}-${slot}-${index}`;
}

/** Minimal face-down list for setup previews (card stays secret until game starts). */
function setupPreviewCardList(card: Card): CardList {
  return {
    cards: [card],
    isSecret: true,
    isPublic: false,
  } as CardList;
}

function DroppableSlot({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && styles.dropHighlight)}>
      {children}
    </div>
  );
}

function DraggableBoardCard({
  dragId,
  enabled,
  onClick,
  onContextMenu,
  children,
}: {
  dragId: string;
  enabled: boolean;
  onClick?: () => void;
  onContextMenu?: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled: !enabled,
    data: { type: 'board' },
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.45 : 1,
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: onClick ? 'pointer' : undefined,
      }}
      // Click must live on the same node as drag listeners (see Board2DHand).
      // Putting onClick only on a child under useDraggable listeners swallows clicks.
      onClick={onClick}
      onContextMenu={
        onContextMenu
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              onContextMenu();
            }
          : undefined
      }
      {...(enabled ? { ...listeners, ...attributes } : {})}
    >
      {children}
    </div>
  );
}

export type Board2DPlayerHalfProps = {
  player: Player | undefined;
  playerType: PlayerType;
  clientId: number;
  upsideDown?: boolean;
  isOwner: boolean;
  canInteract: boolean;
  scanUrl: (card: Card, list?: CardList | PokemonCardList | null) => string;
  getSleeveUrl?: (path?: string) => string | undefined;
  isSelectable: (target: CardTarget) => boolean;
  isSelected: (target: CardTarget) => boolean;
  isAttachTarget: (target: CardTarget) => boolean;
  getPendingPlaceDamage?: (target: CardTarget) => number;
  /** Face-down Basics placed during choose-starting setup (Active then Bench). */
  setupPreviewActive?: Card | null;
  setupPreviewBench?: ReadonlyMap<number, Card>;
  /** Empty slots that accept a setup drop / next placement. */
  isSetupDropTarget?: (target: CardTarget) => boolean;
  onActiveClick: () => void;
  onBenchClick: (index: number) => void;
  onActiveContextMenu?: () => void;
  onBenchContextMenu?: (index: number) => void;
  onSupporterClick: () => void;
  onDiscardClick: () => void;
  onDeckClick: () => void;
  onLostZoneClick: () => void;
  onPrizeClick: (prize: CardList, index: number) => void;
  onEnergyClick: (card: Card, target: CardTarget, list: CardList) => void;
  onToolClick: (card: Card, target: CardTarget, list: CardList) => void;
};

export function Board2DPlayerHalf({
  player,
  playerType,
  upsideDown = false,
  isOwner,
  canInteract,
  scanUrl,
  getSleeveUrl,
  isSelectable,
  isSelected,
  isAttachTarget,
  getPendingPlaceDamage,
  setupPreviewActive,
  setupPreviewBench,
  isSetupDropTarget,
  onActiveClick,
  onBenchClick,
  onActiveContextMenu,
  onBenchContextMenu,
  onSupporterClick,
  onDiscardClick,
  onDeckClick,
  onLostZoneClick,
  onPrizeClick,
  onEnergyClick,
  onToolClick,
}: Board2DPlayerHalfProps) {
  const activeTarget: CardTarget = {
    player: playerType,
    slot: SlotType.ACTIVE,
    index: 0,
  };
  const deckSleeve = getSleeveUrl?.(
    (player?.deck as { sleeveImagePath?: string } | undefined)?.sleeveImagePath,
  );
  const deckCards = player?.deck?.cards ?? [];
  const discardCards = player?.discard?.cards ?? [];
  const visibleDeck = Math.min(deckCards.length, 8);
  const visibleDiscard = Math.min(discardCards.length, 8);
  const isBottom = playerType === PlayerType.BOTTOM_PLAYER;
  const side = isBottom ? 'bottom' : 'top';

  const activeKey = slotKey(playerType, SlotType.ACTIVE, 0);
  // Server grows/shrinks player.bench (e.g. Area Zero Underdepths → 8).
  const benchSlotCount = Math.max(player?.bench?.length ?? DEFAULT_BENCH_SLOTS, DEFAULT_BENCH_SLOTS);

  return (
    <div className={cn(styles.player, upsideDown && styles.upsideDown)}>
      {/* Active */}
      <div className={cn(styles.cell, styles.cellActive)}>
        <DroppableSlot
          id={board2dSlotDropId(playerType, SlotType.ACTIVE, 0)}
          className={cn(styles.slot, styles.slotActive)}
        >
          <DraggableBoardCard
            dragId={board2dActiveBenchDragId(playerType, SlotType.ACTIVE, 0)}
            enabled={canInteract && isOwner && (player?.active?.cards?.length ?? 0) > 0}
            onClick={() => onActiveClick()}
            onContextMenu={onActiveContextMenu}
          >
            <div data-slot-key={activeKey} data-board2d-active={side} style={{ width: '100%', height: '100%' }}>
              {setupPreviewActive && !(player?.active?.cards?.length) ? (
                <Board2DCard
                  cardList={setupPreviewCardList(setupPreviewActive)}
                  owner={isOwner}
                  faceDown
                  scanUrl={scanUrl}
                  sleeveUrl={deckSleeve}
                  attachTarget={!!isSetupDropTarget?.(activeTarget)}
                />
              ) : (
                <Board2DCard
                  cardList={player?.active}
                  owner={isOwner}
                  scanUrl={scanUrl}
                  selectable={isSelectable(activeTarget)}
                  selected={isSelected(activeTarget)}
                  attachTarget={
                    isAttachTarget(activeTarget) || !!isSetupDropTarget?.(activeTarget)
                  }
                  pendingPlaceDamage={getPendingPlaceDamage?.(activeTarget) ?? 0}
                  onEnergyClick={(c) =>
                    player?.active && onEnergyClick(c, activeTarget, player.active)
                  }
                  onToolClick={(c) =>
                    player?.active && onToolClick(c, activeTarget, player.active)
                  }
                />
              )}
            </div>
          </DraggableBoardCard>
        </DroppableSlot>
      </div>

      {/* Bench — slot count follows server bench array (5 default, up to 8). */}
      <div
        className={cn(styles.cell, styles.cellBench)}
        data-bench-count={benchSlotCount}
      >
        {Array.from({ length: benchSlotCount }, (_, i) => {
          const target: CardTarget = {
            player: playerType,
            slot: SlotType.BENCH,
            index: i,
          };
          const list = player?.bench?.[i];
          const key = slotKey(playerType, SlotType.BENCH, i);
          return (
            <DroppableSlot
              key={i}
              id={board2dSlotDropId(playerType, SlotType.BENCH, i)}
              className={cn(styles.slot, styles.slotBench)}
            >
              <DraggableBoardCard
                dragId={board2dActiveBenchDragId(playerType, SlotType.BENCH, i)}
                enabled={canInteract && isOwner && (list?.cards?.length ?? 0) > 0}
                onClick={() => onBenchClick(i)}
                onContextMenu={
                  onBenchContextMenu ? () => onBenchContextMenu(i) : undefined
                }
              >
                <div data-slot-key={key} style={{ width: '100%', height: '100%' }}>
                  {setupPreviewBench?.get(i) && !(list?.cards?.length) ? (
                    <Board2DCard
                      cardList={setupPreviewCardList(setupPreviewBench.get(i)!)}
                      owner={isOwner}
                      faceDown
                      scanUrl={scanUrl}
                      sleeveUrl={deckSleeve}
                      attachTarget={!!isSetupDropTarget?.(target)}
                    />
                  ) : (
                    <Board2DCard
                      cardList={list}
                      owner={isOwner}
                      scanUrl={scanUrl}
                      selectable={isSelectable(target)}
                      selected={isSelected(target)}
                      attachTarget={
                        isAttachTarget(target) || !!isSetupDropTarget?.(target)
                      }
                      pendingPlaceDamage={getPendingPlaceDamage?.(target) ?? 0}
                      onEnergyClick={(c) => list && onEnergyClick(c, target, list)}
                      onToolClick={(c) => list && onToolClick(c, target, list)}
                    />
                  )}
                </div>
              </DraggableBoardCard>
            </DroppableSlot>
          );
        })}
      </div>

      {/* Supporter (bottom) / Lost zone (top, rotated half) */}
      <div className={cn(styles.cell, styles.cellSupporter)}>
        {upsideDown ? (
          <div className={cn(styles.slot, styles.lostZoneTop)} data-board2d-lostzone="top">
            <Board2DCard
              cardList={player?.lostzone}
              owner={isOwner}
              showCardCount
              scanUrl={scanUrl}
              onClick={() => onLostZoneClick()}
            />
          </div>
        ) : (
          <div className={cn(styles.slot, styles.supporterSlot)} data-board2d-supporter="bottom">
            <Board2DCard
              cardList={player?.supporter}
              owner={isOwner}
              scanUrl={scanUrl}
              onClick={() => onSupporterClick()}
            />
          </div>
        )}
      </div>

      {/* Stadium column: lost zone (bottom) / supporter (top) — shared stadium lives on the midline */}
      <div className={cn(styles.cell, styles.cellStadium)}>
        {upsideDown ? (
          <div className={cn(styles.slot, styles.supporterSlot)} data-board2d-supporter="top">
            <Board2DCard
              cardList={player?.supporter}
              owner={isOwner}
              scanUrl={scanUrl}
              onClick={() => onSupporterClick()}
            />
          </div>
        ) : (
          <div className={cn(styles.slot, styles.lostZone)} data-board2d-lostzone="bottom">
            <Board2DCard
              cardList={player?.lostzone}
              owner={isOwner}
              showCardCount
              scanUrl={scanUrl}
              onClick={() => onLostZoneClick()}
            />
          </div>
        )}
      </div>

      {/* Deck */}
      <div className={cn(styles.cell, styles.cellDeck)}>
        <div className={styles.stackContainer} data-board2d-deck={side}>
          {Array.from({ length: visibleDeck }, (_, idx) => (
            <div
              key={idx}
              className={styles.stackCard}
              style={{
                transform: `translate(${idx * 0.25}px, ${isBottom ? -idx * 0.25 : idx * 0.25}px)`,
                zIndex: idx,
              }}
            >
              <Board2DCard
                cardList={
                  {
                    cards: [deckCards[deckCards.length - 1 - idx] ?? deckCards[0]],
                    isSecret: true,
                    isPublic: false,
                  } as CardList
                }
                owner={isOwner}
                faceDown
                scanUrl={scanUrl}
                sleeveUrl={deckSleeve}
              />
            </div>
          ))}
          <div className={styles.cardCount}>{deckCards.length}</div>
          <button
            type="button"
            className={styles.deckClickOverlay}
            onClick={onDeckClick}
            aria-label="Deck"
          />
        </div>
      </div>

      {/* Discard */}
      <div className={cn(styles.cell, styles.cellDiscard)}>
        <div
          className={styles.stackContainer}
          data-board2d-discard={side}
          onClick={onDiscardClick}
        >
          {visibleDiscard === 0 ? (
            <Board2DCard cardList={player?.discard} owner={isOwner} scanUrl={scanUrl} />
          ) : (
            Array.from({ length: visibleDiscard }, (_, idx) => (
              <div
                key={idx}
                className={styles.stackCard}
                style={{
                  transform: `translate(${idx * 0.25}px, ${isBottom ? -idx * 0.25 : idx * 0.25}px)`,
                  zIndex: idx,
                }}
              >
                <Board2DCard
                  cardList={player?.discard}
                  owner={isOwner}
                  scanUrl={scanUrl}
                />
              </div>
            ))
          )}
          <div className={styles.cardCount}>{discardCards.length}</div>
        </div>
      </div>

      {/* Prizes */}
      <div className={cn(styles.cell, styles.cellPrizes)}>
        <div className={styles.prizesGrid}>
          {Array.from({ length: 6 }, (_, i) => {
            const prize = player?.prizes?.[i];
            return (
              <div key={i} className={styles.prizeSlot}>
                <Board2DCard
                  cardList={prize}
                  owner={isOwner}
                  scanUrl={scanUrl}
                  onClick={() => prize && onPrizeClick(prize, i)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
