import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  PlayerType,
  SlotType,
  SuperType,
  type Card,
  type CardList,
  type CardTarget,
  type Player,
  type PokemonCard,
  type PokemonCardList,
} from 'ptcg-server';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { cn } from '../../utils/cn';
import type { LocalGameState } from '../types/localGameState';
import type { BoardInteractionService } from '../BoardInteractionService';
import type { Board3dCardsAdapter } from '../board3d/board3dCardsAdapter';
import type { Board3dGameActions } from '../board3d/board3dGameActions';
import { CardFace } from '../../components/cards/CardFace';
import { Board2DHand } from './Board2DHand';
import { Board2DPlayerHalf } from './Board2DPlayerHalf';
import { Board2DCard } from './Board2DCard';
import {
  parseBoard2dActiveBenchDragId,
  parseBoard2dDropId,
  parseBoard2dHandDragId,
  board2dBoardDropId,
  board2dSlotDropId,
} from './board2dDropIds';
import { extraPlayableEvolutionCardIds } from '../evolutionTarget';
import {
  handleBoard2dActiveClick,
  handleBoard2dBenchClick,
  handleBoard2dActiveInfo,
  handleBoard2dBenchInfo,
  handleBoard2dDeckClick,
  handleBoard2dDiscardClick,
  handleBoard2dHandClick,
  handleBoard2dLostZoneClick,
  handleBoard2dPlayFromHand,
  handleBoard2dPrizeClick,
  handleBoard2dRetreat,
  handleBoard2dStadiumClick,
  tryLegendAssemblyClickToPlay,
  resolveClickToPlayTarget,
  type Board2dActionContext,
} from './board2dActions';
import styles from './Board2D.module.css';

function BoardWideDroppable({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: board2dBoardDropId() });
  return (
    <div ref={setNodeRef} style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
}

function StadiumMidlineSlot({
  cardList,
  owner,
  scanUrl,
  onClick,
  canvasRef,
  layoutKey,
}: {
  cardList: CardList | null;
  owner: boolean;
  scanUrl: (card: Card, list?: CardList | PokemonCardList | null) => string;
  onClick: () => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  layoutKey: string | number;
}) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<{ top: number; left: number } | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const { setNodeRef, isOver } = useDroppable({
    id: board2dSlotDropId(PlayerType.BOTTOM_PLAYER, SlotType.BOARD, 0),
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      slotRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const stadium = slotRef.current;
    if (!canvas || !stadium) return;

    const measure = () => {
      const topLz = canvas.querySelector(
        '[data-board2d-lostzone="top"]',
      ) as HTMLElement | null;
      const bottomLz = canvas.querySelector(
        '[data-board2d-lostzone="bottom"]',
      ) as HTMLElement | null;
      if (!topLz || !bottomLz) return;

      const topRect = topLz.getBoundingClientRect();
      const bottomRect = bottomLz.getBoundingClientRect();
      if (topRect.width <= 0 || bottomRect.width <= 0) return;

      const canvasRect = canvas.getBoundingClientRect();
      const portrait = canvas.closest('[data-portrait]') != null;

      // Portrait: center stadium in the open column between prizes and Active.
      // Landscape: keep midway between the two lost-zone slots.
      let targetX: number;
      if (portrait) {
        const bottomActive = canvas.querySelector(
          '[data-board2d-active="bottom"]',
        ) as HTMLElement | null;
        // Prefer bottom player's prizes (unrotated half); fall back to canvas left.
        let leftBound = canvasRect.left + 8;
        canvas.querySelectorAll(`.${styles.prizesGrid}`).forEach((el) => {
          const r = el.getBoundingClientRect();
          // Bottom half prizes sit lower on screen than opponent’s.
          if (r.top > canvasRect.top + canvasRect.height * 0.45) {
            leftBound = Math.max(leftBound, r.right);
          }
        });
        const activeRect = bottomActive?.getBoundingClientRect();
        const rightBound = activeRect
          ? activeRect.left
          : canvasRect.left + canvasRect.width / 2;
        targetX = (leftBound + rightBound) / 2;
      } else {
        targetX =
          (topRect.left + topRect.width / 2 + bottomRect.left + bottomRect.width / 2) / 2;
      }
      const targetY =
        (topRect.top + topRect.height / 2 + bottomRect.top + bottomRect.height / 2) / 2;

      // Iteratively correct local top/left so the stadium center matches the
      // target in viewport space (works under scale + rotateX).
      let localTop = posRef.current?.top ?? canvas.offsetHeight / 2;
      let localLeft = posRef.current?.left ?? canvas.offsetWidth / 2;

      for (let i = 0; i < 4; i++) {
        stadium.style.top = `${localTop}px`;
        stadium.style.left = `${localLeft}px`;
        const sRect = stadium.getBoundingClientRect();
        if (sRect.width <= 0 || sRect.height <= 0) return;
        const scaleX = sRect.width / Math.max(stadium.offsetWidth, 1);
        const scaleY = sRect.height / Math.max(stadium.offsetHeight, 1);
        const cx = sRect.left + sRect.width / 2;
        const cy = sRect.top + sRect.height / 2;
        localLeft += (targetX - cx) / scaleX;
        localTop += (targetY - cy) / scaleY;
      }

      const next = { top: localTop, left: localLeft };
      posRef.current = next;
      setPos(next);
    };

    const run = () => {
      requestAnimationFrame(() => requestAnimationFrame(measure));
    };
    run();

    const ro = new ResizeObserver(run);
    ro.observe(canvas);
    const topLz = canvas.querySelector('[data-board2d-lostzone="top"]');
    const bottomLz = canvas.querySelector('[data-board2d-lostzone="bottom"]');
    if (topLz) ro.observe(topLz);
    if (bottomLz) ro.observe(bottomLz);
    const bottomActive = canvas.querySelector('[data-board2d-active="bottom"]');
    if (bottomActive) ro.observe(bottomActive);
    canvas.querySelectorAll(`.${styles.prizesGrid}`).forEach((el) => ro.observe(el));

    return () => ro.disconnect();
  }, [canvasRef, layoutKey]);

  return (
    <div
      ref={setRefs}
      className={cn(styles.stadiumMidline, isOver && styles.dropHighlight)}
      style={
        pos != null
          ? { top: pos.top, left: pos.left }
          : undefined
      }
    >
      <div data-board2d-stadium style={{ width: '100%', height: '100%' }}>
        <Board2DCard
          cardList={cardList}
          owner={owner}
          scanUrl={scanUrl}
          onClick={onClick}
        />
      </div>
    </div>
  );
}

export type Board2DProps = {
  gameState: LocalGameState;
  topPlayer: Player;
  bottomPlayer: Player;
  bottomPlayerHand: CardList;
  topPlayerHand: CardList;
  clientId: number;
  boardInteraction: BoardInteractionService;
  gameActions: Board3dGameActions;
  cardsAdapter: Board3dCardsAdapter;
  cardScale: number;
  perspectiveEnabled: boolean;
  adminSpectatorReveal?: { hands?: boolean; prizes?: boolean };
};

function resolveStadium(top?: Player, bottom?: Player): {
  cardList: CardList | null;
  owner: boolean;
} {
  const topStadium = top?.stadium;
  const bottomStadium = bottom?.stadium;
  if (bottomStadium?.cards?.length) {
    return { cardList: bottomStadium, owner: true };
  }
  if (topStadium?.cards?.length) {
    return { cardList: topStadium, owner: false };
  }
  return { cardList: bottomStadium ?? topStadium ?? null, owner: false };
}

export function Board2D(props: Board2DProps) {
  const {
    gameState,
    topPlayer,
    bottomPlayer,
    bottomPlayerHand,
    topPlayerHand,
    clientId,
    boardInteraction,
    gameActions,
    cardsAdapter,
    cardScale,
    perspectiveEnabled,
    adminSpectatorReveal,
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const boardHostRef = useRef<HTMLDivElement>(null);
  const boardCanvasRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  const [hostWideEnough, setHostWideEnough] = useState(true);
  const [portrait, setPortrait] = useState(false);

  // Landscape: 1200×700. Portrait: 420×780 (PTCGL-like tall stack). Uniform scale-to-fit.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const host = boardHostRef.current;
    if (!root || !host) return;

    const LANDSCAPE_W = 1200;
    const LANDSCAPE_H = 700;
    const PORTRAIT_W = 400;
    const PORTRAIT_H = 820;

    const update = () => {
      const { clientWidth: rootW, clientHeight: rootH } = root;
      if (rootW <= 0 || rootH <= 0) return;

      const aspect = rootW / rootH;
      const nextPortrait = aspect < 0.85;
      setPortrait(nextPortrait);
      setHostWideEnough(aspect >= 4 / 3);

      const designW = nextPortrait ? PORTRAIT_W : LANDSCAPE_W;
      const designH = nextPortrait ? PORTRAIT_H : LANDSCAPE_H;
      const { clientWidth, clientHeight } = host;
      if (clientWidth <= 0 || clientHeight <= 0) return;
      const fit = Math.min(clientWidth / designW, clientHeight / designH);
      setBoardScale(fit * Math.max(0.5, cardScale));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(root);
    ro.observe(host);
    return () => ro.disconnect();
  }, [cardScale, portrait]);

  const tipBoard = perspectiveEnabled && hostWideEnough && !portrait;
  const boardTransform = tipBoard
    ? `scale(${boardScale}) rotateX(15deg) translate3d(0, 0, 0)`
    : `scale(${boardScale})`;
  const scanUrl = useCallback(
    (card: Card, list?: CardList | PokemonCardList | null) =>
      cardsAdapter.getScanUrlFor3D(card, list ?? undefined),
    [cardsAdapter],
  );

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<CardTarget[]>([]);
  const [dragCard, setDragCard] = useState<Card | null>(null);

  useEffect(() => {
    const subs = [
      boardInteraction.selectionMode$.subscribe(setSelectionMode),
      boardInteraction.selectedTargets$.subscribe(setSelectedTargets),
    ];
    return () => subs.forEach((s) => s.unsubscribe());
  }, [boardInteraction]);

  // 2D board has no card-flight animations — settle WaitPrompts immediately.
  useEffect(() => {
    const subs = [
      boardInteraction.attackAnimation$.subscribe(() => {
        boardInteraction.setPendingAttackAnimationPromise(Promise.resolve());
      }),
      boardInteraction.abilityAnimation$.subscribe(() => {
        boardInteraction.setPendingAbilityAnimationPromise(Promise.resolve());
      }),
      boardInteraction.deckShuffleAnimation$.subscribe(() => {
        boardInteraction.setPendingDeckShuffleAnimationPromise(Promise.resolve());
      }),
    ];
    return () => subs.forEach((s) => s.unsubscribe());
  }, [boardInteraction]);

  // Settle silent animation WaitPrompts that 3D would await via pending promises.
  useEffect(() => {
    const prompts = gameState.state?.prompts ?? [];
    for (const p of prompts) {
      if (p.type !== 'WaitPrompt' || p.result !== undefined) {
        continue;
      }
      const msg = String((p as { message?: string }).message ?? '').toLowerCase();
      if (msg.includes('hand to deck animation')) {
        boardInteraction.setPendingHandToDeckAnimationPromise(Promise.resolve());
      } else if (msg.includes('deck shuffle animation')) {
        boardInteraction.setPendingDeckShuffleAnimationPromise(Promise.resolve());
      } else if (msg.includes('draw animation')) {
        boardInteraction.setPendingDrawAnimationPromise(Promise.resolve());
      }
    }
  }, [gameState.state?.prompts, boardInteraction]);

  const ctx: Board2dActionContext = useMemo(
    () => ({
      gameState,
      topPlayer,
      bottomPlayer,
      clientId,
      cardsAdapter,
      gameActions,
      boardInteraction,
    }),
    [
      gameState,
      topPlayer,
      bottomPlayer,
      clientId,
      cardsAdapter,
      gameActions,
      boardInteraction,
    ],
  );

  const isBottomOwner = bottomPlayer?.id === clientId;
  const canInteract = isBottomOwner && !gameState.deleted;
  const stadium = resolveStadium(topPlayer, bottomPlayer);

  const isTopActive =
    !!gameState.state &&
    topPlayer &&
    gameState.state.players[gameState.state.activePlayer]?.id === topPlayer.id;
  const isBottomActive =
    !!gameState.state &&
    bottomPlayer &&
    gameState.state.players[gameState.state.activePlayer]?.id === bottomPlayer.id;

  const topHandFaceDown =
    !(adminSpectatorReveal?.hands) &&
    topPlayer?.id !== clientId &&
    !(topPlayerHand?.isPublic || topPlayer?.hand?.isPublic);
  const topCards = topPlayerHand?.cards ?? topPlayer?.hand?.cards ?? [];
  const bottomCards = bottomPlayerHand?.cards ?? bottomPlayer?.hand?.cards ?? [];

  const playableIds = useMemo(() => {
    const ids = new Set(bottomPlayer?.playableCardIds ?? []);
    const mutantEvolution = gameState.state?.rules?.mutantEvolution === true;
    for (const id of extraPlayableEvolutionCardIds(bottomPlayer, { mutantEvolution })) {
      ids.add(id);
    }
    return ids;
  }, [bottomPlayer, gameState.state?.rules?.mutantEvolution]);

  const chooseHandCardsActive = boardInteraction.isChooseHandCardsSelectionActive();
  const legendAssemblyActive = boardInteraction.isLegendAssemblySelectionActive();

  const handSelectionHighlights = useMemo(() => {
    if (!selectionMode || (!chooseHandCardsActive && !legendAssemblyActive)) {
      return null;
    }

    const selected = new Set<number>();
    const selectable = new Set<number>();

    for (const target of selectedTargets) {
      if (target.player === PlayerType.BOTTOM_PLAYER && target.slot === SlotType.HAND) {
        selected.add(target.index);
      }
    }

    for (let index = 0; index < bottomCards.length; index++) {
      const target: CardTarget = {
        player: PlayerType.BOTTOM_PLAYER,
        slot: SlotType.HAND,
        index,
      };
      if (boardInteraction.isTargetEligible(target)) {
        selectable.add(index);
      }
    }

    return { selected, selectable };
  }, [
    selectionMode,
    chooseHandCardsActive,
    legendAssemblyActive,
    selectedTargets,
    bottomCards,
    boardInteraction,
  ]);

  const isSelectable = useCallback(
    (target: CardTarget) =>
      selectionMode && boardInteraction.isTargetEligible(target),
    [selectionMode, boardInteraction],
  );

  const isSelected = useCallback(
    (target: CardTarget) =>
      selectedTargets.some(
        (t) =>
          t.player === target.player &&
          t.slot === target.slot &&
          t.index === target.index,
      ),
    [selectedTargets],
  );

  const isAttachTarget = useCallback(
    (target: CardTarget) =>
      boardInteraction.isHandPlayTargetSelectionActive() &&
      boardInteraction.isTargetEligible(target),
    [boardInteraction, selectionMode, selectedTargets],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const handIndex = parseBoard2dHandDragId(String(event.active.id));
      if (handIndex != null) {
        const card = bottomPlayerHand?.cards?.[handIndex];
        setDragCard(card ?? null);
        return;
      }
      setDragCard(null);
    },
    [bottomPlayerHand],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragCard(null);
      const { active, over } = event;
      if (!over || !canInteract) {
        return;
      }

      const handIndex = parseBoard2dHandDragId(String(active.id));
      const dropTarget = parseBoard2dDropId(String(over.id));

      if (handIndex != null && dropTarget) {
        void handleBoard2dPlayFromHand(ctx, handIndex, dropTarget);
        return;
      }

      // Retreat: active ↔ bench
      const fromBoard = parseBoard2dActiveBenchDragId(String(active.id));
      if (fromBoard && dropTarget && dropTarget.player === PlayerType.BOTTOM_PLAYER) {
        if (
          fromBoard.slot === SlotType.ACTIVE &&
          dropTarget.slot === SlotType.BENCH
        ) {
          void handleBoard2dRetreat(ctx, dropTarget.index);
        } else if (
          fromBoard.slot === SlotType.BENCH &&
          dropTarget.slot === SlotType.ACTIVE
        ) {
          void handleBoard2dRetreat(ctx, fromBoard.index);
        }
      }
    },
    [canInteract, ctx],
  );

  const onHandCardClick = useCallback(
    async (card: Card, index: number) => {
      if (selectionMode) {
        await handleBoard2dHandClick(ctx, card, index);
        return;
      }

      if (canInteract && tryLegendAssemblyClickToPlay(ctx, card, index)) {
        return;
      }

      const isEvolution =
        card.superType === SuperType.POKEMON && !!(card as PokemonCard).evolvesFrom;
      if (canInteract && (playableIds.has(card.id) || isEvolution)) {
        const resolved = resolveClickToPlayTarget(bottomPlayer, card, {
          mutantEvolution: gameState.state?.rules?.mutantEvolution === true,
        });
        if (Array.isArray(resolved)) {
          boardInteraction.startHandPlayTargetSelection(resolved, (picked) => {
            if (picked) {
              void handleBoard2dPlayFromHand(ctx, index, picked);
            }
          });
          return;
        }
        if (resolved) {
          await handleBoard2dPlayFromHand(ctx, index, resolved);
          return;
        }
      }

      await handleBoard2dHandClick(ctx, card, index);
    },
    [
      selectionMode,
      canInteract,
      playableIds,
      bottomPlayer,
      boardInteraction,
      ctx,
    ],
  );

  return (
    <div
      ref={rootRef}
      className={cn(styles.root, portrait && styles.portrait)}
      data-portrait={portrait ? '' : undefined}
    >
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className={styles.handsAndBoard}>
          <div
            className={cn(styles.topWash, isTopActive && styles.active)}
            aria-hidden
          />
          <div
            className={cn(styles.bottomWash, isBottomActive && styles.active)}
            aria-hidden
          />

          <Board2DHand
            cards={topCards}
            cardList={topPlayerHand ?? topPlayer?.hand}
            opponent
            faceDown={topHandFaceDown}
            scanUrl={scanUrl}
            handTag="top"
            dense={portrait ? false : undefined}
          />

          <div
            ref={boardHostRef}
            className={cn(
              styles.boardHost,
              tipBoard ? styles.perspective : styles.flat,
            )}
          >
            <div
              ref={boardCanvasRef}
              className={styles.boardCanvas}
              style={{ transform: boardTransform }}
            >
              <div className={styles.centerChrome}>
                <div className={cn(styles.markerContainer, styles.topMarkers)}>
                  <div
                    className={cn(styles.gxMarker, topPlayer?.usedGX && styles.gxUsed)}
                  />
                  <div
                    className={cn(
                      styles.vstarMarker,
                      topPlayer?.usedVSTAR && styles.vstarUsed,
                    )}
                  />
                </div>
                <img
                  className={styles.centerLogo}
                  src={publicAssetUrl('assets/twinleaf-board-center.png')}
                  alt="Twinleaf"
                />
                <div className={cn(styles.markerContainer, styles.bottomMarkers)}>
                  <div
                    className={cn(
                      styles.vstarMarker,
                      bottomPlayer?.usedVSTAR && styles.vstarUsed,
                    )}
                  />
                  <div
                    className={cn(
                      styles.gxMarker,
                      bottomPlayer?.usedGX && styles.gxUsed,
                    )}
                  />
                </div>
              </div>

              <BoardWideDroppable>
              <div className={styles.boardInner}>
                <Board2DPlayerHalf
                  player={topPlayer}
                  playerType={PlayerType.TOP_PLAYER}
                  clientId={clientId}
                  upsideDown
                  isOwner={topPlayer?.id === clientId}
                  canInteract={false}
                  scanUrl={scanUrl}
                  getSleeveUrl={(p) => cardsAdapter.getSleeveUrl(p)}
                  isSelectable={isSelectable}
                  isSelected={isSelected}
                  isAttachTarget={isAttachTarget}
                  onActiveClick={() => {
                    const list = topPlayer?.active;
                    const card = list?.cards?.[list.cards.length - 1];
                    if (selectionMode) {
                      const t: CardTarget = {
                        player: PlayerType.TOP_PLAYER,
                        slot: SlotType.ACTIVE,
                        index: 0,
                      };
                      if (boardInteraction.isTargetEligible(t)) {
                        boardInteraction.toggleTarget(t);
                      }
                      return;
                    }
                    if (card && list) {
                      void cardsAdapter.showCardInfo({
                        card,
                        cardList: list,
                        players: [topPlayer, bottomPlayer],
                      });
                    }
                  }}
                  onActiveContextMenu={() => {
                    const list = topPlayer?.active;
                    const card = list?.cards?.[list.cards.length - 1];
                    if (card && list) {
                      void cardsAdapter.showCardInfo({
                        card,
                        cardList: list,
                        players: [topPlayer, bottomPlayer],
                      });
                    }
                  }}
                  onBenchClick={(i) => void handleBoard2dBenchClick(ctx, i, 'top')}
                  onBenchContextMenu={(i) => void handleBoard2dBenchInfo(ctx, i, 'top')}
                  onSupporterClick={() => {
                    const list = topPlayer?.supporter;
                    const card = list?.cards?.[list.cards.length - 1];
                    if (card && list) {
                      void cardsAdapter.showCardInfo({
                        card,
                        cardList: list,
                        players: [topPlayer, bottomPlayer],
                      });
                    }
                  }}
                  onDiscardClick={() => void handleBoard2dDiscardClick(ctx, 'top')}
                  onDeckClick={() => void handleBoard2dDeckClick(ctx, 'top')}
                  onLostZoneClick={() => void handleBoard2dLostZoneClick(ctx, 'top')}
                  onPrizeClick={(prize) =>
                    void handleBoard2dPrizeClick(ctx, topPlayer, prize)
                  }
                  onEnergyClick={(card, _t, list) =>
                    void cardsAdapter.showCardInfo({
                      card,
                      cardList: list,
                      players: [topPlayer, bottomPlayer],
                    })
                  }
                  onToolClick={(card, _t, list) =>
                    void cardsAdapter.showCardInfo({
                      card,
                      cardList: list,
                      players: [topPlayer, bottomPlayer],
                    })
                  }
                />

                <Board2DPlayerHalf
                  player={bottomPlayer}
                  playerType={PlayerType.BOTTOM_PLAYER}
                  clientId={clientId}
                  isOwner={isBottomOwner}
                  canInteract={canInteract}
                  scanUrl={scanUrl}
                  getSleeveUrl={(p) => cardsAdapter.getSleeveUrl(p)}
                  isSelectable={isSelectable}
                  isSelected={isSelected}
                  isAttachTarget={isAttachTarget}
                  onActiveClick={() => void handleBoard2dActiveClick(ctx)}
                  onBenchClick={(i) => void handleBoard2dBenchClick(ctx, i, 'bottom')}
                  onActiveContextMenu={() => void handleBoard2dActiveInfo(ctx)}
                  onBenchContextMenu={(i) => void handleBoard2dBenchInfo(ctx, i, 'bottom')}
                  onSupporterClick={() => {
                    const list = bottomPlayer?.supporter;
                    const card = list?.cards?.[list.cards.length - 1];
                    if (card && list) {
                      void cardsAdapter.showCardInfo({
                        card,
                        cardList: list,
                        players: [topPlayer, bottomPlayer],
                      });
                    }
                  }}
                  onDiscardClick={() => void handleBoard2dDiscardClick(ctx, 'bottom')}
                  onDeckClick={() => void handleBoard2dDeckClick(ctx, 'bottom')}
                  onLostZoneClick={() => void handleBoard2dLostZoneClick(ctx, 'bottom')}
                  onPrizeClick={(prize) =>
                    void handleBoard2dPrizeClick(ctx, bottomPlayer, prize)
                  }
                  onEnergyClick={(card, target, list) => {
                    if (selectionMode && boardInteraction.isTargetEligible(target)) {
                      boardInteraction.toggleTarget(target);
                      return;
                    }
                    void cardsAdapter.showCardInfo({
                      card,
                      cardList: list,
                      players: [topPlayer, bottomPlayer],
                    });
                  }}
                  onToolClick={(card, target, list) => {
                    if (selectionMode && boardInteraction.isTargetEligible(target)) {
                      boardInteraction.toggleTarget(target);
                      return;
                    }
                    void cardsAdapter.showCardInfo({
                      card,
                      cardList: list,
                      players: [topPlayer, bottomPlayer],
                    });
                  }}
                />
              </div>
              </BoardWideDroppable>

              <StadiumMidlineSlot
                cardList={stadium.cardList}
                owner={stadium.owner}
                scanUrl={scanUrl}
                onClick={() => void handleBoard2dStadiumClick(ctx, stadium.cardList)}
                canvasRef={boardCanvasRef}
                layoutKey={boardTransform}
              />
            </div>
          </div>

          <Board2DHand
            cards={bottomCards}
            cardList={bottomPlayerHand ?? bottomPlayer?.hand}
            interactive={canInteract}
            playableCardIds={
              chooseHandCardsActive || legendAssemblyActive ? [] : playableIds
            }
            selectedHandIndexes={handSelectionHighlights?.selected}
            selectableHandIndexes={handSelectionHighlights?.selectable}
            scanUrl={scanUrl}
            onCardClick={onHandCardClick}
            handTag="bottom"
            dense={portrait ? false : undefined}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {dragCard ? (
            <div style={{ width: 88, opacity: 0.95 }}>
              <CardFace
                src={scanUrl(dragCard, bottomPlayerHand)}
                card={dragCard}
                name={dragCard.name}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
