import { CardList, Card } from 'ptcg-server';
import { Vector3, Group, Object3D, type Texture } from 'three';
import gsap from 'gsap';
import { Board3dCard } from '../board-3d-card';
import { Board3dAssetLoaderService } from './board-3d-asset-loader.service';
import type { Board3dCardsAdapter } from '../board3dCardsAdapter';
import { apply3dCardHolo } from '../board-3d-holo-apply';
import type { Board3dHandSlotSnapshot } from '../board3dSceneModel';

/** Bottom (near) player hand row Z — behind bottom bench at Z=24. */
export const BOARD3D_PLAYER_HAND_Z = 30;
/**
 * Top (far) player hand row Z — behind top bench at Z=4 by the same +6 offset.
 * Leaves the far hand in the top viewport margin after camera framing.
 */
export const BOARD3D_OPPONENT_HAND_Z = -2;
/** Hand cards sit just above the board plane. */
export const BOARD3D_HAND_Y = 0.1;

export type PrepareDrawFlightResult = {
  flyingCard: Object3D;
  handSlotWorld: Vector3;
};

export type DrawSequenceFlight = PrepareDrawFlightResult & { cardId: number | null };

type UpdateHandArgs = Parameters<Board3dHandService['updateHand']>;

const HAND_SETTLE_DURATION_SEC = 0.25;

export class Board3dHandService {
  private handCards: Map<number, Board3dCard> = new Map();
  private opponentHandCards: Map<number, Board3dCard> = new Map();
  private handGroup: Group;
  private opponentHandGroup: Group;
  private isUpdating: boolean = false;
  private isUpdatingOpponent: boolean = false;
  /** When true, hand card groups are parented via R3F (portal); defer dispose until drain. */
  private r3fDeclarativeHand = false;
  private pendingR3fHandDisposals: Board3dCard[] = [];
  /** Latest {@link updateHand} request that arrived while another hand mutation was running. */
  private pendingHandUpdate: { args: UpdateHandArgs; resolvers: (() => void)[] } | null = null;

  // Hand positioning (straight row) - positioned where old bench used to be
  private cardSpacing = 3.5;         // Space between cards (card width is ~2.75 with scale)

  constructor(
    private assetLoader: Board3dAssetLoaderService,
    private cardsAdapter: Board3dCardsAdapter
  ) {
    this.handGroup = new Group();
    this.handGroup.position.set(0, BOARD3D_HAND_Y, BOARD3D_PLAYER_HAND_Z);
    // Cards flat on board surface (no tilt)
    this.handGroup.rotation.set(0, 0, 0);

    this.opponentHandGroup = new Group();
    this.opponentHandGroup.position.set(0, BOARD3D_HAND_Y, BOARD3D_OPPONENT_HAND_Z);
    // Match top-player board cards / 2D opponent hand: face the near player.
    this.opponentHandGroup.rotation.set(0, Math.PI, 0);
  }

  setR3fDeclarativeHand(enabled: boolean): void {
    this.r3fDeclarativeHand = enabled;
  }

  drainPendingR3fHandDisposals(): void {
    if (this.pendingR3fHandDisposals.length === 0) {
      return;
    }
    for (const card of this.pendingR3fHandDisposals) {
      card.dispose();
    }
    this.pendingR3fHandDisposals = [];
  }

  /**
   * Update hand cards based on player's hand
   */
  async updateHand(
    hand: CardList,
    isOwner: boolean,
    attachRoot: Object3D,
    playableCardIds?: number[],
    omitServerIndices?: ReadonlySet<number>,
  ): Promise<void> {
    if (this.isUpdating) {
      // Latest wins: rebuild once the running mutation finishes instead of dropping this one.
      const args: UpdateHandArgs = [hand, isOwner, attachRoot, playableCardIds, omitServerIndices];
      return new Promise((resolve) => {
        if (this.pendingHandUpdate) {
          this.pendingHandUpdate.args = args;
          this.pendingHandUpdate.resolvers.push(resolve);
        } else {
          this.pendingHandUpdate = { args, resolvers: [resolve] };
        }
      });
    }

    this.isUpdating = true;

    try {
      const cards = hand.cards;

      // Preload hand card textures (fire-and-forget for owner's face-up cards)
      if (isOwner && cards.length > 0) {
        const urls = cards
          .map(c => this.cardsAdapter.getScanUrlFor3D(c, hand))
          .filter((url): url is string => !!url && !!url.trim());
        this.assetLoader.preloadCardTextures(urls);
      }

      // Ensure handGroup is attached before operations
      if (!attachRoot.children.includes(this.handGroup)) {
        attachRoot.add(this.handGroup);
      }

      // Clear old cards (kills animations and properly disposes)
      this.clearHand(attachRoot);

      const visibleEntries: { card: Card; serverIndex: number; visualIndex: number }[] = [];
      for (let i = 0; i < cards.length; i++) {
        if (omitServerIndices?.has(i)) {
          continue;
        }
        visibleEntries.push({ card: cards[i], serverIndex: i, visualIndex: visibleEntries.length });
      }
      const totalVisible = visibleEntries.length;

      const cardPromises = visibleEntries.map(({ card, serverIndex, visualIndex }) => {
        const isPlayable = isOwner && playableCardIds?.includes(card.id);
        return this.createHandCard(
          card,
          serverIndex,
          totalVisible,
          isOwner,
          isPlayable,
          hand,
          false,
          true,
          visualIndex,
        );
      });
      await Promise.all(cardPromises);
    } finally {
      this.releaseUpdating();
    }
  }

  private releaseUpdating(): void {
    this.isUpdating = false;
    const pending = this.pendingHandUpdate;
    if (!pending) {
      return;
    }
    this.pendingHandUpdate = null;
    void this.updateHand(...pending.args).finally(() => {
      for (const resolve of pending.resolvers) {
        resolve();
      }
    });
  }

  /**
   * Rebuild the far (top) player's hand row. Non-interactive; face-up when {@link isVisible}.
   */
  async updateOpponentHand(
    hand: CardList,
    isVisible: boolean,
    attachRoot: Object3D,
  ): Promise<void> {
    while (this.isUpdatingOpponent) {
      await new Promise<void>((r) => setTimeout(r, 16));
    }

    this.isUpdatingOpponent = true;

    try {
      const cards = hand.cards;

      if (isVisible && cards.length > 0) {
        const urls = cards
          .map(c => this.cardsAdapter.getScanUrlFor3D(c, hand))
          .filter((url): url is string => !!url && !!url.trim());
        this.assetLoader.preloadCardTextures(urls);
      }

      if (!attachRoot.children.includes(this.opponentHandGroup)) {
        attachRoot.add(this.opponentHandGroup);
      }

      this.clearOpponentHand();

      const cardPromises = cards.map((card, index) =>
        this.createHandCard(
          card,
          index,
          cards.length,
          isVisible,
          false,
          hand,
          false,
          true,
          index,
          true,
        ),
      );
      await Promise.all(cardPromises);
    } finally {
      this.isUpdatingOpponent = false;
    }
  }

  /**
   * Rebuild the near hand for a draw step. Cards already shown slide from their old slots to
   * the final layout; `flyCardIds` are detached to the world at `origins[i]` face-down, ready
   * for {@link revealDrawFlightFace} / {@link finishDrawSequenceFlight}.
   */
  async prepareDrawSequence(
    hand: CardList,
    isOwner: boolean,
    handSlot: Object3D,
    worldAttachRoot: Object3D,
    flyCardIds: readonly number[],
    origins: readonly Vector3[],
    playableCardIds?: number[],
    omitServerIndices?: ReadonlySet<number>,
  ): Promise<DrawSequenceFlight[]> {
    await this.waitUntilIdle();
    this.isUpdating = true;
    try {
      if (!handSlot.children.includes(this.handGroup)) {
        handSlot.add(this.handGroup);
      }
      const cards = hand.cards;
      if (isOwner && cards.length > 0) {
        const urls = cards
          .map(c => this.cardsAdapter.getScanUrlFor3D(c, hand))
          .filter((url): url is string => !!url && !!url.trim());
        this.assetLoader.preloadCardTextures(urls);
      }

      const previousLocal = new Map<number, Vector3>();
      for (const card of this.handCards.values()) {
        const g = card.getGroup();
        const id = g.userData.cardData?.id as number | undefined;
        if (id != null && g.parent === this.handGroup) {
          previousLocal.set(id, g.position.clone());
        }
      }
      this.clearHand(handSlot);

      const flySet = new Set(flyCardIds);
      const visible: { card: Card; serverIndex: number }[] = [];
      cards.forEach((card, serverIndex) => {
        if (!omitServerIndices?.has(serverIndex)) {
          visible.push({ card, serverIndex });
        }
      });
      const total = visible.length;

      await Promise.all(
        visible.map(({ card, serverIndex }, visualIndex) =>
          this.createHandCard(
            card,
            serverIndex,
            total,
            isOwner,
            isOwner && playableCardIds?.includes(card.id),
            hand,
            flySet.has(card.id),
            true,
            visualIndex,
          ),
        ),
      );

      const flights: DrawSequenceFlight[] = [];
      const [backTexture, maskTexture] = await Promise.all([
        this.loadHandBackTexture(hand),
        this.assetLoader.loadCardMaskTexture(),
      ]);

      for (const { card, serverIndex } of visible) {
        const board3dCard = this.handCards.get(serverIndex);
        if (!board3dCard) {
          continue;
        }
        const group = board3dCard.getGroup();
        const finalLocal = group.position.clone();
        if (!flySet.has(card.id)) {
          const from = previousLocal.get(card.id);
          if (from && !from.equals(finalLocal)) {
            group.position.copy(from);
            gsap.to(group.position, {
              x: finalLocal.x,
              y: finalLocal.y,
              z: finalLocal.z,
              duration: HAND_SETTLE_DURATION_SEC,
              ease: 'power2.out',
            });
          }
          continue;
        }

        const origin = origins[flights.length] ?? origins[origins.length - 1];
        let revealFront = backTexture;
        const scanUrl = this.cardsAdapter.getScanUrlFor3D(card, hand);
        if (isOwner && scanUrl?.trim()) {
          try {
            revealFront = await this.assetLoader.loadCardTexture(scanUrl);
          } catch {
            revealFront = backTexture;
          }
        }
        board3dCard.updateTexture(backTexture, backTexture, maskTexture);
        group.userData.drawRevealFrontTexture = revealFront;
        group.userData.drawRevealBackTexture = backTexture;
        group.userData.drawRevealMaskTexture = maskTexture;
        group.userData.drawBoard3dCard = board3dCard;
        group.userData.drawSlotLocal = finalLocal;
        group.userData.drawingFromDeck = true;

        const handSlotWorld = finalLocal.clone();
        this.handGroup.localToWorld(handSlotWorld);
        worldAttachRoot.attach(group);
        group.position.copy(origin);
        group.rotation.set(0, 0, 0);
        group.quaternion.identity();
        group.scale.set(1.1, 1.1, 1.1);
        flights.push({ flyingCard: group, handSlotWorld, cardId: card.id });
      }
      return flights;
    } finally {
      this.releaseUpdating();
    }
  }

  /** Snap a draw-sequence card into its hand slot and show its face. */
  finishDrawSequenceFlight(cardGroup: Object3D): void {
    const bc = cardGroup.userData.drawBoard3dCard as Board3dCard | undefined;
    const front = cardGroup.userData.drawRevealFrontTexture;
    const back = cardGroup.userData.drawRevealBackTexture;
    const mask = cardGroup.userData.drawRevealMaskTexture;
    const slot = cardGroup.userData.drawSlotLocal as Vector3 | undefined;
    for (const key of [
      'drawingFromDeck',
      'drawRevealFrontTexture',
      'drawRevealBackTexture',
      'drawRevealMaskTexture',
      'drawBoard3dCard',
      'drawSlotLocal',
    ]) {
      delete cardGroup.userData[key];
    }
    const target = cardGroup.userData.isOpponentHandCard ? this.opponentHandGroup : this.handGroup;
    target.attach(cardGroup);
    if (slot) {
      cardGroup.position.copy(slot);
    }
    cardGroup.rotation.set(0, 0, 0);
    cardGroup.quaternion.identity();
    cardGroup.scale.set(1.1, 1.1, 1.1);
    if (bc && front && back !== undefined && mask !== undefined) {
      bc.updateTexture(front, back, mask);
      const data = cardGroup.userData.cardData as Card | undefined;
      if (data) {
        void apply3dCardHolo(this.assetLoader, bc, data, false);
      }
    }
  }

  /**
   * Rebuild the far hand row with its final count; the last `flyCount` cards are detached at
   * `origins[i]` for a draw flight. Remaining cards slide from their old slots.
   */
  async prepareOpponentDrawSequence(
    hand: CardList,
    isVisible: boolean,
    attachRoot: Object3D,
    worldAttachRoot: Object3D,
    flyCount: number,
    origins: readonly Vector3[],
  ): Promise<DrawSequenceFlight[]> {
    while (this.isUpdatingOpponent) {
      await new Promise<void>((r) => setTimeout(r, 16));
    }
    this.isUpdatingOpponent = true;
    try {
      if (!attachRoot.children.includes(this.opponentHandGroup)) {
        attachRoot.add(this.opponentHandGroup);
      }
      const previousLocal = [...this.opponentHandCards.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, c]) => c.getGroup())
        .filter((g) => g.parent === this.opponentHandGroup)
        .map((g) => g.position.clone());
      this.clearOpponentHand();

      const cards = hand.cards;
      await Promise.all(
        cards.map((card, index) =>
          this.createHandCard(card, index, cards.length, isVisible, false, hand, false, true, index, true),
        ),
      );

      const flights: DrawSequenceFlight[] = [];
      const firstFly = Math.max(0, cards.length - flyCount);
      for (let i = 0; i < cards.length; i++) {
        const group = this.opponentHandCards.get(i)?.getGroup();
        if (!group) {
          continue;
        }
        const finalLocal = group.position.clone();
        if (i < firstFly) {
          const from = previousLocal[i];
          if (from && !from.equals(finalLocal)) {
            group.position.copy(from);
            gsap.to(group.position, {
              x: finalLocal.x,
              y: finalLocal.y,
              z: finalLocal.z,
              duration: HAND_SETTLE_DURATION_SEC,
              ease: 'power2.out',
            });
          }
          continue;
        }
        const origin = origins[flights.length] ?? origins[origins.length - 1];
        group.userData.drawSlotLocal = finalLocal;
        group.userData.drawingFromDeck = true;
        const handSlotWorld = finalLocal.clone();
        this.opponentHandGroup.localToWorld(handSlotWorld);
        worldAttachRoot.attach(group);
        group.position.copy(origin);
        flights.push({ flyingCard: group, handSlotWorld, cardId: null });
      }
      return flights;
    } finally {
      this.isUpdatingOpponent = false;
    }
  }

  /**
   * Remove `count` cards from the far hand row: `preferIds` first (face-up rows), then from the end.
   * Returns each removed card's world position and Y rotation for a flight start.
   */
  takeOpponentHandCards(
    count: number,
    preferIds?: readonly number[],
  ): { position: Vector3; rotationY: number }[] {
    const entries = [...this.opponentHandCards.entries()].sort((a, b) => a[0] - b[0]);
    const taken: [number, Board3dCard][] = [];
    for (const id of preferIds ?? []) {
      const hit = entries.find(
        (e) => !taken.includes(e) && e[1].getGroup().userData.cardData?.id === id,
      );
      if (hit && taken.length < count) {
        taken.push(hit);
      }
    }
    for (let i = entries.length - 1; i >= 0 && taken.length < count; i--) {
      if (!taken.includes(entries[i])) {
        taken.push(entries[i]);
      }
    }
    const out: { position: Vector3; rotationY: number }[] = [];
    for (const [index, card] of taken) {
      const group = card.getGroup();
      const position = new Vector3();
      group.getWorldPosition(position);
      out.push({ position, rotationY: Math.PI });
      gsap.killTweensOf(group.position);
      group.removeFromParent();
      if (this.r3fDeclarativeHand) {
        this.pendingR3fHandDisposals.push(card);
      } else {
        card.dispose();
      }
      this.opponentHandCards.delete(index);
    }
    this.repositionOpponentRow();
    return out;
  }

  private repositionOpponentRow(): void {
    const entries = [...this.opponentHandCards.entries()].sort((a, b) => a[0] - b[0]);
    const total = entries.length;
    const next = new Map<number, Board3dCard>();
    entries.forEach(([, card], i) => {
      const group = card.getGroup();
      next.set(i, card);
      group.userData.handIndex = i;
      if (group.parent !== this.opponentHandGroup) {
        return;
      }
      const target = this.calculateCardPosition(i, total);
      gsap.killTweensOf(group.position);
      gsap.to(group.position, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: HAND_SETTLE_DURATION_SEC,
        ease: 'power2.out',
      });
    });
    this.opponentHandCards = next;
  }

  /** Remove near-hand cards that left without a flight (e.g. played to the board by an effect). */
  removeHandCardsById(cardIds: readonly number[]): void {
    if (cardIds.length === 0) {
      return;
    }
    const remove = new Set(cardIds);
    let removed = false;
    for (const [index, card] of [...this.handCards.entries()]) {
      const group = card.getGroup();
      const id = group.userData.cardData?.id as number | undefined;
      if (id == null || !remove.has(id)) {
        continue;
      }
      gsap.killTweensOf(group.position);
      group.removeFromParent();
      if (this.r3fDeclarativeHand) {
        this.pendingR3fHandDisposals.push(card);
      } else {
        card.dispose();
      }
      this.handCards.delete(index);
      removed = true;
    }
    if (removed) {
      this.repositionRemainingCards();
    }
  }

  getHandCardIds(): number[] {
    return this.getHandSlotSnapshots()
      .map((s) => s.cardId)
      .filter((id): id is number => id !== undefined);
  }

  private async waitUntilIdle(): Promise<void> {
    while (this.isUpdating) {
      await new Promise<void>((r) => setTimeout(r, 16));
    }
  }

  /**
   * At the edge-on midpoint of a Z-axis flip: put the scan on the mesh "back" material so the second half of the turn
   * exposes the card face (material slots are fixed; which side faces the camera changes with rotation).
   */
  revealDrawFlightFace(cardGroup: Object3D): void {
    const bc = cardGroup.userData.drawBoard3dCard as Board3dCard | undefined;
    const scan = cardGroup.userData.drawRevealFrontTexture;
    const cardBack = cardGroup.userData.drawRevealBackTexture;
    const mask = cardGroup.userData.drawRevealMaskTexture;
    if (bc && scan && cardBack !== undefined && mask !== undefined) {
      bc.updateTexture(cardBack, scan, mask);
      bc.setHolo(null);
    }
  }

  /**
   * Create a single hand card in arc formation
   */
  private async createHandCard(
    card: Card,
    index: number,
    totalCards: number,
    isOwner: boolean,
    isPlayable?: boolean,
    hand?: CardList,
    deferProgressiveFrontLoad = false,
    addToHandGroup = true,
    layoutVisualIndex?: number,
    forOpponent = false,
  ): Promise<void> {
    const positionIndex = layoutVisualIndex ?? index;
    const position = this.calculateCardPosition(positionIndex, totalCards);
    const rotation = 0; // No rotation - cards face forward

    // Load texture (checks artworksMap for overrides first, like 2D components do)
    const scanUrl = this.cardsAdapter.getScanUrlFor3D(card, hand);
    const isFaceDown = !isOwner;
    const hasScan = !!(scanUrl && scanUrl.trim());
    const cardMap = forOpponent ? this.opponentHandCards : this.handCards;
    const targetGroup = forOpponent ? this.opponentHandGroup : this.handGroup;

    // Progressive loading: show sleeve/card-back immediately, load front texture in background
    const [backTexture, maskTexture] = await Promise.all([
      this.loadHandBackTexture(hand),
      this.assetLoader.loadCardMaskTexture()
    ]);

    let frontTexture: Texture;
    let awaitingHandScan = false;
    if (isFaceDown) {
      frontTexture = backTexture;
    } else {
      const placeholder = await this.assetLoader.loadCardBack();
      if (hasScan && !deferProgressiveFrontLoad) {
        const cached = this.assetLoader.getCardTextureIfCached(scanUrl);
        if (cached) {
          frontTexture = cached;
        } else {
          frontTexture = placeholder;
          awaitingHandScan = true;
          this.assetLoader.loadCardTexture(scanUrl).then(loadedFront => {
            const handCard = cardMap.get(index);
            if (handCard && handCard.getGroup().userData.cardData?.id === card.id) {
              handCard.updateTexture(loadedFront, backTexture, maskTexture);
              void apply3dCardHolo(this.assetLoader, handCard, card, false);
            }
          }).catch(() => { });
        }
      } else {
        frontTexture = placeholder;
        if (!hasScan) {
          console.warn('Empty scanUrl for hand card:', card?.fullName, 'set:', card?.set, 'setNumber:', card?.setNumber);
        }
      }
    }

    // Create card mesh with smaller scale
    const cardMesh = new Board3dCard(
      frontTexture,
      backTexture,
      position,
      rotation,
      1.1, // Smaller size
      maskTexture
    );

    // Ensure card is completely flat like the deck (no rotation on any axis)
    const cardGroup = cardMesh.getGroup();
    cardGroup.rotation.x = 0;
    cardGroup.rotation.y = 0;
    cardGroup.rotation.z = 0;

    // Store metadata — opponent cards must not set isHandCard (drag/selection).
    if (forOpponent) {
      cardGroup.userData.isOpponentHandCard = true;
      cardGroup.userData.handIndex = index;
      cardGroup.userData.cardData = card;
    } else {
      cardGroup.userData.isHandCard = true;
      cardGroup.userData.handIndex = index;
      cardGroup.userData.cardData = card;
    }

    // Add green outline for playable cards (matches 2D board's green-400 color)
    if (isPlayable && !forOpponent) {
      cardMesh.setOutline(true, 0x4ade80);
    }

    if (addToHandGroup && !this.r3fDeclarativeHand) {
      targetGroup.add(cardMesh.getGroup());
    }
    cardMap.set(index, cardMesh);

    if (isFaceDown) {
      void apply3dCardHolo(this.assetLoader, cardMesh, card, true);
    } else if (awaitingHandScan || (hasScan && deferProgressiveFrontLoad)) {
      cardMesh.setHolo(null);
    } else if (hasScan) {
      void apply3dCardHolo(this.assetLoader, cardMesh, card, false);
    } else {
      void apply3dCardHolo(this.assetLoader, cardMesh, card, true);
    }
  }

  /**
   * World position for a hand slot (final layout uses full hand size).
   */
  getHandSlotWorld(index: number, totalCards: number): Vector3 {
    const local = this.calculateCardPosition(index, totalCards);
    const w = local.clone();
    this.handGroup.localToWorld(w);
    return w;
  }

  /** Sleeve texture when the hand list has sleeveImagePath; otherwise default cardback. */
  private async loadHandBackTexture(hand?: CardList): Promise<Texture> {
    const path = (hand as { sleeveImagePath?: string } | undefined)?.sleeveImagePath;
    const url = path ? this.cardsAdapter.getSleeveUrl(path) : undefined;
    if (url) {
      return this.assetLoader.loadSleeveTexture(url);
    }
    return this.assetLoader.loadCardBack();
  }

  /**
   * Calculate 3D position for card in straight line
   */
  private calculateCardPosition(index: number, totalCards: number): Vector3 {
    // Center the row of cards
    const totalWidth = (totalCards - 1) * this.cardSpacing;
    const startX = -totalWidth / 2;
    const x = startX + (index * this.cardSpacing);
    const y = 0;
    const z = 0;

    return new Vector3(x, y, z);
  }

  /**
   * Clear all hand cards
   */
  private clearHand(_attachRoot?: Object3D): void {
    if (this.r3fDeclarativeHand) {
      this.handCards.forEach(card => {
        const cardGroup = card.getGroup();
        gsap.killTweensOf(cardGroup.position);
        gsap.killTweensOf(cardGroup.rotation);
        gsap.killTweensOf(cardGroup.scale);
        this.pendingR3fHandDisposals.push(card);
      });
      this.handCards.clear();
      return;
    }

    this.handCards.forEach(card => {
      const cardGroup = card.getGroup();

      // Kill all animations before disposing
      gsap.killTweensOf(cardGroup.position);
      gsap.killTweensOf(cardGroup.rotation);
      gsap.killTweensOf(cardGroup.scale);

      // Check if card is actually in handGroup before removing
      if (cardGroup.parent === this.handGroup) {
        this.handGroup.remove(cardGroup);
      } else if (cardGroup.parent) {
        cardGroup.removeFromParent();
      }

      card.dispose();
    });
    this.handCards.clear();
  }

  private clearOpponentHand(): void {
    this.opponentHandCards.forEach(card => {
      const cardGroup = card.getGroup();
      gsap.killTweensOf(cardGroup.position);
      gsap.killTweensOf(cardGroup.rotation);
      gsap.killTweensOf(cardGroup.scale);

      if (cardGroup.parent === this.opponentHandGroup) {
        this.opponentHandGroup.remove(cardGroup);
      } else if (cardGroup.parent) {
        cardGroup.removeFromParent();
      }

      if (this.r3fDeclarativeHand) {
        this.pendingR3fHandDisposals.push(card);
      } else {
        card.dispose();
      }
    });
    this.opponentHandCards.clear();
  }

  /**
   * Remove a specific card by index (after it's played)
   */
  removeCard(index: number): void {
    const card = this.handCards.get(index);
    if (card) {
      const cardGroup = card.getGroup();

      // Kill animations before removing
      gsap.killTweensOf(cardGroup.position);
      gsap.killTweensOf(cardGroup.rotation);
      gsap.killTweensOf(cardGroup.scale);

      // Check if card is actually in handGroup before removing
      if (cardGroup.parent === this.handGroup) {
        this.handGroup.remove(cardGroup);
      } else if (cardGroup.parent) {
        cardGroup.parent.remove(cardGroup);
      }

      if (this.r3fDeclarativeHand) {
        this.pendingR3fHandDisposals.push(card);
      } else {
        card.dispose();
      }
      this.handCards.delete(index);

      // Reposition remaining cards to re-center the hand
      this.repositionRemainingCards();
    }
  }

  /**
   * Detach a hand card to the scene for a play animation without disposing it.
   * Caller must dispose the Board3dCard after the animation (or on play failure, call syncHand).
   */
  /**
   * Detach a hand card by id for a discard-pile flight (sequential hand → discard animations).
   */
  detachHandCardForDiscardFlight(cardId: number, attachRoot: Object3D): Board3dCard | null {
    let foundIndex = -1;
    let board3d: Board3dCard | undefined;
    for (const [idx, card] of this.handCards.entries()) {
      const data = card.getGroup().userData.cardData as Card | undefined;
      if (data?.id === cardId) {
        foundIndex = idx;
        board3d = card;
        break;
      }
    }
    if (foundIndex < 0 || !board3d) {
      return null;
    }

    const cardGroup = board3d.getGroup();
    gsap.killTweensOf(cardGroup.position);
    gsap.killTweensOf(cardGroup.rotation);
    gsap.killTweensOf(cardGroup.scale);

    attachRoot.attach(cardGroup);
    cardGroup.userData.isHandCard = false;
    cardGroup.userData.discardingFromHand = true;
    delete cardGroup.userData.handIndex;

    this.handCards.delete(foundIndex);
    this.repositionRemainingCards();
    return board3d;
  }

  detachCardForBoardPlay(index: number, attachRoot: Object3D): Board3dCard | null {
    const board3d = this.handCards.get(index);
    if (!board3d) {
      return null;
    }
    const cardGroup = board3d.getGroup();

    gsap.killTweensOf(cardGroup.position);
    gsap.killTweensOf(cardGroup.rotation);
    gsap.killTweensOf(cardGroup.scale);

    attachRoot.attach(cardGroup);
    cardGroup.userData.isHandCard = false;
    cardGroup.userData.playingToBoard = true;
    // Keep original server hand index for failed-play return / playCardAction.
    cardGroup.userData.handIndex = index;
    cardGroup.userData.detachedFromHandIndex = index;

    this.handCards.delete(index);
    this.repositionRemainingCards();
    return board3d;
  }

  /**
   * Smoothly return a card detached via {@link detachCardForBoardPlay} after the server rejects the play.
   * Restores server hand indices (undoes the visual reindex from detach).
   */
  returnDetachedCardToHand(
    board3dCard: Board3dCard,
    handIndex: number,
    options?: { isPlayable?: boolean },
  ): Promise<void> {
    const cardGroup = board3dCard.getGroup();
    gsap.killTweensOf(cardGroup.position);
    gsap.killTweensOf(cardGroup.rotation);
    gsap.killTweensOf(cardGroup.scale);

    delete cardGroup.userData.playingToBoard;
    delete cardGroup.userData.detachedFromHandIndex;
    cardGroup.userData.isHandCard = true;
    cardGroup.userData.handIndex = handIndex;

    const remapped = new Map<number, Board3dCard>();
    for (const [visualIdx, card] of this.handCards.entries()) {
      const serverIdx = visualIdx < handIndex ? visualIdx : visualIdx + 1;
      remapped.set(serverIdx, card);
      card.getGroup().userData.handIndex = serverIdx;
    }
    remapped.set(handIndex, board3dCard);
    this.handCards = remapped;

    const total = this.handCards.size;
    const handScale = 1.1;

    // Preserve world transform while re-parenting into the hand fan.
    this.handGroup.attach(cardGroup);

    if (options?.isPlayable) {
      board3dCard.setOutline(true, 0x4ade80);
    } else {
      board3dCard.setOutline(false);
    }

    const cardData = cardGroup.userData.cardData as Card | undefined;
    if (cardData) {
      void apply3dCardHolo(this.assetLoader, board3dCard, cardData, false);
    }

    const animations: Promise<void>[] = [];
    for (const [idx, card] of this.handCards.entries()) {
      const group = card.getGroup();
      if (group.parent !== this.handGroup) {
        continue;
      }
      gsap.killTweensOf(group.position);
      const target = this.calculateCardPosition(idx, total);
      const isReturning = idx === handIndex;
      const duration = isReturning ? 0.4 : 0.25;
      animations.push(
        new Promise<void>((resolve) => {
          gsap.to(group.position, {
            x: target.x,
            y: target.y,
            z: target.z,
            duration,
            ease: 'power2.out',
            onComplete: () => resolve(),
          });
        }),
      );
      if (isReturning) {
        gsap.to(group.rotation, {
          x: 0,
          y: 0,
          z: 0,
          duration,
          ease: 'power2.out',
        });
        gsap.to(group.scale, {
          x: handScale,
          y: handScale,
          z: handScale,
          duration,
          ease: 'power2.out',
        });
      }
    }

    return Promise.all(animations).then(() => undefined);
  }

  /**
   * Lift a hand card for setup placement animation without reindexing remaining cards
   * (server hand indices stay stable until the prompt is confirmed).
   */
  liftHandCardForSetupAnimation(index: number, attachRoot: Object3D): Board3dCard | null {
    const board3d = this.handCards.get(index);
    if (!board3d) {
      return null;
    }
    const cardGroup = board3d.getGroup();

    gsap.killTweensOf(cardGroup.position);
    gsap.killTweensOf(cardGroup.rotation);
    gsap.killTweensOf(cardGroup.scale);

    attachRoot.attach(cardGroup);
    cardGroup.userData.isHandCard = false;
    cardGroup.userData.setupPlacementInFlight = true;

    this.handCards.delete(index);
    return board3d;
  }

  /**
   * Compact remaining hand cards visually while preserving server handIndex in userData.
   */
  repositionSetupHandVisuals(): void {
    const remaining = Array.from(this.handCards.entries()).sort((a, b) => a[0] - b[0]);
    const totalVisible = remaining.length;
    if (totalVisible === 0) {
      return;
    }

    remaining.forEach(([, card], visualIndex) => {
      const cardGroup = card.getGroup();
      if (cardGroup.parent !== this.handGroup) {
        return;
      }

      gsap.killTweensOf(cardGroup.position);
      const newPosition = this.calculateCardPosition(visualIndex, totalVisible);
      gsap.to(cardGroup.position, {
        x: newPosition.x,
        y: newPosition.y,
        z: newPosition.z,
        duration: 0.25,
        ease: 'power2.out',
      });
    });
  }

  getHandCardEntries(): ReadonlyArray<readonly [number, Board3dCard]> {
    return Array.from(this.handCards.entries()).sort((a, b) => a[0] - b[0]);
  }

  /**
   * Reposition remaining cards after one is removed
   */
  private repositionRemainingCards(): void {
    const cards = Array.from(this.handCards.entries());
    const totalCards = cards.length;

    if (totalCards === 0) return;

    // Sort by current index to maintain order
    cards.sort((a, b) => a[0] - b[0]);

    // Animate each card to its new position and update indices
    const newMap = new Map<number, Board3dCard>();
    cards.forEach(([oldIndex, card], newIndex) => {
      const cardGroup = card.getGroup();

      // Ensure card is still in handGroup before repositioning
      if (cardGroup.parent !== this.handGroup) {
        // Skip cards that are not in handGroup (e.g., being dragged)
        newMap.set(newIndex, card);
        return;
      }

      // Kill existing animations before starting new ones
      gsap.killTweensOf(cardGroup.position);

      const newPosition = this.calculateCardPosition(newIndex, totalCards);

      // Animate to new position
      gsap.to(cardGroup.position, {
        x: newPosition.x,
        y: newPosition.y,
        z: newPosition.z,
        duration: 0.2,
        ease: 'power2.out'
      });

      // Update the hand index in userData
      cardGroup.userData.handIndex = newIndex;

      // Add to new map with new index
      newMap.set(newIndex, card);
    });

    // Replace the old map with the new one
    this.handCards = newMap;
  }

  getHandSlotSnapshots(): Board3dHandSlotSnapshot[] {
    return Array.from(this.handCards.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([handIndex, bridgeRef]) => ({
        handIndex,
        cardId: bridgeRef.getGroup().userData.cardData?.id,
        bridgeRef,
      }));
  }

  /**
   * Get hand group for adding to scene
   */
  getHandGroup(): Group {
    return this.handGroup;
  }

  /** Far-player hand row group (non-interactive). */
  getOpponentHandGroup(): Group {
    return this.opponentHandGroup;
  }

  /**
   * Get card at hand index
   */
  getCardAtIndex(index: number): Board3dCard | undefined {
    return this.handCards.get(index);
  }

  /**
   * Dispose all resources and reset for next use
   */
  dispose(attachRoot: Object3D): void {
    this.clearHand(attachRoot);
    this.clearOpponentHand();
    this.drainPendingR3fHandDisposals();
    if (attachRoot.children.includes(this.handGroup)) {
      attachRoot.remove(this.handGroup);
    }
    if (attachRoot.children.includes(this.opponentHandGroup)) {
      attachRoot.remove(this.opponentHandGroup);
    }

    // Recreate hand groups for next component instance
    this.handGroup = new Group();
    this.handGroup.position.set(0, BOARD3D_HAND_Y, BOARD3D_PLAYER_HAND_Z);
    this.handGroup.rotation.set(0, 0, 0);
    this.opponentHandGroup = new Group();
    this.opponentHandGroup.position.set(0, BOARD3D_HAND_Y, BOARD3D_OPPONENT_HAND_Z);
    this.opponentHandGroup.rotation.set(0, Math.PI, 0);
    this.isUpdating = false;
    this.isUpdatingOpponent = false;
    const pending = this.pendingHandUpdate;
    this.pendingHandUpdate = null;
    pending?.resolvers.forEach((resolve) => resolve());
  }
}
