import { Vector3, type Object3D, type Texture } from 'three';
import gsap from 'gsap';
import { CardList, PlayerType, type Card, type Player } from 'ptcg-server';
import { Board3dCard } from '../board-3d-card';
import { getBenchPositions, ZONE_POSITIONS } from '../board-3d-zone-positions';
import {
  getBottomPrizeSlotWorld,
  getDrawFlightStageCenterWorld,
  getMaxDrawStageRowWidthWorld,
  getTopPrizeSlotWorld,
} from '../board-3d-config';
import { Board3dStackService } from '../services/board-3d-stack.service';
import {
  getMultiDrawBatchStageLayout,
  getMultiDrawSharedHoldSec,
  HAND_DISCARD_TO_DRAW_HOLD_SEC,
  HAND_DISCARD_TO_TRAINER_HOLD_SEC,
  HAND_TO_DECK_STAGGER_SEC,
  MULTI_DRAW_STAGE_TO_HAND_STAGGER_SEC,
  SETUP_REVEAL_WAVE_GAP_SEC,
  type Board3dAnimationService,
  type DrawFlightVisualPreset,
} from '../services/board-3d-animation.service';
import type { Board3dHandService, DrawSequenceFlight } from '../services/board-3d-hand.service';
import type {
  Board3dDisplayOverrides,
  Board3dStateSyncService,
} from '../services/board-3d-state-sync.service';
import type { Board3dAssetLoaderService } from '../services/board-3d-asset-loader.service';
import type { Board3dCardsAdapter } from '../board3dCardsAdapter';
import type { BoardCardLocation, BoardSnapshot } from './boardSnapshot';
import type { PileOrigin, PileZone, TransitionPlan, TransitionStep } from './planTransition';

type Seat = 'bottomPlayer' | 'topPlayer';

/** A trainer the local player already dragged onto the play zone. */
export interface LocalTrainerFlight {
  playerId: number;
  board3dCard: Board3dCard;
  /** Resolves when the drop animation has landed. */
  landed: Promise<void>;
  /** Stop hiding the play-zone mesh under the flight (call before re-rendering). */
  endHiding(): void;
  /** Dispose the flight mesh once the board shows the trainer in its place. */
  dispose(): void;
}

export interface Board3dTransitionHost {
  readonly worldRoot: Object3D;
  readonly handSlot: Object3D;
  readonly opponentHandSlot: Object3D;
  readonly stateSync: Board3dStateSyncService;
  readonly handService: Board3dHandService;
  readonly animationService: Board3dAnimationService;
  readonly assetLoader: Board3dAssetLoaderService;
  readonly cardsAdapter: Board3dCardsAdapter;
  bottomPlayer(): Player;
  topPlayer(): Player;
  bottomHand(): CardList;
  topHand(): CardList;
  aspect(): number;
  isUpsideDown(): boolean;
  isBottomHandFaceUp(): boolean;
  isTopHandFaceUp(): boolean;
  playableCardIds(): number[] | undefined;
  /** Card ids currently mid local play-flight (keep them out of rebuilt hands). */
  handFlightCardIds(): ReadonlySet<number>;
  takeLocalTrainerFlight(cardId: number): LocalTrainerFlight | undefined;
  setOverrides(overrides: Board3dDisplayOverrides): void;
  /** Re-sync board meshes with the current overrides. */
  render(): Promise<void>;
  setKoActive(active: boolean): void;
  markDirty(): void;
}

export interface TransitionRunResult {
  bottomHandTouched: boolean;
  topHandTouched: boolean;
}

const FLIGHT_RENDER_ORDER = 110;
const FLIGHT_LIFT_Y = 0.35;
const LOCAL_TRAINER_LANDING_TIMEOUT_MS = 2000;
const OPPONENT_DRAW_STAGGER_SEC = 0.12;
const REVEAL_FLIP_DURATION_SEC = 0.3;

const sleep = (ms: number) => new Promise<void>((r) => globalThis.setTimeout(r, ms));

function findCard(player: Player | undefined, cardId: number): Card | undefined {
  if (!player) {
    return undefined;
  }
  const lists: (CardList | undefined)[] = [
    player.supporter,
    player.discard,
    player.lostzone,
    player.hand,
    player.stadium,
    player.active,
    ...player.bench,
  ];
  for (const list of lists) {
    const hit = list?.cards?.find((c) => c.id === cardId);
    if (hit) {
      return hit;
    }
  }
  return undefined;
}

function boardSlotMeshId(seat: Seat, playerId: number, loc: BoardCardLocation): string {
  return loc.slot === 'active'
    ? `${seat}_${playerId}_active`
    : `${seat}_${playerId}_bench_${loc.index}`;
}

function withCards(source: CardList, cards: Card[]): CardList {
  const list = new CardList();
  list.cards = cards;
  list.isPublic = source.isPublic;
  list.isSecret = source.isSecret;
  const sleeve = (source as { sleeveImagePath?: string }).sleeveImagePath;
  if (sleeve) {
    (list as { sleeveImagePath?: string }).sleeveImagePath = sleeve;
  }
  return list;
}

/**
 * Plays one {@link TransitionPlan} on the 3D board: every step finishes before the next starts,
 * and pile / deck / play-zone overrides keep each zone at its pre-step look until a card lands.
 */
export class Board3dTransitionRunner {
  private overrides: {
    discardIds: Map<number, number[]>;
    lostzoneIds: Map<number, number[]>;
    supporterCard: Map<number, Card>;
    hiddenSupporterPlayerIds: Set<number>;
    deckCount: Map<number, number>;
    holdBoardFaceDown?: boolean;
  };
  private pending = new Map<number, Record<PileZone, Set<number>>>();
  private deckCount = new Map<number, number>();
  private result: TransitionRunResult = { bottomHandTouched: false, topHandTouched: false };
  private koActive = false;

  constructor(
    private readonly host: Board3dTransitionHost,
    private readonly prev: BoardSnapshot,
    private readonly next: BoardSnapshot,
    private readonly plan: TransitionPlan,
    private readonly steps: TransitionStep[],
    private readonly seatChanged: boolean,
    private readonly isStale: () => boolean,
  ) {
    this.overrides = {
      discardIds: new Map(),
      lostzoneIds: new Map(),
      supporterCard: new Map(),
      hiddenSupporterPlayerIds: new Set(),
      deckCount: this.deckCount,
      holdBoardFaceDown: this.steps.some((s) => s.kind === 'setupReveal'),
    };
  }

  async run(): Promise<TransitionRunResult> {
    try {
      this.primeOverrides();
      const ghostKeys = this.detachGhosts();
      this.prepareHandRows();
      await this.render();

      let ranAny = false;
      let ranHandPile = false;
      for (const step of this.steps) {
        if (this.isStale()) {
          break;
        }
        if (step.kind === 'draw' && ranHandPile) {
          await sleep(HAND_DISCARD_TO_DRAW_HOLD_SEC * 1000);
          ranHandPile = false;
        }
        if (step.kind === 'trainerToDiscard' && ranAny) {
          await sleep(HAND_DISCARD_TO_TRAINER_HOLD_SEC * 1000);
        }
        switch (step.kind) {
          case 'trainerToPlayZone':
            await this.runTrainerToPlayZone(step);
            break;
          case 'toPile':
            await this.runToPile(step);
            ranHandPile ||= step.cards.some((c) => c.origin.kind === 'hand');
            break;
          case 'boardGhostToPile':
            await this.runGhostToPile(step, ghostKeys.get(step));
            break;
          case 'handToDeck':
            await this.runHandToDeck(step);
            break;
          case 'setupReveal':
            await this.runSetupReveal(step);
            break;
          case 'draw':
            await this.runDraw(step);
            break;
          case 'trainerToDiscard':
            await this.runTrainerToDiscard(step);
            break;
        }
        ranAny = true;
      }
      for (const key of ghostKeys.values()) {
        if (key) {
          this.host.stateSync.removeBoardCardById(key);
        }
      }
    } finally {
      if (this.koActive) {
        this.host.setKoActive(false);
      }
    }
    return this.result;
  }

  // --- Setup ---------------------------------------------------------------

  private seatOf(playerId: number): Seat {
    return this.host.bottomPlayer()?.id === playerId ? 'bottomPlayer' : 'topPlayer';
  }

  private playerOf(playerId: number): Player | undefined {
    const bottom = this.host.bottomPlayer();
    const top = this.host.topPlayer();
    return bottom?.id === playerId ? bottom : top?.id === playerId ? top : undefined;
  }

  private pendingFor(playerId: number): Record<PileZone, Set<number>> {
    let entry = this.pending.get(playerId);
    if (!entry) {
      entry = { discard: new Set(), lostzone: new Set() };
      this.pending.set(playerId, entry);
    }
    return entry;
  }

  private primeOverrides(): void {
    for (const step of this.steps) {
      if (step.kind === 'toPile') {
        step.cards.forEach((c) => this.pendingFor(step.playerId)[step.zone].add(c.cardId));
      } else if (step.kind === 'boardGhostToPile') {
        step.cardIds.forEach((id) => this.pendingFor(step.playerId)[step.zone].add(id));
      } else if (step.kind === 'trainerToDiscard') {
        this.pendingFor(step.playerId)[step.zone].add(step.cardId);
        const P = this.prev.players.get(step.playerId);
        if (P?.supporterIds.includes(step.cardId)) {
          const card = findCard(this.playerOf(step.playerId), step.cardId);
          if (card) {
            this.overrides.supporterCard.set(step.playerId, card);
          }
        }
      } else if (step.kind === 'trainerToPlayZone') {
        const N = this.next.players.get(step.playerId);
        // Never hide the supporter slot for a stadium arrival (wrong zone).
        if (
          N?.supporterIds.includes(step.cardId) &&
          !N.stadiumIds.includes(step.cardId) &&
          !step.preFlown
        ) {
          this.overrides.hiddenSupporterPlayerIds.add(step.playerId);
        }
      }
    }
    for (const [playerId, P] of this.prev.players) {
      this.deckCount.set(playerId, P.deckCount);
    }
    this.refreshPileOverrides();
  }

  private refreshPileOverrides(): void {
    for (const [playerId, zones] of this.pending) {
      const N = this.next.players.get(playerId);
      if (!N) {
        continue;
      }
      this.overrides.discardIds.set(playerId, N.discardIds.filter((id) => !zones.discard.has(id)));
      this.overrides.lostzoneIds.set(playerId, N.lostzoneIds.filter((id) => !zones.lostzone.has(id)));
    }
  }

  private visiblePileCount(playerId: number, zone: PileZone): number {
    const ids = zone === 'discard' ? this.overrides.discardIds : this.overrides.lostzoneIds;
    const N = this.next.players.get(playerId);
    return ids.get(playerId)?.length ?? (zone === 'discard' ? N?.discardIds.length : N?.lostzoneIds.length) ?? 0;
  }

  private landOnPile(playerId: number, zone: PileZone, cardIds: readonly number[]): void {
    const zones = this.pendingFor(playerId);
    cardIds.forEach((id) => zones[zone].delete(id));
    this.refreshPileOverrides();
  }

  private detachGhosts(): Map<TransitionStep, string | null> {
    const out = new Map<TransitionStep, string | null>();
    for (const step of this.steps) {
      if (step.kind !== 'boardGhostToPile') {
        continue;
      }
      const meshId = boardSlotMeshId(this.seatOf(step.playerId), step.playerId, step.loc);
      out.set(step, this.host.stateSync.detachBoardCardAsGhost(meshId));
      if (step.loc.slot === 'active' && !this.koActive) {
        this.koActive = true;
        this.host.setKoActive(true);
      }
    }
    return out;
  }

  /** Cards that left a hand without a flight disappear before the first step. */
  private prepareHandRows(): void {
    const bottomId = this.host.bottomPlayer()?.id;
    if (this.seatChanged) {
      this.rebuildRowsBeforeDraws();
      return;
    }
    for (const t of this.plan.players.values()) {
      const isBottom = t.playerId === bottomId;
      const count = t.realHand ? t.handPreTrimIds.length : t.handPreTrimCount;
      if (count === 0) {
        continue;
      }
      if (isBottom) {
        const ids = t.realHand
          ? t.handPreTrimIds
          : this.host.handService.getHandCardIds().slice(-count);
        this.host.handService.removeHandCardsById(ids);
        this.result.bottomHandTouched = true;
      } else {
        this.host.handService.takeOpponentHandCards(count, t.realHand ? t.handPreTrimIds : undefined);
        this.result.topHandTouched = true;
      }
    }
  }

  private rebuildRowsBeforeDraws(): void {
    const drawn = (playerId: number) => {
      const indices = new Set<number>();
      for (const s of this.steps) {
        if (s.kind === 'draw' && s.playerId === playerId) {
          s.cards.forEach((c) => indices.add(c.handIndex));
        }
      }
      return indices;
    };
    const bottomHand = this.host.bottomHand();
    const bottomDrawn = drawn(this.host.bottomPlayer().id);
    void this.host.handService.updateHand(
      withCards(bottomHand, bottomHand.cards.filter((_, i) => !bottomDrawn.has(i))),
      this.host.isBottomHandFaceUp(),
      this.host.handSlot,
      this.host.playableCardIds(),
    );
    const topHand = this.host.topHand();
    const topDrawn = drawn(this.host.topPlayer().id);
    void this.host.handService.updateOpponentHand(
      withCards(topHand, topHand.cards.slice(0, Math.max(0, topHand.cards.length - topDrawn.size))),
      this.host.isTopHandFaceUp(),
      this.host.opponentHandSlot,
    );
    this.result.bottomHandTouched = true;
    this.result.topHandTouched = true;
  }

  private async render(): Promise<void> {
    this.host.setOverrides(this.overrides);
    await this.host.render();
    this.host.markDirty();
  }

  // --- Flight helpers ------------------------------------------------------

  private async backTexture(player: Player | undefined): Promise<Texture> {
    const path = (player?.deck as { sleeveImagePath?: string } | undefined)?.sleeveImagePath;
    const url = path ? this.host.cardsAdapter.getSleeveUrl(path) : undefined;
    return url ? this.host.assetLoader.loadSleeveTexture(url) : this.host.assetLoader.loadCardBack();
  }

  private async createFlightCard(
    playerId: number,
    card: Card | undefined,
    at: Vector3,
    options: { faceDown: boolean; scale?: number },
  ): Promise<Board3dCard> {
    const player = this.playerOf(playerId);
    const [back, mask] = await Promise.all([
      this.backTexture(player),
      this.host.assetLoader.loadCardMaskTexture(),
    ]);
    let front = back;
    const scanUrl = card ? this.host.cardsAdapter.getScanUrlFor3D(card) : undefined;
    if (scanUrl?.trim()) {
      try {
        front = await this.host.assetLoader.loadCardTexture(scanUrl);
      } catch {
        front = back;
      }
    }
    const rotationDeg = this.seatOf(playerId) === 'topPlayer' ? 180 : 0;
    const mesh = new Board3dCard(front, back, at.clone(), rotationDeg, options.scale ?? 1, mask);
    const group = mesh.getGroup();
    group.userData.cardData = card;
    group.renderOrder = FLIGHT_RENDER_ORDER;
    if (options.faceDown) {
      group.rotation.z = Math.PI;
    }
    this.host.worldRoot.add(group);
    return mesh;
  }

  /** Fly to `target`, flattening scale and revealing a face-down card on the way. */
  private async flyTo(group: Object3D, target: Vector3, endScale = 1): Promise<void> {
    group.renderOrder = FLIGHT_RENDER_ORDER;
    const tweens: Promise<void>[] = [this.host.animationService.playTrainerResolveToDiscard(group, target)];
    if (Math.abs(group.rotation.z) > 0.01 || Math.abs(group.rotation.x) > 0.01) {
      tweens.push(
        new Promise((resolve) => {
          gsap.to(group.rotation, {
            x: 0,
            z: 0,
            duration: REVEAL_FLIP_DURATION_SEC,
            ease: 'power2.inOut',
            onComplete: () => resolve(),
          });
        }),
      );
    }
    if (Math.abs(group.scale.x - endScale) > 0.001) {
      tweens.push(
        new Promise((resolve) => {
          gsap.to(group.scale, {
            x: endScale,
            y: endScale,
            z: endScale,
            duration: REVEAL_FLIP_DURATION_SEC,
            ease: 'power2.inOut',
            onComplete: () => resolve(),
          });
        }),
      );
    }
    await Promise.all(tweens);
    this.host.markDirty();
  }

  private deckTopWorld(playerId: number, count: number): Vector3 {
    const target = ZONE_POSITIONS[this.seatOf(playerId)].deck.clone();
    target.y += Math.max(0, count - 1) * Board3dStackService.STACK_HEIGHT_INCREMENT + FLIGHT_LIFT_Y;
    return target;
  }

  private boardSlotWorld(playerId: number, loc: BoardCardLocation): Vector3 {
    const seat = this.seatOf(playerId);
    if (loc.slot === 'active') {
      return ZONE_POSITIONS[seat].active.clone().setY(FLIGHT_LIFT_Y);
    }
    const benchLen = this.playerOf(playerId)?.bench.length ?? 5;
    const type = seat === 'topPlayer' ? PlayerType.TOP_PLAYER : PlayerType.BOTTOM_PLAYER;
    const pos = getBenchPositions(benchLen, type)[loc.index] ?? ZONE_POSITIONS[seat].active;
    return pos.clone().setY(FLIGHT_LIFT_Y);
  }

  private supporterWorld(playerId: number): Vector3 {
    return ZONE_POSITIONS[this.seatOf(playerId)].supporter.clone();
  }

  /**
   * Take a card out of a hand row for a flight. Face-up bottom hands fly their own mesh;
   * hidden or far rows spawn a face-down copy at the row slot that flips on the way.
   */
  private async takeFromHand(
    playerId: number,
    cardId: number | null,
    card: Card | undefined,
    realHand: boolean,
  ): Promise<{ group: Object3D; dispose: () => void }> {
    const hs = this.host.handService;
    if (playerId === this.host.bottomPlayer()?.id) {
      this.result.bottomHandTouched = true;
      const pickId = realHand && cardId != null ? cardId : hs.getHandCardIds().slice(-1)[0];
      const detached = pickId != null ? hs.detachHandCardForDiscardFlight(pickId, this.host.worldRoot) : null;
      if (detached && realHand && this.host.isBottomHandFaceUp()) {
        return { group: detached.getGroup(), dispose: () => detached.dispose() };
      }
      const at = new Vector3();
      if (detached) {
        detached.getGroup().getWorldPosition(at);
        detached.getGroup().removeFromParent();
        detached.dispose();
      } else {
        at.copy(hs.getHandSlotWorld(0, 1));
      }
      const mesh = await this.createFlightCard(playerId, card, at, { faceDown: true, scale: 1.1 });
      return { group: mesh.getGroup(), dispose: () => mesh.dispose() };
    }
    this.result.topHandTouched = true;
    const [slot] = hs.takeOpponentHandCards(1, realHand && cardId != null ? [cardId] : undefined);
    const at = slot?.position ?? ZONE_POSITIONS.topPlayer.active.clone().setZ(-2);
    const mesh = await this.createFlightCard(playerId, card, at, { faceDown: true, scale: 1.1 });
    return { group: mesh.getGroup(), dispose: () => mesh.dispose() };
  }

  private async takeFromOrigin(
    playerId: number,
    cardId: number,
    origin: PileOrigin,
  ): Promise<{ group: Object3D; dispose: () => void }> {
    const card = findCard(this.playerOf(playerId), cardId);
    const spawn = async (at: Vector3, faceDown: boolean) => {
      const mesh = await this.createFlightCard(playerId, card, at, { faceDown });
      return { group: mesh.getGroup(), dispose: () => mesh.dispose() };
    };
    switch (origin.kind) {
      case 'hand':
        return this.takeFromHand(playerId, cardId, card, this.plan.players.get(playerId)?.realHand ?? false);
      case 'deck': {
        const count = this.deckCount.get(playerId) ?? 0;
        this.deckCount.set(playerId, Math.max(0, count - 1));
        await this.render();
        return spawn(this.deckTopWorld(playerId, count), true);
      }
      case 'board':
        return spawn(this.boardSlotWorld(playerId, origin.loc), false);
      case 'stadium':
        return spawn(ZONE_POSITIONS.stadium.clone().setY(FLIGHT_LIFT_Y), false);
    }
  }

  // --- Steps ---------------------------------------------------------------

  private async runTrainerToPlayZone(
    step: Extract<TransitionStep, { kind: 'trainerToPlayZone' }>,
  ): Promise<void> {
    const { playerId, cardId } = step;
    const card = findCard(this.playerOf(playerId), cardId);
    const nextPlayer = this.next.players.get(playerId);
    const isStadiumArrival = nextPlayer?.stadiumIds.includes(cardId) ?? false;
    const staysInZone =
      isStadiumArrival || (nextPlayer?.supporterIds.includes(cardId) ?? false);

    const local = step.preFlown ? this.host.takeLocalTrainerFlight(cardId) : undefined;
    if (local) {
      await Promise.race([local.landed, sleep(LOCAL_TRAINER_LANDING_TIMEOUT_MS)]);
      local.endHiding();
      // Stadiums are owned by syncSharedStadium — never pin them onto the supporter slot.
      if (!isStadiumArrival && !staysInZone && card) {
        this.overrides.supporterCard.set(playerId, card);
      }
      await this.render();
      local.dispose();
      return;
    }

    const P = this.prev.players.get(playerId);
    const fromHand = P?.handIds == null || P.handIds.includes(cardId);
    const flight = fromHand
      ? await this.takeFromHand(playerId, cardId, card, this.plan.players.get(playerId)?.realHand ?? false)
      : await this.takeFromOrigin(playerId, cardId, { kind: 'deck' });
    const target = isStadiumArrival
      ? ZONE_POSITIONS.stadium.clone().setY(Math.max(ZONE_POSITIONS.stadium.y, 0.08))
      : this.supporterWorld(playerId);
    const isTop = !isStadiumArrival && this.seatOf(playerId) === 'topPlayer';
    await Promise.all([
      this.host.animationService.playHandCardDropOnBoard(flight.group, target, {
        endScale: 1,
        endRotationY: isTop ? Math.PI : 0,
      }),
      this.flipFaceUp(flight.group),
    ]);
    if (!isStadiumArrival) {
      this.overrides.hiddenSupporterPlayerIds.delete(playerId);
      if (!staysInZone && card) {
        this.overrides.supporterCard.set(playerId, card);
      }
    }
    await this.render();
    flight.group.removeFromParent();
    flight.dispose();
  }

  private flipFaceUp(group: Object3D): Promise<void> {
    if (Math.abs(group.rotation.z) < 0.01) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      gsap.to(group.rotation, {
        z: 0,
        duration: REVEAL_FLIP_DURATION_SEC,
        ease: 'power2.inOut',
        onComplete: () => resolve(),
      });
    });
  }

  private async runToPile(step: Extract<TransitionStep, { kind: 'toPile' }>): Promise<void> {
    const seat = this.seatOf(step.playerId);
    for (const { cardId, origin } of step.cards) {
      if (this.isStale()) {
        return;
      }
      const flight = await this.takeFromOrigin(step.playerId, cardId, origin);
      const target = this.host.stateSync.getPileTopWorld(
        seat,
        step.zone,
        this.visiblePileCount(step.playerId, step.zone),
      );
      await this.flyTo(flight.group, target);
      this.landOnPile(step.playerId, step.zone, [cardId]);
      await this.render();
      flight.group.removeFromParent();
      flight.dispose();
    }
  }

  private async runGhostToPile(
    step: Extract<TransitionStep, { kind: 'boardGhostToPile' }>,
    ghostKey: string | null | undefined,
  ): Promise<void> {
    const ghost = ghostKey ? this.host.stateSync.getCardById(ghostKey) : undefined;
    if (ghost) {
      const target = this.host.stateSync.getPileTopWorld(
        this.seatOf(step.playerId),
        step.zone,
        this.visiblePileCount(step.playerId, step.zone),
      );
      await this.host.animationService.playKnockOutToDiscardSequence(ghost.getGroup(), target);
    }
    this.landOnPile(step.playerId, step.zone, step.cardIds);
    await this.render();
    if (ghostKey) {
      this.host.stateSync.removeBoardCardById(ghostKey);
    }
  }

  private async runHandToDeck(step: Extract<TransitionStep, { kind: 'handToDeck' }>): Promise<void> {
    const { playerId, count } = step;
    const isBottom = playerId === this.host.bottomPlayer()?.id;
    const hs = this.host.handService;
    const base = this.deckCount.get(playerId) ?? 0;
    const flights: { group: Object3D; dispose: () => void }[] = [];

    if (isBottom) {
      this.result.bottomHandTouched = true;
      const ids = step.cardIds ?? hs.getHandCardIds().slice(-count);
      for (const id of ids) {
        const detached = hs.detachHandCardForDiscardFlight(id, this.host.worldRoot);
        if (detached) {
          flights.push({ group: detached.getGroup(), dispose: () => detached.dispose() });
        }
      }
    } else {
      this.result.topHandTouched = true;
      const slots = hs.takeOpponentHandCards(count, step.cardIds ?? undefined);
      for (const slot of slots) {
        const mesh = await this.createFlightCard(playerId, undefined, slot.position, {
          faceDown: true,
          scale: 1.1,
        });
        flights.push({ group: mesh.getGroup(), dispose: () => mesh.dispose() });
      }
    }

    await Promise.all(
      flights.map(async (flight, i) => {
        if (i > 0) {
          await sleep(i * HAND_TO_DECK_STAGGER_SEC * 1000);
        }
        flight.group.renderOrder = FLIGHT_RENDER_ORDER;
        await this.host.animationService.playHandToDeck(flight.group, this.deckTopWorld(playerId, base + i + 1));
      }),
    );
    this.deckCount.set(playerId, base + count);
    await this.render();
    for (const flight of flights) {
      flight.group.removeFromParent();
      flight.dispose();
    }
  }

  private laterDrawIndices(step: Extract<TransitionStep, { kind: 'draw' }>): Set<number> {
    const out = new Set<number>();
    let seen = false;
    for (const s of this.steps) {
      if (s === step) {
        seen = true;
        continue;
      }
      if (seen && s.kind === 'draw' && s.playerId === step.playerId) {
        s.cards.forEach((c) => out.add(c.handIndex));
      }
    }
    return out;
  }

  private drawOrigins(step: Extract<TransitionStep, { kind: 'draw' }>): Vector3[] {
    const { playerId } = step;
    const isBottom = playerId === this.host.bottomPlayer()?.id;
    const aspect = this.host.aspect();
    let deck = this.deckCount.get(playerId) ?? 0;
    const origins = step.cards.map((c) => {
      if (c.source.kind === 'prize') {
        const slot = isBottom
          ? getBottomPrizeSlotWorld(aspect, c.source.grid)
          : getTopPrizeSlotWorld(aspect, c.source.grid);
        return slot.setY(slot.y + FLIGHT_LIFT_Y);
      }
      const at = this.deckTopWorld(playerId, deck);
      deck = Math.max(0, deck - 1);
      return at;
    });
    this.deckCount.set(playerId, deck);
    return origins;
  }

  private async runSetupReveal(
    step: Extract<TransitionStep, { kind: 'setupReveal' }>,
  ): Promise<void> {
    this.host.stateSync.clearSetupStartingPokemonPreview();
    // Hold Active/Bench face-down while next state already has isSecret=false.
    this.overrides.holdBoardFaceDown = true;
    await this.render();

    const seats: Seat[] = ['bottomPlayer', 'topPlayer'];
    for (let wi = 0; wi < step.waves.length; wi++) {
      if (this.isStale()) {
        break;
      }
      const wave = step.waves[wi];
      const flips: Promise<void>[] = [];
      for (const seat of seats) {
        const player = seat === 'bottomPlayer' ? this.host.bottomPlayer() : this.host.topPlayer();
        if (!player) {
          continue;
        }
        const meshId =
          wave.slot === 'active'
            ? `${seat}_${player.id}_active`
            : `${seat}_${player.id}_bench_${wave.index}`;
        const mesh = this.host.stateSync.getCardById(meshId);
        if (!mesh) {
          continue;
        }
        flips.push(this.flipBoardSlotFaceUp(mesh, player, wave));
      }
      if (flips.length > 0) {
        await Promise.all(flips);
      }
      if (wi < step.waves.length - 1) {
        await sleep(SETUP_REVEAL_WAVE_GAP_SEC * 1000);
      }
    }

    this.overrides.holdBoardFaceDown = false;
    await this.render();
  }

  private async flipBoardSlotFaceUp(
    mesh: Board3dCard,
    player: Player,
    wave: { slot: 'active' | 'bench'; index: number },
  ): Promise<void> {
    const list =
      wave.slot === 'active'
        ? player.active
        : player.bench[wave.index];
    const card = list?.getPokemonCard?.() ?? list?.cards?.[0];
    const [cardBack, mask] = await Promise.all([
      this.backTexture(player),
      this.host.assetLoader.loadCardMaskTexture(),
    ]);
    let scan = cardBack;
    const scanUrl = card ? this.host.cardsAdapter.getScanUrlFor3D(card, list) : undefined;
    if (scanUrl?.trim()) {
      try {
        scan = await this.host.assetLoader.loadCardTexture(scanUrl);
      } catch {
        scan = cardBack;
      }
    }

    const group = mesh.getGroup();
    // Show cardback via z=π while loading the scan onto the front material.
    group.rotation.z = Math.PI;
    mesh.updateTexture(scan, cardBack, mask);
    mesh.setHolo(null);

    await this.host.animationService.playInPlaceRevealFlip(group, {
      onRevealFace: () => {
        group.userData.isFaceDown = false;
      },
    });
    mesh.updateTexture(scan, cardBack, mask);
    group.userData.isFaceDown = false;
    group.rotation.z = 0;
    this.host.markDirty();
  }

  private async runDraw(step: Extract<TransitionStep, { kind: 'draw' }>): Promise<void> {
    const isBottom = step.playerId === this.host.bottomPlayer()?.id;
    const later = this.laterDrawIndices(step);
    const origins = this.drawOrigins(step);
    await this.render();

    if (!isBottom) {
      await this.runOpponentDraw(step, later, origins);
      return;
    }

    this.result.bottomHandTouched = true;
    const hand = this.host.bottomHand();
    const handAfter = withCards(hand, hand.cards.filter((_, i) => !later.has(i)));
    const flyIds = step.cards
      .map((c) => c.cardId ?? hand.cards[c.handIndex]?.id)
      .filter((id): id is number => id != null);
    const inFlight = this.host.handFlightCardIds();
    const omit = new Set<number>();
    handAfter.cards.forEach((c, i) => {
      if (inFlight.has(c.id)) {
        omit.add(i);
      }
    });

    const flights = await this.host.handService.prepareDrawSequence(
      handAfter,
      this.host.isBottomHandFaceUp(),
      this.host.handSlot,
      this.host.worldRoot,
      flyIds,
      origins,
      this.host.playableCardIds(),
      omit.size > 0 ? omit : undefined,
    );
    if (flights.length === 0) {
      return;
    }
    const preset: DrawFlightVisualPreset = step.setupDeal
      ? 'setupMulligan'
      : step.turnBegin
        ? 'turnBegin'
        : 'default';
    await this.flyDrawsToHand(flights, preset);
  }

  private async flyDrawsToHand(flights: DrawSequenceFlight[], preset: DrawFlightVisualPreset): Promise<void> {
    const anim = this.host.animationService;
    const hs = this.host.handService;
    const aspect = this.host.aspect();
    const stage = getDrawFlightStageCenterWorld(aspect, this.host.isUpsideDown());

    if (flights.length === 1) {
      const [f] = flights;
      await anim.playDrawFromDeckToHand(f.flyingCard, stage, f.handSlotWorld, {
        onRevealFace: () => hs.revealDrawFlightFace(f.flyingCard),
        visualPreset: preset,
      });
      hs.finishDrawSequenceFlight(f.flyingCard);
      this.host.markDirty();
      return;
    }

    const maxRowWidth = getMaxDrawStageRowWidthWorld(aspect, this.host.isUpsideDown());
    const { stageScale, centerSpread } = getMultiDrawBatchStageLayout(flights.length, maxRowWidth);
    for (let i = 0; i < flights.length; i++) {
      if (this.isStale()) {
        return;
      }
      const f = flights[i];
      const stagePos = stage.clone();
      stagePos.x += (i - (flights.length - 1) / 2) * centerSpread;
      await anim.playDrawDeckToStage(f.flyingCard, stagePos, {
        onRevealFace: () => hs.revealDrawFlightFace(f.flyingCard),
        omitPhasePad: true,
        targetStageScale: stageScale,
        visualPreset: preset,
      });
    }
    await sleep(getMultiDrawSharedHoldSec(preset) * 1000);
    await Promise.all(
      flights.map((f, i) =>
        anim.playDrawStageToHand(f.flyingCard, f.handSlotWorld, {
          burst: true,
          visualPreset: preset,
          delay: i * MULTI_DRAW_STAGE_TO_HAND_STAGGER_SEC,
        }),
      ),
    );
    for (const f of flights) {
      hs.finishDrawSequenceFlight(f.flyingCard);
    }
    this.host.markDirty();
  }

  private async runOpponentDraw(
    step: Extract<TransitionStep, { kind: 'draw' }>,
    later: Set<number>,
    origins: Vector3[],
  ): Promise<void> {
    this.result.topHandTouched = true;
    const hand = this.host.topHand();
    const keep = Math.max(0, hand.cards.length - later.size);
    const flights = await this.host.handService.prepareOpponentDrawSequence(
      withCards(hand, hand.cards.slice(0, keep)),
      this.host.isTopHandFaceUp(),
      this.host.opponentHandSlot,
      this.host.worldRoot,
      step.cards.length,
      origins,
    );
    await Promise.all(
      flights.map((f, i) =>
        this.host.animationService.playDrawStageToHand(f.flyingCard, f.handSlotWorld, {
          burst: true,
          delay: i * OPPONENT_DRAW_STAGGER_SEC,
        }),
      ),
    );
    for (const f of flights) {
      this.host.handService.finishDrawSequenceFlight(f.flyingCard);
    }
    this.host.markDirty();
  }

  private async runTrainerToDiscard(
    step: Extract<TransitionStep, { kind: 'trainerToDiscard' }>,
  ): Promise<void> {
    const { playerId, cardId, zone } = step;
    const seat = this.seatOf(playerId);
    const meshId = `${seat}_${playerId}_supporter`;
    const ghostKey = this.host.stateSync.detachBoardCardAsGhost(meshId);
    const ghost = ghostKey ? this.host.stateSync.getCardById(ghostKey) : undefined;
    let spawned: Board3dCard | null = null;
    let group: Object3D;
    if (ghost) {
      group = ghost.getGroup();
    } else {
      spawned = await this.createFlightCard(playerId, findCard(this.playerOf(playerId), cardId), this.supporterWorld(playerId), {
        faceDown: false,
      });
      group = spawned.getGroup();
    }
    const target = this.host.stateSync.getPileTopWorld(seat, zone, this.visiblePileCount(playerId, zone));
    await this.flyTo(group, target);
    this.overrides.supporterCard.delete(playerId);
    this.landOnPile(playerId, zone, [cardId]);
    await this.render();
    if (ghostKey) {
      this.host.stateSync.removeBoardCardById(ghostKey);
    }
    if (spawned) {
      group.removeFromParent();
      spawned.dispose();
    }
  }
}
