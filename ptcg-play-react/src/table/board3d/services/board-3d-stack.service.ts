import {
  Object3D,
  Vector3,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Euler,
  Texture,
  Group,
} from 'three';
import { CardList } from 'ptcg-server';
import { Board3dCard } from '../board-3d-card';
import { getBoard3dCardGeometry } from '../board3dCardShared';
import { Board3dAssetLoaderService } from './board-3d-asset-loader.service';
import type { Board3dCardsAdapter } from '../board3dCardsAdapter';
import { BOARD3D_DECK_BULK_VISUAL_UD } from '../board3d-constants';

/** Metadata so discard/LZ InstancedMeshes can skip rebuild when unchanged. */
type InstancedStackMeta = {
  remainingCount: number;
  rotation: number;
  posX: number;
  posY: number;
  posZ: number;
};

// Callback type for updating cards (to avoid circular dependency)
export type UpdateCardCallback = (
  cardList: CardList,
  cardId: string,
  position: Vector3,
  isOwner: boolean,
  rotation: number,
  cardTarget?: any,
  scale?: number,
  sleeveImagePath?: string,
  revealPrize?: boolean,
) => Promise<void>;

// Callback type for getting cards by ID
export type GetCardByIdCallback = (cardId: string) => any;

// Callback type for removing cards (to avoid circular dependency)
export type RemoveCardCallback = (cardId: string) => void;

export class Board3dStackService {
  /** Vertical spacing between cards in stack (discard/deck instanced layers). */
  public static readonly STACK_HEIGHT_INCREMENT = 0.015;
  private static readonly LOST_ZONE_HEIGHT_OFFSET = 0.1; // Y offset to render Lost Zone cards above other cards
  /** Face-down deck layers under anchor (indices 0 .. cardCount-2); not in cardsMap. */
  private deckBulkMeshes: Map<string, Board3dCard[]> = new Map();
  /** Parent group at deck base world position; bulk cards are children for shuffle pivot. */
  private deckAnchors: Map<string, Group> = new Map();
  /** Normalized sleeve key last used per deck stack (invalidate bulk textures on change). */
  private deckSleeveKey: Map<string, string> = new Map();
  private discardStacks: Map<string, InstancedMesh> = new Map();
  private lostZoneStacks: Map<string, InstancedMesh> = new Map();
  private discardStackMeta: Map<string, InstancedStackMeta> = new Map();
  private lostZoneStackMeta: Map<string, InstancedStackMeta> = new Map();

  constructor(
    private assetLoader: Board3dAssetLoaderService,
    private cardsAdapter: Board3dCardsAdapter
  ) { }

  /**
   * Remove an InstancedMesh that shares {@link getBoard3dCardGeometry}.
   * Must not dispose the shared geometry — only the per-stack material.
   */
  private disposeInstancedStack(mesh: InstancedMesh, attachRoot: Object3D): void {
    attachRoot.remove(mesh);
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((m) => m.dispose());
    } else {
      (material as MeshStandardMaterial).dispose();
    }
  }

  private instancedMetaMatches(
    meta: InstancedStackMeta | undefined,
    remainingCount: number,
    rotation: number,
    position: Vector3,
  ): boolean {
    if (!meta) {
      return false;
    }
    return (
      meta.remainingCount === remainingCount &&
      meta.rotation === rotation &&
      meta.posX === position.x &&
      meta.posY === position.y &&
      meta.posZ === position.z
    );
  }

  private async buildFaceDownInstancedStack(
    remainingCount: number,
    position: Vector3,
    rotation: number,
    yOffset: number,
  ): Promise<InstancedMesh> {
    const cardBackTexture = await this.assetLoader.loadCardBack();
    const geometry = getBoard3dCardGeometry();
    const instanceCount = Math.min(remainingCount, 60);
    const instancedMesh = new InstancedMesh(
      geometry,
      new MeshStandardMaterial({ map: cardBackTexture }),
      instanceCount,
    );

    const rotationRad = (rotation * Math.PI) / 180;
    const quaternion = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, rotationRad, 0, 'XYZ'));

    for (let i = 0; i < instanceCount; i++) {
      const matrix = new Matrix4();
      const pos = new Vector3(
        position.x,
        position.y + yOffset + i * Board3dStackService.STACK_HEIGHT_INCREMENT,
        position.z,
      );
      matrix.compose(pos, quaternion, new Vector3(1, 1, 1));
      instancedMesh.setMatrixAt(i, matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.castShadow = true;
    return instancedMesh;
  }

  getDeckAnchor(stackId: string): Group | undefined {
    return this.deckAnchors.get(stackId);
  }

  getDeckStackIds(): string[] {
    return Array.from(this.deckAnchors.keys());
  }

  /** Iterate deck anchors (for cleanup without touching discard stacks). */
  forEachDeckStackId(cb: (stackId: string) => void): void {
    for (const id of this.deckAnchors.keys()) {
      cb(id);
    }
  }

  /** Iterate discard instanced stack ids (bulk under top mesh). */
  forEachDiscardStackId(cb: (stackId: string) => void): void {
    for (const id of this.discardStacks.keys()) {
      cb(id);
    }
  }

  /** Iterate Lost Zone instanced stack ids (bulk under top mesh). */
  forEachLostZoneStackId(cb: (stackId: string) => void): void {
    for (const id of this.lostZoneStacks.keys()) {
      cb(id);
    }
  }

  /** Bulk deck card groups under the anchor (bottom → top−1), for shuffle animation. */
  getDeckBulkGroups(stackId: string): Group[] {
    const arr = this.deckBulkMeshes.get(stackId);
    if (!arr || arr.length === 0) {
      return [];
    }
    return arr.map((c) => c.getGroup());
  }

  private disposeDeckAt(stackId: string, attachRoot: Object3D): void {
    const bulkArr = this.deckBulkMeshes.get(stackId);
    if (bulkArr) {
      for (const c of bulkArr) {
        c.dispose();
      }
      this.deckBulkMeshes.delete(stackId);
    }
    const anchor = this.deckAnchors.get(stackId);
    if (anchor) {
      attachRoot.remove(anchor);
    }
    this.deckAnchors.delete(stackId);
    this.deckSleeveKey.delete(stackId);
  }

  /**
   * Update or create a deck stack: real face-down {@link Board3dCard} per slot under deck anchor,
   * plus clickable `{stackId}_top` via {@link UpdateCardCallback}.
   */
  async updateDeckStack(
    stackId: string,
    cardCount: number,
    position: Vector3,
    rotation: number,
    attachRoot: Object3D,
    sleeveImagePath: string | undefined,
    deckCardList: CardList,
    updateCardCallback: UpdateCardCallback,
    getCardByIdCallback: GetCardByIdCallback
  ): Promise<void> {
    const bulkNeeded = Math.max(0, cardCount - 1);
    const sleeveKey = sleeveImagePath ?? '';

    let anchor = this.deckAnchors.get(stackId);
    let bulkArr = this.deckBulkMeshes.get(stackId);
    const prevSleeve = this.deckSleeveKey.get(stackId);
    const sleeveChanged = prevSleeve !== undefined && prevSleeve !== sleeveKey;

    if (!anchor) {
      anchor = new Group();
      anchor.userData.deckStackId = stackId;
      attachRoot.add(anchor);
      this.deckAnchors.set(stackId, anchor);
      bulkArr = [];
      this.deckBulkMeshes.set(stackId, bulkArr);
    }

    anchor.position.copy(position);

    if (!bulkArr) {
      bulkArr = [];
      this.deckBulkMeshes.set(stackId, bulkArr);
    }

    if (sleeveChanged && bulkArr.length > 0) {
      while (bulkArr.length > 0) {
        const c = bulkArr.pop()!;
        c.dispose();
      }
    }

    this.deckSleeveKey.set(stackId, sleeveKey);

    bulkArr = this.deckBulkMeshes.get(stackId)!;

    let cardBackTexture: Texture | undefined;
    let maskTexture: Texture | undefined;
    if (bulkNeeded > 0) {
      if (sleeveImagePath) {
        const sleeveUrl = this.cardsAdapter.getSleeveUrl(sleeveImagePath);
        if (sleeveUrl) {
          cardBackTexture = await this.assetLoader.loadSleeveTexture(sleeveUrl);
        } else {
          cardBackTexture = await this.assetLoader.loadCardBack();
        }
      } else {
        cardBackTexture = await this.assetLoader.loadCardBack();
      }
      maskTexture = await this.assetLoader.loadCardMaskTexture();
    }

    while (bulkArr.length > bulkNeeded) {
      const c = bulkArr.pop()!;
      c.dispose();
    }

    while (bulkArr.length < bulkNeeded) {
      const i = bulkArr.length;
      const boardCard = new Board3dCard(
        cardBackTexture!,
        cardBackTexture!,
        new Vector3(0, i * Board3dStackService.STACK_HEIGHT_INCREMENT, 0),
        rotation,
        1,
        maskTexture,
      );
      const g = boardCard.getGroup();
      g.userData[BOARD3D_DECK_BULK_VISUAL_UD] = true;
      anchor.add(g);
      if (rotation === 180) {
        g.rotation.z = Math.PI;
      }
      bulkArr.push(boardCard);
    }

    for (let i = 0; i < bulkArr.length; i++) {
      const boardCard = bulkArr[i];
      const g = boardCard.getGroup();
      boardCard.setPosition(new Vector3(0, i * Board3dStackService.STACK_HEIGHT_INCREMENT, 0));
      boardCard.setRotation(rotation);
      if (rotation === 180) {
        g.rotation.z = Math.PI;
      } else {
        g.rotation.z = 0;
      }
    }

    // Create clickable top card overlay (face-down)
    if (cardCount > 0 && deckCardList) {
      const topCardId = `${stackId}_top`;
      const topCard = deckCardList.cards[deckCardList.cards.length - 1]; // Latest card
      const topCardList = new CardList();
      topCardList.cards = [topCard];
      topCardList.isPublic = deckCardList.isPublic;
      topCardList.isSecret = deckCardList.isSecret;

      await updateCardCallback(
        topCardList,
        topCardId,
        new Vector3(position.x, position.y + ((cardCount - 1) * Board3dStackService.STACK_HEIGHT_INCREMENT), position.z),
        false, // Not owner - ensures face-down
        rotation,
        undefined, // No cardTarget
        1.0,
        sleeveImagePath
      );

      // Mark top card as deck for click detection and set full deck CardList
      const topCardMesh = getCardByIdCallback(topCardId);
      if (topCardMesh) {
        topCardMesh.getGroup().userData.isDeck = true;
        topCardMesh.getGroup().userData.cardList = deckCardList; // Set full deck CardList, not just single card
        // Top player (rotation=180): add 180° on Z so face-down card back matches other top player cards
        if (rotation === 180) {
          topCardMesh.getGroup().rotation.z = Math.PI;
        }
      }
    }
  }

  /**
   * Update or create a discard stack using instanced rendering
   * Latest card (last in array) is shown on top as a regular clickable card
   */
  async updateDiscardStack(
    discard: CardList,
    stackId: string,
    position: Vector3,
    rotation: number,
    attachRoot: Object3D,
    updateCardCallback: UpdateCardCallback,
    getCardByIdCallback: GetCardByIdCallback
  ): Promise<void> {
    const cardCount = discard.cards.length;
    if (cardCount === 0) {
      const oldStack = this.discardStacks.get(stackId);
      if (oldStack) {
        this.disposeInstancedStack(oldStack, attachRoot);
        this.discardStacks.delete(stackId);
      }
      this.discardStackMeta.delete(stackId);
      return;
    }

    // Latest card (last in array) is the top card - render as regular clickable card
    const topCard = discard.cards[cardCount - 1];
    const topCardId = `${stackId}_top`;

    // Create top card as regular card for clickability
    const topCardList = new CardList();
    topCardList.cards = [topCard];
    topCardList.isPublic = discard.isPublic;
    topCardList.isSecret = discard.isSecret;

    await updateCardCallback(
      topCardList,
      topCardId,
      new Vector3(position.x, position.y + ((cardCount - 1) * Board3dStackService.STACK_HEIGHT_INCREMENT), position.z),
      true, // Always visible
      rotation,
      undefined, // No cardTarget
      1.0,
      undefined // No sleeve for discard
    );

    // Mark top card as discard for click detection
    const topCardMesh = getCardByIdCallback(topCardId);
    if (topCardMesh) {
      topCardMesh.getGroup().userData.isDiscard = true;
      topCardMesh.getGroup().userData.cardList = discard;
      // Set render order to ensure top card is above instanced stack mesh
      topCardMesh.getGroup().renderOrder = 100;
      topCardMesh.getMesh().renderOrder = 100;
    }

    const remainingCount = Math.max(0, cardCount - 1);
    const prevMeta = this.discardStackMeta.get(stackId);
    if (
      remainingCount > 0 &&
      this.discardStacks.has(stackId) &&
      this.instancedMetaMatches(prevMeta, remainingCount, rotation, position)
    ) {
      return;
    }

    const oldStack = this.discardStacks.get(stackId);
    if (oldStack) {
      this.disposeInstancedStack(oldStack, attachRoot);
      this.discardStacks.delete(stackId);
    }
    this.discardStackMeta.delete(stackId);

    if (remainingCount > 0) {
      const instancedMesh = await this.buildFaceDownInstancedStack(
        remainingCount,
        position,
        rotation,
        0,
      );
      attachRoot.add(instancedMesh);
      this.discardStacks.set(stackId, instancedMesh);
      this.discardStackMeta.set(stackId, {
        remainingCount,
        rotation,
        posX: position.x,
        posY: position.y,
        posZ: position.z,
      });
    }
  }

  /**
   * Update or create a Lost Zone stack using instanced rendering
   * Latest card (last in array) is shown on top as a regular clickable card
   */
  async updateLostZoneStack(
    lostZone: CardList,
    stackId: string,
    position: Vector3,
    rotation: number,
    attachRoot: Object3D,
    isOwner: boolean,
    updateCardCallback: UpdateCardCallback,
    getCardByIdCallback: GetCardByIdCallback,
    removeCardCallback: RemoveCardCallback
  ): Promise<void> {
    const cardCount = lostZone.cards.length;
    if (cardCount === 0) {
      const oldStack = this.lostZoneStacks.get(stackId);
      if (oldStack) {
        this.disposeInstancedStack(oldStack, attachRoot);
        this.lostZoneStacks.delete(stackId);
      }
      this.lostZoneStackMeta.delete(stackId);
      return;
    }

    // Latest card (last in array) is the top card - render as regular clickable card
    const topCard = lostZone.cards[cardCount - 1];
    const topCardId = `${stackId}_top`;

    // Remove old top card before re-adding to prevent double rendering
    const existingTopCard = getCardByIdCallback(topCardId);
    if (existingTopCard) {
      removeCardCallback(topCardId);
    }

    // Create top card as regular card for clickability
    const topCardList = new CardList();
    topCardList.cards = [topCard];
    topCardList.isPublic = lostZone.isPublic;
    topCardList.isSecret = lostZone.isSecret;

    await updateCardCallback(
      topCardList,
      topCardId,
      new Vector3(position.x, position.y + Board3dStackService.LOST_ZONE_HEIGHT_OFFSET + ((cardCount - 1) * Board3dStackService.STACK_HEIGHT_INCREMENT), position.z),
      isOwner,
      rotation,
      undefined, // No cardTarget
      1.0,
      undefined // No sleeve for Lost Zone
    );

    // Mark top card as Lost Zone for click detection
    const topCardMesh = getCardByIdCallback(topCardId);
    if (topCardMesh) {
      topCardMesh.getGroup().userData.isLostZone = true;
      topCardMesh.getGroup().userData.cardList = lostZone;
      topCardMesh.getGroup().renderOrder = 100;
      topCardMesh.getMesh().renderOrder = 100;
    }

    const remainingCount = Math.max(0, cardCount - 1);
    const prevMeta = this.lostZoneStackMeta.get(stackId);
    if (
      remainingCount > 0 &&
      this.lostZoneStacks.has(stackId) &&
      this.instancedMetaMatches(prevMeta, remainingCount, rotation, position)
    ) {
      return;
    }

    const oldStack = this.lostZoneStacks.get(stackId);
    if (oldStack) {
      this.disposeInstancedStack(oldStack, attachRoot);
      this.lostZoneStacks.delete(stackId);
    }
    this.lostZoneStackMeta.delete(stackId);

    if (remainingCount > 0) {
      const instancedMesh = await this.buildFaceDownInstancedStack(
        remainingCount,
        position,
        rotation,
        Board3dStackService.LOST_ZONE_HEIGHT_OFFSET,
      );
      attachRoot.add(instancedMesh);
      this.lostZoneStacks.set(stackId, instancedMesh);
      this.lostZoneStackMeta.set(stackId, {
        remainingCount,
        rotation,
        posX: position.x,
        posY: position.y,
        posZ: position.z,
      });
    }
  }

  /**
   * Remove a stack by ID
   */
  removeStack(stackId: string, attachRoot: Object3D, isDeck: boolean): void {
    if (isDeck) {
      this.disposeDeckAt(stackId, attachRoot);
      return;
    }
    const oldStack = this.discardStacks.get(stackId);
    if (oldStack) {
      this.disposeInstancedStack(oldStack, attachRoot);
      this.discardStacks.delete(stackId);
    }
    this.discardStackMeta.delete(stackId);
  }

  /**
   * Remove a Lost Zone stack by ID
   */
  removeLostZoneStack(stackId: string, attachRoot: Object3D): void {
    const oldStack = this.lostZoneStacks.get(stackId);
    if (oldStack) {
      this.disposeInstancedStack(oldStack, attachRoot);
      this.lostZoneStacks.delete(stackId);
    }
    this.lostZoneStackMeta.delete(stackId);
  }

  /**
   * Dispose all resources
   */
  dispose(scene: Object3D): void {
    // Clean up deck stacks
    this.deckAnchors.forEach((anchor, stackId) => {
      anchor.removeFromParent();
      const bulk = this.deckBulkMeshes.get(stackId);
      if (bulk) {
        for (const c of bulk) {
          c.dispose();
        }
      }
    });
    this.deckAnchors.clear();
    this.deckBulkMeshes.clear();
    this.deckSleeveKey.clear();

    // Clean up discard stacks (shared geometry must not be disposed)
    this.discardStacks.forEach(stack => {
      this.disposeInstancedStack(stack, scene);
    });
    this.discardStacks.clear();
    this.discardStackMeta.clear();

    // Clean up Lost Zone stacks
    this.lostZoneStacks.forEach(stack => {
      this.disposeInstancedStack(stack, scene);
    });
    this.lostZoneStacks.clear();
    this.lostZoneStackMeta.clear();
  }
}
