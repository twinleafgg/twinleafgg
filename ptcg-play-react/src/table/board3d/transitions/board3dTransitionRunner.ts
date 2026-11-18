import { Vector3, type Object3D, type Scene, type Texture } from 'three';
import gsap from 'gsap';
import {
  CardList,
  PlayerType,
  type Card,
  type Player,
  type PokemonCard,
  type PokemonCardList,
} from 'ptcg-server';
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
import {
  BOARD3D_PLAYER_HAND_Z,
  type Board3dHandService,
  type DrawSequenceFlight,
} from '../services/board-3d-hand.service';
import type {
  Board3dDisplayOverrides,
  Board3dStateSyncService,
} from '../services/board-3d-state-sync.service';
import type { Board3dAssetLoaderService } from '../services/board-3d-asset-loader.service';
import type { Board3dCardsAdapter } from '../board3dCardsAdapter';
import { playAttackSfx, playSfx } from '../../../sfx';
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
  /** Three.js scene (coin flips). */
  scene(): Scene | null;
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
  /** Hide a board slot mesh while a Pokémon entrance flight is in the air. */
  hideBoardEntrance(meshId: string): void;
  /** Reveal a board slot mesh after its entrance flight lands. */
  showBoardEntrance(meshId: string): void;
  /** Pending attack damage for this defending player, or null if none / already applied. */
  consumePendingAttackDamage?(defenderId: number): number | null;
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
/** Matches live {@link Board3dController} deck→bench drop pacing. */
const DECK_TO_BOARD_DROP_PACE = 0.6;
const HAND_PLAY_FLIGHT_INITIAL_SCALE = 1.3;

const sleep = (ms: number) => new Promise<void>((r) => globalThis.setTimeout(r, ms));

function playerCardLists(player: Player): (CardList | undefined)[] {
  return [
    player.deck,
    player.hand,
    player.discard,
    player.lostzone,
    player.supporter,
    player.stadium,
    player.active,
    ...player.bench,
    ...(player.prizes ?? []),
  ];
}

function findCard(player: Player | undefined, cardId: number): Card | undefined {
  if (!player) {
    return undefined;
  }
  for (const list of playerCardLists(player)) {
    const hit = list?.cards?.find((c) => c.id === cardId);
    if (hit) {
      return hit;
    }
  }
  // Attachments live on PokemonCardList.energies / .tools
  for (const slot of [player.active, ...player.bench]) {
    const energyHit = slot?.energies?.cards?.find((c) => c.id === cardId);
    if (energyHit) {
      return energyHit;
    }
    const toolHit = slot?.tools?.find((c) => c.id === cardId);
    if (toolHit) {
      return toolHit;
    }
  }
  return undefined;
}

function pokemonListForLoc(
  player: Player | undefined,
  loc: BoardCardLocation,
): PokemonCardList | undefined {
  if (!player) {
    return undefined;
  }
  return loc.slot === 'active' ? player.active : player.bench[loc.index];
}

function playerOwnsLiveCard(player: Player, cardId: number): boolean {
  return playerCardLists(player).some((list) => list?.cards?.some((c) => c.id === cardId));
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
      // Suppress Choose prize before any await / paint so the prompt cannot flash.
      this.activateKoSuppressIfNeeded();
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
          case 'pokemonToBoard':
            await this.runPokemonToBoard(step);
            break;
          case 'energyAttach':
            await this.runEnergyAttach(step);
            break;
          case 'attack':
            await this.runAttack(step);
            break;
          case 'coinFlip':
            await this.runCoinFlip(step);
            break;
          case 'showCards':
            await this.runShowCards(step);
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

  private activateKoSuppressIfNeeded(): void {
    if (this.koActive) {
      return;
    }
    if (!this.steps.some((s) => s.kind === 'boardGhostToPile')) {
      return;
    }
    this.koActive = true;
    this.host.setKoActive(true);
  }

  private detachGhosts(): Map<TransitionStep, string | null> {
    const out = new Map<TransitionStep, string | null>();
    for (const step of this.steps) {
      if (step.kind !== 'boardGhostToPile') {
        continue;
      }
      const meshId = boardSlotMeshId(this.seatOf(step.playerId), step.playerId, step.loc);
      // Paint lethal damage on the live slot before re-key so overlays follow the ghost.
      this.ensureKoDamageCounter(meshId, step.playerId);
      out.set(step, this.host.stateSync.detachBoardCardAsGhost(meshId));
    }
    this.activateKoSuppressIfNeeded();
    return out;
  }

  /**
   * Keep damage visible on a KO'd Pokémon for the discard flight. Server often clears
   * damage in the same state that removes the card, so the board never syncs the total.
   */
  private ensureKoDamageCounter(meshId: string, ownerPlayerId: number): void {
    const boardCard = this.host.stateSync.getCardById(meshId);
    if (!boardCard) {
      return;
    }
    const cardList = boardCard.getGroup().userData.cardList as { damage?: number } | undefined;
    const shown = this.host.stateSync.getDamageCounterValue(meshId);
    const base = Math.max(0, cardList?.damage ?? 0, shown);
    // Only consume pending once (first call before re-key); second call keeps the painted total.
    const pending = this.host.consumePendingAttackDamage?.(ownerPlayerId) ?? null;
    const next = Math.max(shown, base + (pending ?? 0));
    if (next <= 0) {
      return;
    }
    if (next !== shown) {
      this.host.stateSync.applyDamageCounterVisual(meshId, next);
    }
    if (cardList) {
      cardList.damage = next;
    }
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

  private async runPokemonToBoard(
    step: Extract<TransitionStep, { kind: 'pokemonToBoard' }>,
  ): Promise<void> {
    const { playerId, cardId, loc, source, setupFaceDown } = step;
    const seat = this.seatOf(playerId);
    const meshId = boardSlotMeshId(seat, playerId, loc);
    const isTop = seat === 'topPlayer';
    const endRotationY = isTop ? Math.PI : 0;
    const endScale = loc.slot === 'active' ? 1.5 : 1.0;
    const target = this.boardSlotWorld(playerId, loc);
    target.y = Math.max(target.y, 0.08);
    const player = this.playerOf(playerId);

    this.host.hideBoardEntrance(meshId);
    await this.render();

    const card = findCard(player, cardId);
    const realHand = this.plan.players.get(playerId)?.realHand ?? false;

    try {
      if (source === 'hand') {
        const flight = await this.takeFromHand(playerId, cardId, card, realHand);
        const group = flight.group;
        // Match live hand→board start pose when the detached mesh is still near the hand.
        if (playerId === this.host.bottomPlayer()?.id) {
          group.position.set(group.position.x, 0.15, BOARD3D_PLAYER_HAND_Z);
          group.rotation.set(0, 0, 0);
          group.scale.setScalar(HAND_PLAY_FLIGHT_INITIAL_SCALE);
        }
        playSfx('pokemonplay');
        if (setupFaceDown) {
          const [cardBack, mask] = await Promise.all([
            this.backTexture(player),
            this.host.assetLoader.loadCardMaskTexture(),
          ]);
          const flightCard =
            (group.userData?.board3dCard as Board3dCard | undefined) ??
            null;
          await this.host.animationService.playHandCardDropOnBoard(group, target, {
            endScale,
            endRotationY,
            flipFaceDownDuringTravel: {
              onHideFace: () => {
                flightCard?.updateTexture(cardBack, cardBack, mask);
                flightCard?.setHolo(null);
                group.userData.isFaceDown = true;
              },
            },
          });
          flightCard?.updateTexture(cardBack, cardBack, mask);
          flightCard?.setHolo(null);
          group.userData.isFaceDown = true;
          group.rotation.z = 0;
        } else {
          await Promise.all([
            this.host.animationService.playHandCardDropOnBoard(group, target, {
              endScale,
              endRotationY,
            }),
            this.flipFaceUp(group),
          ]);
        }
        group.removeFromParent();
        flight.dispose();
      } else if (setupFaceDown) {
        // Setup should only place from hand; treat unknown→board as face-down deck drop.
        const count = this.deckCount.get(playerId) ?? 0;
        this.deckCount.set(playerId, Math.max(0, count - 1));
        await this.render();
        const flight = await this.createFlightCard(
          playerId,
          card,
          this.deckTopWorld(playerId, count),
          { faceDown: true, scale: 1.1 },
        );
        const group = flight.getGroup();
        group.rotation.set(0, endRotationY, Math.PI);
        playSfx('pokemonplay');
        await this.host.animationService.playHandCardDropOnBoard(group, target, {
          endScale,
          endRotationY,
          durationScale: DECK_TO_BOARD_DROP_PACE,
          flipFaceDownDuringTravel: {
            onHideFace: () => {
              group.userData.isFaceDown = true;
            },
          },
        });
        group.removeFromParent();
        flight.dispose();
      } else {
        const count = this.deckCount.get(playerId) ?? 0;
        this.deckCount.set(playerId, Math.max(0, count - 1));
        await this.render();
        const flight = await this.createFlightCard(
          playerId,
          card,
          this.deckTopWorld(playerId, count),
          { faceDown: true, scale: 1.1 },
        );
        const group = flight.getGroup();
        group.rotation.set(0, endRotationY, Math.PI);
        playSfx('pokemonplay');
        await this.host.animationService.playDrawDeckToBoard(group, target, {
          endRotationY,
          onRevealFace: () => {
            group.rotation.z = 0;
            this.host.markDirty();
          },
        });
        await this.host.animationService.playHandCardDropOnBoard(group, target, {
          endScale,
          endRotationY,
          durationScale: DECK_TO_BOARD_DROP_PACE,
        });
        group.removeFromParent();
        flight.dispose();
      }
    } finally {
      this.host.showBoardEntrance(meshId);
      await this.render();
    }
  }

  private async runEnergyAttach(
    step: Extract<TransitionStep, { kind: 'energyAttach' }>,
  ): Promise<void> {
    const { playerId, cardId, loc, source } = step;
    const seat = this.seatOf(playerId);
    const hostMeshId = boardSlotMeshId(seat, playerId, loc);
    const hostBoardCard = this.host.stateSync.getCardById(hostMeshId);
    const player = this.playerOf(playerId);
    const pokemonList = pokemonListForLoc(player, loc);
    const energyCard = findCard(player, cardId);
    const energies = pokemonList?.energies;
    const energyCards = energies?.cards ?? [];
    const foundIdx = energyCards.findIndex((c) => c.id === cardId);
    const energySlotIndex =
      foundIdx >= 0 ? foundIdx : Math.max(0, energyCards.length - 1);
    const realHand = this.plan.players.get(playerId)?.realHand ?? false;

    if (hostBoardCard) {
      this.host.stateSync.setSuppressedEnergyIconSlot(hostMeshId, energySlotIndex);
    }

    let flightDispose: (() => void) | undefined;
    let flightCard: Board3dCard | undefined;

    try {
      if (source === 'hand') {
        const taken = await this.takeFromHand(playerId, cardId, energyCard, realHand);
        flightDispose = taken.dispose;
        flightCard = taken.group.userData?.board3dCard as Board3dCard | undefined;
        if (flightCard && playerId === this.host.bottomPlayer()?.id) {
          const group = flightCard.getGroup();
          group.position.set(group.position.x, 0.15, BOARD3D_PLAYER_HAND_Z);
          group.rotation.set(0, 0, 0);
          group.scale.setScalar(HAND_PLAY_FLIGHT_INITIAL_SCALE);
        }
        // Opponent/hidden hands spawn face-down — reveal before morphing into the icon.
        if (flightCard && Math.abs(flightCard.getGroup().rotation.z) > 0.01) {
          await this.flipFaceUp(flightCard.getGroup());
        }
      } else {
        const count = this.deckCount.get(playerId) ?? 0;
        this.deckCount.set(playerId, Math.max(0, count - 1));
        await this.render();
        flightCard = await this.createFlightCard(
          playerId,
          energyCard,
          this.deckTopWorld(playerId, count),
          { faceDown: true },
        );
        flightDispose = () => flightCard!.dispose();
        await this.flipFaceUp(flightCard.getGroup());
      }

      if (!hostBoardCard || !flightCard || !energyCard) {
        return;
      }

      playSfx('energyattach');
      const energyList = energies ?? new CardList();
      const iconTexture = await this.host.stateSync.loadEnergyIconTexture(energyCard, energyList);
      await this.host.animationService.playEnergyAttachToPokemon(
        flightCard,
        hostBoardCard,
        energySlotIndex,
        iconTexture,
      );
    } finally {
      flightDispose?.();
      if (hostBoardCard) {
        this.host.stateSync.clearSuppressedEnergyIconSlot(hostMeshId);
        if (energies) {
          await this.host.stateSync.refreshEnergyOverlayForCard(hostMeshId, energies);
        }
      }
      await this.render();
    }
  }

  private async runAttack(step: Extract<TransitionStep, { kind: 'attack' }>): Promise<void> {
    const { playerId, damageDealt } = step;
    const seat = this.seatOf(playerId);
    const meshId = `${seat}_${playerId}_active`;
    const boardCard = this.host.stateSync.getCardById(meshId);
    if (!boardCard) {
      return;
    }

    const attackerCard = boardCard.getGroup().userData?.cardData as PokemonCard | undefined;
    if (attackerCard?.cardType != null) {
      playAttackSfx(attackerCard.cardType, damageDealt);
    }

    const opponentId =
      this.host.bottomPlayer()?.id === playerId
        ? this.host.topPlayer()?.id
        : this.host.bottomPlayer()?.id;
    const attackerWorld = boardCard.getGroup().position.clone();
    let hitPromise: Promise<void> = Promise.resolve();
    let damageApplied = false;

    // Next-state sync already carries post-attack damage — roll the counter back to the
    // previous snapshot so the impact bump is visible.
    const prevOppDamage =
      opponentId != null ? (this.prev.players.get(opponentId)?.activeDamage ?? 0) : 0;
    const nextOppDamage =
      opponentId != null
        ? (this.next.players.get(opponentId)?.activeDamage ?? prevOppDamage + damageDealt)
        : 0;
    if (opponentId != null && damageDealt > 0) {
      const defSeat = this.seatOf(opponentId);
      const defMeshId = `${defSeat}_${opponentId}_active`;
      this.host.stateSync.applyDamageCounterVisual(defMeshId, prevOppDamage);
      const defender = this.host.stateSync.getCardById(defMeshId);
      const cardList = defender?.getGroup().userData.cardList as { damage?: number } | undefined;
      if (cardList) {
        cardList.damage = prevOppDamage;
      }
    }

    const applyDamage = () => {
      if (damageApplied || damageDealt <= 0 || opponentId == null) {
        damageApplied = true;
        return;
      }
      damageApplied = true;
      const defSeat = this.seatOf(opponentId);
      const defMeshId = `${defSeat}_${opponentId}_active`;
      const defender = this.host.stateSync.getCardById(defMeshId);
      if (!defender) {
        return;
      }
      const cardList = defender.getGroup().userData.cardList as { damage?: number } | undefined;
      this.host.stateSync.applyDamageCounterVisual(defMeshId, nextOppDamage);
      if (cardList) {
        cardList.damage = nextOppDamage;
      }
    };

    this.host.stateSync.lockBoardCardPose(meshId);
    try {
      await this.host.animationService.playAttackAnimation(boardCard.getGroup(), {
        onImpact: () => {
          applyDamage();
          if (opponentId == null || damageDealt <= 0) {
            return;
          }
          const defSeat = this.seatOf(opponentId);
          const defMeshId = `${defSeat}_${opponentId}_active`;
          const defender = this.host.stateSync.getCardById(defMeshId);
          if (!defender) {
            return;
          }
          this.host.stateSync.lockBoardCardPose(defMeshId);
          hitPromise = this.host.animationService
            .playGetHitReaction(defender.getGroup(), { awayFromWorld: attackerWorld })
            .finally(() => {
              this.host.stateSync.unlockBoardCardPose(defMeshId);
            });
        },
      });
    } finally {
      this.host.stateSync.unlockBoardCardPose(meshId);
    }
    if (!damageApplied) {
      applyDamage();
    }
    await hitPromise;
  }

  private async runCoinFlip(step: Extract<TransitionStep, { kind: 'coinFlip' }>): Promise<void> {
    const scene = this.host.scene();
    if (!scene) {
      return;
    }
    const flippingPlayer = this.playerOf(step.playerId);
    const frontPath =
      (flippingPlayer as { coinImagePath?: string } | undefined)?.coinImagePath ||
      'twinleaf-coin.png';
    const headsUrl = this.host.cardsAdapter.getCoinUrl(frontPath);
    const tailsUrl = this.host.cardsAdapter.getCoinUrl('twinleaf-coin-back.png');
    playSfx('coinflip');
    await this.host.animationService.playCoinFlipAnimation(
      scene,
      step.heads,
      headsUrl,
      tailsUrl,
    );
    // Brief hold so the settled face is readable before the next step.
    await sleep(400);
  }

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
    const flights: { group: Object3D; dispose: () => void; board3d?: Board3dCard }[] = [];

    if (isBottom) {
      this.result.bottomHandTouched = true;
      const ids = step.cardIds ?? hs.getHandCardIds().slice(-count);
      for (const id of ids) {
        const detached = hs.detachHandCardForDiscardFlight(id, this.host.worldRoot);
        if (detached) {
          flights.push({
            group: detached.getGroup(),
            dispose: () => detached.dispose(),
            board3d: detached,
          });
        }
      }
    } else if (this.host.isTopHandFaceUp()) {
      this.result.topHandTouched = true;
      const detached = hs.detachOpponentHandCardsForDeckFlight(
        count,
        this.host.worldRoot,
        step.cardIds ?? undefined,
      );
      for (const card of detached) {
        flights.push({
          group: card.getGroup(),
          dispose: () => card.dispose(),
          board3d: card,
        });
      }
    } else {
      this.result.topHandTouched = true;
      const slots = hs.takeOpponentHandCards(count, step.cardIds ?? undefined);
      for (const slot of slots) {
        const mesh = await this.createFlightCard(playerId, undefined, slot.position, {
          faceDown: true,
          scale: 1.1,
        });
        flights.push({ group: mesh.getGroup(), dispose: () => mesh.dispose(), board3d: mesh });
      }
    }

    const [cardBack, mask] = await Promise.all([
      this.backTexture(this.playerOf(playerId)),
      this.host.assetLoader.loadCardMaskTexture(),
    ]);

    await Promise.all(
      flights.map(async (flight, i) => {
        if (i > 0) {
          await sleep(i * HAND_TO_DECK_STAGGER_SEC * 1000);
        }
        flight.group.renderOrder = FLIGHT_RENDER_ORDER;
        const alreadyFaceDown = Math.abs(flight.group.rotation.z) > Math.PI / 2;
        await this.host.animationService.playHandToDeck(
          flight.group,
          this.deckTopWorld(playerId, base + i + 1),
          alreadyFaceDown
            ? undefined
            : {
                flipFaceDownDuringTravel: {
                  onHideFace: () => {
                    flight.board3d?.updateTexture(cardBack, cardBack, mask);
                    flight.board3d?.setHolo(null);
                    flight.group.userData.isFaceDown = true;
                  },
                },
              },
        );
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

  private showCardLookup(cardId: number): Card | undefined {
    return (
      this.plan.showCardsById?.get(cardId) ??
      findCard(this.host.bottomPlayer(), cardId) ??
      findCard(this.host.topPlayer(), cardId)
    );
  }

  private async flyDrawsToHand(
    flights: DrawSequenceFlight[],
    preset: DrawFlightVisualPreset,
    endRotationY = 0,
  ): Promise<void> {
    const anim = this.host.animationService;
    const hs = this.host.handService;
    const aspect = this.host.aspect();
    const stage = getDrawFlightStageCenterWorld(aspect, this.host.isUpsideDown());

    if (flights.length === 1) {
      const [f] = flights;
      await anim.playDrawFromDeckToHand(f.flyingCard, stage, f.handSlotWorld, {
        onRevealFace: () => hs.revealDrawFlightFace(f.flyingCard),
        visualPreset: preset,
        endRotationY,
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
        endRotationY,
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
    const revealCards = (step.revealCardIds ?? [])
      .map((id) => this.showCardLookup(id))
      .filter((c): c is Card => c != null);
    const useReveal = revealCards.length > 0;
    const flights = await this.host.handService.prepareOpponentDrawSequence(
      withCards(hand, hand.cards.slice(0, keep)),
      this.host.isTopHandFaceUp(),
      this.host.opponentHandSlot,
      this.host.worldRoot,
      step.cards.length,
      origins,
      useReveal ? revealCards : undefined,
    );
    if (flights.length === 0) {
      return;
    }
    // Opponent hand group is yawed π; keep that while cards are world-detached.
    const opponentYaw = Math.PI;
    if (useReveal) {
      const preset: DrawFlightVisualPreset = step.setupDeal
        ? 'setupMulligan'
        : step.turnBegin
          ? 'turnBegin'
          : 'default';
      await this.flyDrawsToHand(flights, preset, opponentYaw);
      return;
    }
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

  /**
   * ShowCards cards not covered by a reveal draw: origin → stage flip → destination
   * (same motion as draw-from-deck).
   */
  private async runShowCards(step: Extract<TransitionStep, { kind: 'showCards' }>): Promise<void> {
    if (step.cardIds.length === 0) {
      return;
    }
    type Flight = {
      mesh: Board3dCard;
      group: Object3D;
      dest: Vector3;
      endScale: number;
      toDeck: boolean;
    };
    const flights: Flight[] = [];
    const deckCursor = new Map<number, number>();
    for (const [playerId, P] of this.prev.players) {
      deckCursor.set(playerId, this.deckCount.get(playerId) ?? P.deckCount);
    }

    for (const cardId of step.cardIds) {
      if (this.isStale()) {
        break;
      }
      const card = this.showCardLookup(cardId);
      const prevLoc = this.locateCard(cardId, this.prev);
      const nextLoc = this.locateCard(cardId, this.next);
      const ownerId =
        nextLoc?.playerId ??
        prevLoc?.playerId ??
        this.plan.showCardsSourcePlayerById?.get(cardId) ??
        this.inferShowCardsOwner(cardId) ??
        this.host.bottomPlayer()?.id;
      if (ownerId == null) {
        continue;
      }

      // Already in hand both before and after: a lingering ShowCards prompt — do not re-fly.
      if (
        prevLoc?.zone === 'hand' &&
        nextLoc?.zone === 'hand' &&
        prevLoc.playerId === nextLoc.playerId
      ) {
        continue;
      }

      let origin: Vector3;
      if (prevLoc) {
        origin = this.zoneWorld(
          prevLoc.playerId,
          prevLoc.zone,
          prevLoc.loc,
          prevLoc.grid,
          deckCursor,
          cardId,
        );
      } else {
        const deck = deckCursor.get(ownerId) ?? 0;
        origin = this.deckTopWorld(ownerId, deck);
        deckCursor.set(ownerId, Math.max(0, deck - 1));
      }

      const unmoved =
        !!prevLoc &&
        !!nextLoc &&
        prevLoc.zone === nextLoc.zone &&
        prevLoc.playerId === nextLoc.playerId;
      // Prefer a real relocation; when show-before-move leaves the card in place (or the
      // card entered a secret zone), use the ChooseCards destination hint / deck fallback
      // so we do not bounce Super Rod-style reveals back into the discard.
      let dest: Vector3;
      let toDeck = false;
      const endScale = 1.1;
      if (nextLoc && !unmoved) {
        dest = this.zoneWorld(
          nextLoc.playerId,
          nextLoc.zone,
          nextLoc.loc,
          nextLoc.grid,
          deckCursor,
          cardId,
        );
        toDeck = nextLoc.zone === 'deck';
      } else if (step.destinationHint === 'hand') {
        dest = this.zoneWorld(ownerId, 'hand', undefined, undefined, deckCursor, cardId);
      } else {
        // Secret zone (deck) or show-before-move with deck hint / default.
        const deck = deckCursor.get(ownerId) ?? 0;
        dest = this.deckTopWorld(ownerId, deck);
        toDeck = true;
      }

      const mesh = await this.createFlightCard(ownerId, card, origin, {
        faceDown: true,
        scale: 1.1,
      });
      const group = mesh.getGroup();
      const [back, mask] = await Promise.all([
        this.backTexture(this.playerOf(ownerId)),
        this.host.assetLoader.loadCardMaskTexture(),
      ]);
      let revealFront = back;
      const scanUrl = card ? this.host.cardsAdapter.getScanUrlFor3D(card) : undefined;
      if (scanUrl?.trim()) {
        try {
          revealFront = await this.host.assetLoader.loadCardTexture(scanUrl);
        } catch {
          revealFront = back;
        }
      }
      mesh.updateTexture(back, back, mask);
      group.userData.drawRevealFrontTexture = revealFront;
      group.userData.drawRevealBackTexture = back;
      group.userData.drawRevealMaskTexture = mask;
      group.userData.drawBoard3dCard = mesh;
      group.rotation.set(0, 0, 0);
      group.quaternion.identity();
      flights.push({ mesh, group, dest, endScale, toDeck });
    }

    if (flights.length === 0) {
      return;
    }

    const anim = this.host.animationService;
    const aspect = this.host.aspect();
    const stage = getDrawFlightStageCenterWorld(aspect, this.host.isUpsideDown());
    const reveal = (group: Object3D) => this.host.handService.revealDrawFlightFace(group);
    const hideForDeck = (group: Object3D) => this.host.handService.hideDrawFlightFace(group);
    const prepareDeckFlip = (group: Object3D) => this.host.handService.normalizeDrawFlightFaceUp(group);

    if (flights.length === 1) {
      const f = flights[0];
      await anim.playDrawFromDeckToHand(f.group, stage, f.dest, {
        handScale: f.endScale,
        onRevealFace: () => reveal(f.group),
        ...(f.toDeck
          ? {
              beforeStageToHand: () => prepareDeckFlip(f.group),
              flipFaceDownDuringTravel: {
                onHideFace: () => hideForDeck(f.group),
              },
            }
          : {}),
      });
    } else {
      const maxRowWidth = getMaxDrawStageRowWidthWorld(aspect, this.host.isUpsideDown());
      const { stageScale, centerSpread } = getMultiDrawBatchStageLayout(flights.length, maxRowWidth);
      for (let i = 0; i < flights.length; i++) {
        if (this.isStale()) {
          break;
        }
        const f = flights[i];
        const stagePos = stage.clone();
        stagePos.x += (i - (flights.length - 1) / 2) * centerSpread;
        await anim.playDrawDeckToStage(f.group, stagePos, {
          onRevealFace: () => reveal(f.group),
          omitPhasePad: true,
          targetStageScale: stageScale,
        });
      }
      await sleep(getMultiDrawSharedHoldSec('default') * 1000);
      for (const f of flights) {
        if (f.toDeck) {
          prepareDeckFlip(f.group);
        }
      }
      await Promise.all(
        flights.map((f, i) =>
          anim.playDrawStageToHand(f.group, f.dest, {
            handScale: f.endScale,
            burst: true,
            delay: i * MULTI_DRAW_STAGE_TO_HAND_STAGGER_SEC,
            ...(f.toDeck
              ? {
                  flipFaceDownDuringTravel: {
                    onHideFace: () => hideForDeck(f.group),
                  },
                }
              : {}),
          }),
        ),
      );
    }

    for (const f of flights) {
      for (const key of [
        'drawRevealFrontTexture',
        'drawRevealBackTexture',
        'drawRevealMaskTexture',
        'drawBoard3dCard',
        'drawingFromDeck',
      ]) {
        delete f.group.userData[key];
      }
      f.group.removeFromParent();
      f.mesh.dispose();
    }
    this.host.markDirty();
    await this.render();
  }

  private locateCard(
    cardId: number,
    snap: BoardSnapshot,
  ): { playerId: number; zone: string; loc?: BoardCardLocation; grid?: number } | undefined {
    for (const p of snap.players.values()) {
      if (p.handIds?.includes(cardId)) {
        return { playerId: p.playerId, zone: 'hand' };
      }
      if (p.discardIds.includes(cardId)) {
        return { playerId: p.playerId, zone: 'discard' };
      }
      if (p.lostzoneIds.includes(cardId)) {
        return { playerId: p.playerId, zone: 'lostzone' };
      }
      if (p.supporterIds.includes(cardId)) {
        return { playerId: p.playerId, zone: 'supporter' };
      }
      if (p.stadiumIds.includes(cardId)) {
        return { playerId: p.playerId, zone: 'stadium' };
      }
      const board = p.boardCards.get(cardId);
      if (board) {
        return { playerId: p.playerId, zone: 'board', loc: board };
      }
      const prizeIdx = p.prizeIds.indexOf(cardId);
      if (prizeIdx >= 0) {
        return { playerId: p.playerId, zone: 'prize', grid: prizeIdx };
      }
    }
    return undefined;
  }

  private inferShowCardsOwner(cardId: number): number | undefined {
    for (const step of this.steps) {
      if (step.kind === 'draw' && step.revealCardIds?.includes(cardId)) {
        return step.playerId;
      }
    }
    for (const player of [this.host.bottomPlayer(), this.host.topPlayer()]) {
      if (player && playerOwnsLiveCard(player, cardId)) {
        return player.id;
      }
    }
    return undefined;
  }

  private zoneWorld(
    playerId: number,
    zone: string,
    loc: BoardCardLocation | undefined,
    grid: number | undefined,
    deckCursor: Map<number, number>,
    cardId?: number,
  ): Vector3 {
    const seat = this.seatOf(playerId);
    const zp = ZONE_POSITIONS[seat];
    switch (zone) {
      case 'hand': {
        const isBottom = playerId === this.host.bottomPlayer()?.id;
        const handSnap = this.next.players.get(playerId);
        const ids = handSnap?.handIds;
        const total = Math.max(1, ids?.length ?? handSnap?.handCount ?? 1);
        let index = total - 1;
        if (cardId != null && ids) {
          const found = ids.indexOf(cardId);
          if (found >= 0) {
            index = found;
          }
        }
        if (isBottom) {
          return this.host.handService.getHandSlotWorld(index, total);
        }
        return this.host.handService.getOpponentHandSlotWorld(index, total);
      }
      case 'discard':
        return zp.discard.clone().setY(FLIGHT_LIFT_Y);
      case 'lostzone':
        return zp.lostZone.clone().setY(FLIGHT_LIFT_Y);
      case 'supporter':
        return zp.supporter.clone().setY(FLIGHT_LIFT_Y);
      case 'stadium':
        return ZONE_POSITIONS.stadium.clone().setY(FLIGHT_LIFT_Y);
      case 'board':
        return loc ? this.boardSlotWorld(playerId, loc) : zp.active.clone().setY(FLIGHT_LIFT_Y);
      case 'prize': {
        const aspect = this.host.aspect();
        const g = grid ?? 0;
        const slot =
          playerId === this.host.bottomPlayer()?.id
            ? getBottomPrizeSlotWorld(aspect, g)
            : getTopPrizeSlotWorld(aspect, g);
        return slot.setY(slot.y + FLIGHT_LIFT_Y);
      }
      case 'deck':
      default: {
        const deck = deckCursor.get(playerId) ?? 0;
        return this.deckTopWorld(playerId, deck);
      }
    }
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
