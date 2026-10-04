import {
  Player,
  CardList,
  PlayerType,
  SlotType,
  PokemonCardList,
  CardTag,
  SuperType,
  Card,
  type CardTarget,
  type ChooseCardsPrompt,
} from 'ptcg-server';
import { Vector3, Scene, Object3D, PerspectiveCamera, Texture } from 'three';
import { Board3dCard } from '../board-3d-card';
import { Board3dAssetLoaderService } from './board-3d-asset-loader.service';
import type { LocalGameState } from '../../types/localGameState';
import type { Board3dCardsAdapter } from '../board3dCardsAdapter';
import { BoardInteractionService } from '../../BoardInteractionService';
import {
  getSetupPlaySlotForPickOrder,
  setupPreviewMeshId,
} from '../../prompts/chooseCardsHandSelection';
import { Board3dAnimationService } from './board-3d-animation.service';
import { Board3dCardOverlayService } from './board-3d-card-overlay.service';
import { Board3dStackService } from './board-3d-stack.service';
import { Board3dPrizeService } from './board-3d-prize.service';
import { ZONE_POSITIONS, getBenchPositions } from '../board-3d-zone-positions';
import { apply3dCardHolo } from '../board-3d-holo-apply';
import type {
  Board3dBoardCardSnapshot,
  Board3dHandSlotSnapshot,
  Board3dSceneModelSnapshot,
} from '../board3dSceneModel';
import { emptySceneModelSnapshot } from '../board3dSceneModel';
import { CARD_WIDTH } from '../board-3d-overlay-layout';
import {
  resolveDualStadiumDisplayHalves,
  SHARED_STADIUM_LEFT_MESH_ID,
  SHARED_STADIUM_MESH_ID,
  SHARED_STADIUM_MESH_IDS,
  SHARED_STADIUM_RIGHT_MESH_ID,
  isSharedStadiumMeshId,
} from '../dual-stadium.utils';

/**
 * Per-player zone contents to show instead of the raw game state while a transition's
 * flights are still landing (keyed by player id).
 */
export interface Board3dDisplayOverrides {
  /** Discard ids to show, in pile order. */
  discardIds?: ReadonlyMap<number, readonly number[]>;
  lostzoneIds?: ReadonlyMap<number, readonly number[]>;
  /** Card to show on the play zone even when the state no longer (or not yet) has it. */
  supporterCard?: ReadonlyMap<number, Card>;
  /** Hide the play zone until a trainer flight lands there. */
  hiddenSupporterPlayerIds?: ReadonlySet<number>;
  deckCount?: ReadonlyMap<number, number>;
  /**
   * Keep Active/Bench visually face-down during leave-setup reveal, even though
   * the server already cleared isSecret.
   */
  holdBoardFaceDown?: boolean;
}

export interface Board3dSyncStateOptions {
  skippedCardId?: string | null;
  skippedScaleCardId?: string | readonly string[] | null;
  handPlayFlightHiddenCardId?: string | readonly string[] | null;
  display?: Board3dDisplayOverrides;
  /** Admin spectator UI toggles for hidden zones (client-side display only). */
  adminSpectatorReveal?: {
    revealPrizes: boolean;
    revealHands: boolean;
  };
}

export class Board3dStateSyncService {
  private cardsMap: Map<string, Board3dCard> = new Map();

  private sceneModelSnapshot: Board3dSceneModelSnapshot = emptySceneModelSnapshot();
  private sceneModelListeners = new Set<() => void>();

  /** Deck/discard stacks and other non-React-managed meshes attach here. */
  private worldMount!: Object3D;
  /**
   * Board card groups: imperative adds when non-null (legacy); when null, React Three Fiber primitives parent groups.
   */
  private boardCardsMount: Object3D | null = null;
  private interactionScene!: Scene;
  private skippedCardIdForSync: string | null = null;
  private skippedScaleCardIdsForSync: ReadonlySet<string> | null = null;
  /** Hide these board meshes while a hand card animates (avoid double image at discard + supporter, etc.). */
  private handPlayFlightHiddenCardIds: ReadonlySet<string> | null = null;

  /** Cards removed while R3F owns the board subtree; dispose after React detaches primitives. */
  private pendingR3fBoardCardDisposals: Board3dCard[] = [];

  /** When set, Put damage prompt placement previews can be painted on Pokémon overlays. */
  private boardInteractionForDamagePreview: BoardInteractionService | null = null;

  /** Setup starting-Pokémon preview meshes (not part of live game state). */
  private setupPreviewMeshIds = new Set<string>();

  constructor(
    private assetLoader: Board3dAssetLoaderService,
    private cardsAdapter: Board3dCardsAdapter,
    _animationService: Board3dAnimationService,
    private overlayService: Board3dCardOverlayService,
    private stackService: Board3dStackService,
    private prizeService: Board3dPrizeService,
  ) {}

  /**
   * Call before {@link syncState} (and whenever the controller switches R3F vs legacy attachment).
   * @param worldMount Parent for stacks; hand attaches under the same subtree in the controller.
   * @param boardCardsMount When null, board cards are mounted only via React Three Fiber primitives.
   * @param interactionScene Full scene (e.g. for raycast / wireframe); used where a Scene reference is still required.
   */
  setAttachmentTargets(
    worldMount: Object3D,
    boardCardsMount: Object3D | null,
    interactionScene: Scene,
  ): void {
    this.worldMount = worldMount;
    this.boardCardsMount = boardCardsMount;
    this.interactionScene = interactionScene;
  }

  /**
   * Enables reading Put damage placement preview during {@link Board3dCardOverlayService#updateOverlays}.
   * Clear on board controller destroy.
   */
  setBoardInteractionForDamagePreview(interaction: BoardInteractionService | null): void {
    this.boardInteractionForDamagePreview = interaction;
  }

  getStackService(): Board3dStackService {
    return this.stackService;
  }

  getBoardCardMapEntries(): [string, Board3dCard][] {
    const byStringKey = new Map<string, Board3dCard>();
    for (const [k, card] of this.cardsMap) {
      byStringKey.set(String(k), card);
    }
    return Array.from(byStringKey.entries());
  }

  /** Latest immutable scene model for React (`useSyncExternalStore`). */
  getSceneModelSnapshot(): Board3dSceneModelSnapshot {
    return this.sceneModelSnapshot;
  }

  subscribeSceneModel(onStoreChange: () => void): () => void {
    this.sceneModelListeners.add(onStoreChange);
    return () => {
      this.sceneModelListeners.delete(onStoreChange);
    };
  }

  /**
   * Publish board cards from {@link cardsMap} plus hand slots (caller supplies hand from {@link Board3dHandService}).
   * Call after {@link syncState} (and after hand-only updates in R3F).
   */
  publishSceneModel(handSlots: Board3dHandSlotSnapshot[]): void {
    const boardCards: Board3dBoardCardSnapshot[] = [];
    for (const [meshId, bridgeRef] of this.getBoardCardMapEntries()) {
      const g = bridgeRef.getGroup();
      const ud = g.userData;
      boardCards.push({
        meshId,
        transform: {
          position: { x: g.position.x, y: g.position.y, z: g.position.z },
          rotationY: g.rotation.y,
          scale: g.scale.x,
        },
        cardTarget: ud.cardTarget,
        mainCardId: ud.cardData?.id,
        visibility: g.visible,
        faceDown: !!ud.isFaceDown,
        isBoardCard: !!ud.isBoardCard,
        isStadium: !!ud.isStadium,
        isPrize: !!ud.isPrize,
        bridgeRef,
      });
    }
    const nextVersion = this.sceneModelSnapshot.version + 1;
    this.sceneModelSnapshot = {
      version: nextVersion,
      boardCards,
      handSlots,
    };
    for (const l of this.sceneModelListeners) {
      l();
    }
  }

  /**
   * Synchronize the entire game state to the 3D scene
   * @param topPlayer Optional: When provided (e.g., in replay/spectator mode with switchSide), use this player directly for top position
   * @param bottomPlayer Optional: When provided (e.g., in replay/spectator mode with switchSide), use this player directly for bottom position
   */
  async syncState(
    gameState: LocalGameState,
    currentPlayerId: number,
    topPlayer?: Player,
    bottomPlayer?: Player,
    options: Board3dSyncStateOptions = {},
  ): Promise<void> {
    if (!gameState || !gameState.state) {
      return;
    }

    const {
      skippedCardId = null,
      skippedScaleCardId = null,
      handPlayFlightHiddenCardId = null,
      display = {},
      adminSpectatorReveal,
    } = options;

    this.skippedCardIdForSync = skippedCardId ?? null;
    if (skippedScaleCardId == null) {
      this.skippedScaleCardIdsForSync = null;
    } else if (typeof skippedScaleCardId === 'string') {
      this.skippedScaleCardIdsForSync = new Set([skippedScaleCardId]);
    } else {
      const next = new Set<string>();
      for (const id of skippedScaleCardId) {
        if (id) {
          next.add(id);
        }
      }
      this.skippedScaleCardIdsForSync = next.size > 0 ? next : null;
    }
    if (handPlayFlightHiddenCardId == null) {
      this.handPlayFlightHiddenCardIds = null;
    } else if (typeof handPlayFlightHiddenCardId === 'string') {
      this.handPlayFlightHiddenCardIds = new Set([handPlayFlightHiddenCardId]);
    } else {
      const next = new Set<string>();
      for (const id of handPlayFlightHiddenCardId) {
        if (id) {
          next.add(id);
        }
      }
      this.handPlayFlightHiddenCardIds = next.size > 0 ? next : null;
    }
    const state = gameState.state;

    // Use provided players if available (for replay/spectator mode with switchSide)
    // Otherwise, look up players by ID (normal gameplay)
    let bottomPlayerToSync: Player | undefined;
    let topPlayerToSync: Player | undefined;

    if (topPlayer && bottomPlayer) {
      // Use provided players directly (already swapped if switchSide is true)
      bottomPlayerToSync = bottomPlayer;
      topPlayerToSync = topPlayer;
    } else {
      // Fall back to ID lookup (normal gameplay)
      bottomPlayerToSync = state.players.find((p) => p.id === currentPlayerId);
      topPlayerToSync = state.players.find((p) => p.id !== currentPlayerId);
    }

    const omniscient = !!gameState.replay;
    const adminRevealPrizes = adminSpectatorReveal?.revealPrizes ?? false;

    // Clear old cards that no longer match the current player assignments
    this.cleanupOldCards(state, topPlayerToSync, bottomPlayerToSync, this.worldMount);

    // Preload textures for visible cards (fire-and-forget for faster display during sync)
    const preloadUrls = this.collectVisibleCardUrls(
      bottomPlayerToSync,
      topPlayerToSync,
      currentPlayerId,
      state,
      omniscient,
      adminRevealPrizes,
    );
    this.assetLoader.preloadCardTextures(preloadUrls);

    // Sync bottomPlayer
    if (bottomPlayerToSync) {
      const isOwner = bottomPlayerToSync.id === currentPlayerId || omniscient;
      const prizeIsOwner = isOwner || adminRevealPrizes;
      await this.syncPlayer(bottomPlayerToSync, 'bottomPlayer', isOwner, prizeIsOwner, display);
    }

    // Sync topPlayer
    if (topPlayerToSync) {
      const isOwner = topPlayerToSync.id === currentPlayerId || omniscient;
      const prizeIsOwner = isOwner || adminRevealPrizes;
      await this.syncPlayer(topPlayerToSync, 'topPlayer', isOwner, prizeIsOwner, display);
    }

    // Sync shared stadium (only once - stadium is shared between both players)
    // Find the stadium CardList that actually has cards (only one player will have cards at a time)
    const stadium = state.players.find((p) => p.stadium.cards.length > 0)?.stadium;
    if (stadium && stadium.cards.length > 0) {
      await this.syncSharedStadium(stadium);
    } else {
      this.clearSharedStadiumMeshes();
    }
  }

  private clearSharedStadiumMeshes(): void {
    for (const meshId of SHARED_STADIUM_MESH_IDS) {
      this.removeCard(meshId);
    }
  }

  private markStadiumMesh(meshId: string, stadium: CardList): void {
    const mesh = this.cardsMap.get(meshId);
    if (!mesh) {
      return;
    }
    const group = mesh.getGroup();
    group.userData.isStadium = true;
    // Keep the full stadium CardList for click / trainer activation
    group.userData.cardList = stadium;
  }

  private async syncSharedStadium(stadium: CardList): Promise<void> {
    const dualHalves = resolveDualStadiumDisplayHalves(stadium.cards);
    if (dualHalves) {
      const [leftHalf, rightHalf] = dualHalves;
      const halfOffset = CARD_WIDTH / 2;
      const leftPos = ZONE_POSITIONS.stadium.clone().add(new Vector3(-halfOffset, 0, 0));
      const rightPos = ZONE_POSITIONS.stadium.clone().add(new Vector3(halfOffset, 0, 0));

      const leftList = new CardList();
      leftList.cards = [leftHalf];
      leftList.isPublic = true;

      const rightList = new CardList();
      rightList.cards = [rightHalf];
      rightList.isPublic = true;

      this.removeCard(SHARED_STADIUM_MESH_ID);

      await Promise.all([
        this.updateCard(leftList, SHARED_STADIUM_LEFT_MESH_ID, leftPos, true, 0, undefined, 1.0),
        this.updateCard(rightList, SHARED_STADIUM_RIGHT_MESH_ID, rightPos, true, 0, undefined, 1.0),
      ]);

      this.markStadiumMesh(SHARED_STADIUM_LEFT_MESH_ID, stadium);
      this.markStadiumMesh(SHARED_STADIUM_RIGHT_MESH_ID, stadium);
      return;
    }

    this.removeCard(SHARED_STADIUM_LEFT_MESH_ID);
    this.removeCard(SHARED_STADIUM_RIGHT_MESH_ID);

    await this.updateCard(
      stadium,
      SHARED_STADIUM_MESH_ID,
      ZONE_POSITIONS.stadium,
      true, // Always visible
      0, // No rotation (horizontal orientation)
      undefined, // No cardTarget
      1.0, // Same scale as bench/supporter cards
    );

    this.markStadiumMesh(SHARED_STADIUM_MESH_ID, stadium);
  }

  /** Pile restricted to `visibleIds` (pile order kept from `ids`). */
  private pileWithIds(pile: CardList, visibleIds: readonly number[] | undefined): CardList {
    if (!visibleIds) {
      return pile;
    }
    const byId = new Map(pile.cards.map((c) => [c.id, c]));
    const list = new CardList();
    list.cards = visibleIds.map((id) => byId.get(id)).filter((c): c is Card => c != null);
    list.isPublic = pile.isPublic;
    list.isSecret = pile.isSecret;
    return list;
  }

  /** World position of the next card placed on this player's discard / Lost Zone pile. */
  getPileTopWorld(
    position: 'topPlayer' | 'bottomPlayer',
    zone: 'discard' | 'lostzone',
    visibleCount: number,
  ): Vector3 {
    const target = (zone === 'discard'
      ? ZONE_POSITIONS[position].discard
      : ZONE_POSITIONS[position].lostZone
    ).clone();
    target.y += visibleCount * Board3dStackService.STACK_HEIGHT_INCREMENT;
    if (zone === 'lostzone') {
      target.y += 0.1;
    }
    return target;
  }

  private async syncPlayer(
    player: Player,
    position: 'topPlayer' | 'bottomPlayer',
    isOwner: boolean,
    prizeIsOwner: boolean,
    display: Board3dDisplayOverrides,
  ): Promise<void> {
    const rotation = position === 'topPlayer' ? 180 : 0;
    const playerPrefix = `${position}_${player.id}`;
    const playerType = position === 'topPlayer' ? PlayerType.TOP_PLAYER : PlayerType.BOTTOM_PLAYER;

    const holdBoardFaceDown = !!display.holdBoardFaceDown;

    // Active and Supporter - run in parallel (independent zones)
    const activePromise =
      player.active && player.active.cards.length > 0
        ? (() => {
            const sleeveImagePath = this.getSleeveImagePath(player.active, player);
            return this.updateCard(
              player.active!,
              `${playerPrefix}_active`,
              ZONE_POSITIONS[position].active,
              isOwner,
              rotation,
              { player: playerType, slot: SlotType.ACTIVE, index: 0 },
              1.5,
              sleeveImagePath,
              false,
              holdBoardFaceDown,
            );
          })()
        : Promise.resolve(undefined).then(() => {
            this.removeCard(`${playerPrefix}_active`);
          });

    const supporterOverride = display.supporterCard?.get(player.id);
    let supporterList: CardList | null = null;
    if (supporterOverride) {
      supporterList = new CardList();
      supporterList.cards = [supporterOverride];
      supporterList.isPublic = true;
    } else if (
      player.supporter &&
      player.supporter.cards.length > 0 &&
      !display.hiddenSupporterPlayerIds?.has(player.id)
    ) {
      supporterList = player.supporter;
    }
    const supporterPromise = supporterList
      ? this.updateCard(
          supporterList,
          `${playerPrefix}_supporter`,
          ZONE_POSITIONS[position].supporter,
          isOwner || supporterOverride != null,
          rotation,
        )
      : Promise.resolve(undefined).then(() => {
          this.removeCard(`${playerPrefix}_supporter`);
        });

    await Promise.all([activePromise, supporterPromise]);

    // Bench Pokemon - load all in parallel
    const benchPositions = getBenchPositions(player.bench.length, playerType);
    const benchPromises = player.bench.map((benchCard, i) => {
      const cardId = `${playerPrefix}_bench_${i}`;
      if (benchCard && benchCard.cards.length > 0) {
        const sleeveImagePath = this.getSleeveImagePath(benchCard, player);
        return this.updateCard(
          benchCard,
          cardId,
          benchPositions[i],
          isOwner,
          rotation,
          { player: playerType, slot: SlotType.BENCH, index: i },
          1.0,
          sleeveImagePath,
          false,
          holdBoardFaceDown,
        );
      } else {
        this.removeCard(cardId);
        return Promise.resolve();
      }
    });
    await Promise.all(benchPromises);

    // Deck stack
    const deckStackId = `${playerPrefix}_deck`;
    const deckCount = display.deckCount?.get(player.id) ?? player.deck?.cards.length ?? 0;
    if (player.deck && deckCount > 0) {
      await this.stackService.updateDeckStack(
        deckStackId,
        deckCount,
        ZONE_POSITIONS[position].deck,
        rotation,
        this.worldMount,
        (player.deck as any)?.sleeveImagePath,
        player.deck,
        this.updateCard.bind(this),
        this.getCardById.bind(this),
      );
    } else {
      this.stackService.removeStack(deckStackId, this.worldMount, true);
      this.removeCard(`${deckStackId}_top`);
    }

    // Discard pile (stacked with latest on top)
    const discardStackId = `${playerPrefix}_discard`;
    const discard = player.discard
      ? this.pileWithIds(player.discard, display.discardIds?.get(player.id))
      : null;
    if (discard && discard.cards.length > 0) {
      await this.stackService.updateDiscardStack(
        discard,
        discardStackId,
        ZONE_POSITIONS[position].discard,
        rotation,
        this.worldMount,
        this.updateCard.bind(this),
        this.getCardById.bind(this),
      );
    } else {
      this.stackService.removeStack(discardStackId, this.worldMount, false);
      this.removeCard(`${discardStackId}_top`);
    }

    // Lost Zone (stacked with latest on top)
    const lostZoneStackId = `${playerPrefix}_lostzone`;
    const lostzone = player.lostzone
      ? this.pileWithIds(player.lostzone, display.lostzoneIds?.get(player.id))
      : null;
    if (lostzone && lostzone.cards.length > 0) {
      await this.stackService.updateLostZoneStack(
        lostzone,
        lostZoneStackId,
        ZONE_POSITIONS[position].lostZone,
        rotation,
        this.worldMount,
        isOwner,
        this.updateCard.bind(this),
        this.getCardById.bind(this),
        this.removeCard.bind(this),
      );
    } else {
      this.stackService.removeLostZoneStack(lostZoneStackId, this.worldMount);
      this.removeCard(`${lostZoneStackId}_top`);
    }

    // Prize cards (show in 2x3 grid)
    if (player.prizes) {
      const revealPrizes = prizeIsOwner && !isOwner;
      await this.prizeService.updatePrizes(
        playerPrefix,
        player.prizes,
        ZONE_POSITIONS[position].prizes,
        isOwner,
        revealPrizes,
        rotation,
        this.worldMount,
        player,
        this.updateCard.bind(this),
        (prizeId: string) => {
          this.removeCard(prizeId);
        },
        this.getCardById.bind(this),
      );
    }
  }

  /**
   * Collect scan URLs for all visible face-up cards (for texture preloading)
   */
  private collectVisibleCardUrls(
    bottomPlayer: Player | undefined,
    topPlayer: Player | undefined,
    currentPlayerId: number,
    state: any,
    omniscient: boolean,
    adminRevealPrizes: boolean,
  ): string[] {
    const urls: string[] = [];
    const collectFromCardList = (cardList: CardList, isOwner: boolean, revealPrize = false) => {
      if (!cardList || !cardList.cards.length) return;
      const isFaceDown = revealPrize
        ? false
        : cardList.isSecret || (!cardList.isPublic && !isOwner);
      if (isFaceDown) return;
      if (cardList instanceof PokemonCardList) {
        const main = cardList.getPokemonCard();
        const mainCard = main?.tags.includes(CardTag.BREAK)
          ? cardList.cards.find(
              (c) => c.superType === SuperType.POKEMON && !c.tags.includes(CardTag.BREAK),
            ) || main
          : main || cardList.cards[0];
        if (mainCard) {
          const url = this.cardsAdapter.getScanUrlFor3D(mainCard, cardList);
          if (url && url.trim()) urls.push(url);
        }
      } else {
        const url = this.cardsAdapter.getScanUrlFor3D(cardList.cards[0], cardList);
        if (url && url.trim()) urls.push(url);
      }
    };

    [bottomPlayer, topPlayer].forEach((player) => {
      if (!player) return;
      const isOwner = player.id === currentPlayerId || omniscient;
      const prizeIsOwner = isOwner || adminRevealPrizes;
      if (player.active) collectFromCardList(player.active, isOwner);
      if (player.supporter) collectFromCardList(player.supporter, isOwner);
      player.bench?.forEach((bench) => collectFromCardList(bench, isOwner));
      if (player.discard?.cards?.length) {
        const topCard = player.discard.cards[player.discard.cards.length - 1];
        const topList = new CardList();
        topList.cards = [topCard];
        topList.isPublic = player.discard.isPublic;
        topList.isSecret = player.discard.isSecret;
        collectFromCardList(topList, true);
      }
      player.prizes?.forEach((prize) =>
        collectFromCardList(prize, isOwner, prizeIsOwner && !isOwner),
      );
    });

    const stadium = state?.players?.find((p: Player) => p.stadium?.cards?.length > 0)?.stadium;
    if (stadium?.cards?.length) {
      const dualHalves = resolveDualStadiumDisplayHalves(stadium.cards);
      if (dualHalves) {
        for (const half of dualHalves) {
          const halfList = new CardList();
          halfList.cards = [half];
          halfList.isPublic = true;
          collectFromCardList(halfList, true);
        }
      } else {
        collectFromCardList(stadium, true);
      }
    }

    return urls;
  }

  /**
   * Extract sleeve image path from CardList with fallback to player's sleeve
   */
  private getSleeveImagePath(cardList: CardList | undefined, player: Player): string | undefined {
    const cardListSleeve = (cardList as any)?.sleeveImagePath;
    const playerSleeve = (player as any)?.sleeveImagePath;
    return cardListSleeve || playerSleeve;
  }

  /**
   * Update or create a card in the scene
   */
  private async updateCard(
    cardList: CardList,
    cardId: string,
    position: Vector3,
    isOwner: boolean,
    rotation: number,
    cardTarget?: CardTarget,
    scale: number = 1.0,
    sleeveImagePath?: string,
    revealPrize: boolean = false,
    forceFaceDown: boolean = false,
  ): Promise<void> {
    cardId = String(cardId);

    // Determine the main card to display
    let mainCard: Card;
    let breakCard: Card | undefined;

    // Handle PokemonCardList for evolution display
    if (cardList instanceof PokemonCardList) {
      const pokemonCard = cardList.getPokemonCard();
      if (pokemonCard?.tags.includes(CardTag.BREAK)) {
        // BREAK card: show pre-evolution as main, BREAK as overlay
        mainCard =
          cardList.cards.find(
            (c) => c.superType === SuperType.POKEMON && !c.tags.includes(CardTag.BREAK),
          ) || pokemonCard;
        breakCard = pokemonCard;
      } else {
        mainCard = pokemonCard || cardList.cards[0];
      }
    } else {
      mainCard = cardList.cards[0];
    }

    if (!mainCard) return;

    const applyCardScale = (mesh: Board3dCard, s: number) => {
      mesh.setScale(s);
    };

    // Determine if card should be face-down (not public or is secret)
    const isFaceDown = forceFaceDown
      ? true
      : revealPrize
        ? false
        : cardList.isSecret || (!cardList.isPublic && !isOwner);

    // Get card scan URL (checks artworksMap for overrides first, like 2D components do)
    const scanUrl = this.cardsAdapter.getScanUrlFor3D(mainCard, cardList);

    // Get sleeve URL if sleeve image path is provided
    const sleeveUrl = sleeveImagePath ? this.cardsAdapter.getSleeveUrl(sleeveImagePath) : undefined;

    // Load textures - use sleeve if available, otherwise use cardback
    const loadBackTexture = async () => {
      if (sleeveUrl) {
        return this.assetLoader.loadSleeveTexture(sleeveUrl);
      }
      return this.assetLoader.loadCardBack();
    };

    // Progressive loading: show card-back immediately, load front texture in background
    const [backTexture, maskTexture] = await Promise.all([
      loadBackTexture(),
      this.assetLoader.loadCardMaskTexture(),
    ]);

    // Use card-back as front placeholder for face-up cards (will swap when loaded)
    const placeholderFrontTexture = await this.assetLoader.loadCardBack();
    let frontTexture = placeholderFrontTexture;
    /** True only when the scan is not in memory yet — avoid placeholder + holo clear every sync */
    let awaitingAsyncScan = false;

    if (isFaceDown) {
      frontTexture = backTexture;
    } else {
      const needsFrontLoad = scanUrl && scanUrl.trim();
      if (needsFrontLoad) {
        const cachedFront = this.assetLoader.getCardTextureIfCached(scanUrl);
        if (cachedFront) {
          frontTexture = cachedFront;
        } else {
          awaitingAsyncScan = true;
          this.assetLoader
            .loadCardTexture(scanUrl)
            .then((loadedFront) => {
              const currentCard = this.cardsMap.get(cardId);
              if (currentCard && currentCard.getGroup().userData.cardData?.id === mainCard.id) {
                currentCard.updateTexture(loadedFront, backTexture, maskTexture);
                void apply3dCardHolo(this.assetLoader, currentCard, mainCard, false);
              }
            })
            .catch(() => {
              // Fallback already shown (card-back)
            });
        }
      } else {
        console.warn(
          'Empty scanUrl for card:',
          mainCard?.fullName,
          'set:',
          mainCard?.set,
          'setNumber:',
          mainCard?.setNumber,
        );
      }
    }

    // Check if card already exists
    let cardMesh = this.cardsMap.get(cardId);

    if (cardMesh) {
      // Update existing card (skip position/rotation/scale if this card is being dragged)
      cardMesh.updateTexture(frontTexture, backTexture, maskTexture);
      if (cardId !== this.skippedCardIdForSync) {
        cardMesh.setPosition(position);
        cardMesh.setRotation(rotation);
      }
      if (cardId !== this.skippedCardIdForSync && !this.skippedScaleCardIdsForSync?.has(cardId)) {
        applyCardScale(cardMesh, scale);
      }
      // Update userData with latest cardList
      cardMesh.getGroup().userData.cardData = mainCard;
      cardMesh.getGroup().userData.cardList = cardList;
      cardMesh.getGroup().userData.isFaceDown = isFaceDown;
    } else {
      // Create new card
      cardMesh = new Board3dCard(frontTexture, backTexture, position, rotation, scale, maskTexture);

      cardMesh.getGroup().userData.cardId = cardId;
      cardMesh.getGroup().userData.cardData = mainCard;
      cardMesh.getGroup().userData.cardList = cardList;
      cardMesh.getGroup().userData.isBoardCard = true;
      cardMesh.getGroup().userData.isFaceDown = isFaceDown;
      if (cardTarget) {
        cardMesh.getGroup().userData.cardTarget = cardTarget;
      }

      if (this.boardCardsMount) {
        this.boardCardsMount.add(cardMesh.getGroup());
      }
      this.cardsMap.set(cardId, cardMesh);
      applyCardScale(cardMesh, scale);
    }

    const hiddenForHandFlight = this.handPlayFlightHiddenCardIds?.has(cardId) ?? false;
    cardMesh.getGroup().visible = !hiddenForHandFlight;

    // Update overlays for PokemonCardList
    if (cardList instanceof PokemonCardList) {
      let pendingPlaceDamage = 0;
      if (cardTarget && this.boardInteractionForDamagePreview?.isPutDamageOverlayActive()) {
        pendingPlaceDamage =
          this.boardInteractionForDamagePreview.getPutDamagePlacementDelta(cardTarget);
      }
      await this.overlayService.updateOverlays(
        cardId,
        cardList,
        cardMesh,
        breakCard,
        isFaceDown,
        this.interactionScene,
        pendingPlaceDamage,
      );
    } else {
      // Clear any existing overlays for non-Pokemon cards
      this.overlayService.clearOverlays(cardId, this.interactionScene);
    }

    if (isFaceDown) {
      void apply3dCardHolo(this.assetLoader, cardMesh, mainCard, true);
    } else if (awaitingAsyncScan) {
      cardMesh.setHolo(null);
    } else if (scanUrl && scanUrl.trim()) {
      void apply3dCardHolo(this.assetLoader, cardMesh, mainCard, false);
    } else {
      void apply3dCardHolo(this.assetLoader, cardMesh, mainCard, true);
    }
  }

  /**
   * Remove a card from the scene
   */
  private removeCard(cardId: string): void {
    cardId = String(cardId);
    const card = this.cardsMap.get(cardId);
    if (!card) {
      this.overlayService.clearOverlays(cardId, this.interactionScene);
      return;
    }
    this.cardsMap.delete(cardId);
    this.overlayService.clearOverlays(cardId, this.interactionScene);
    if (this.boardCardsMount !== null) {
      card.getGroup().removeFromParent();
      card.dispose();
    } else {
      this.pendingR3fBoardCardDisposals.push(card);
    }
  }

  /**
   * After R3F re-renders without removed cards, detach + dispose meshes that left {@link cardsMap}.
   * Call from the controller after board cards are removed in R3F mode (e.g. next frame) so React can unmount primitives first.
   */
  drainPendingR3fBoardCardDisposals(): void {
    if (this.pendingR3fBoardCardDisposals.length === 0) {
      return;
    }
    for (const card of this.pendingR3fBoardCardDisposals) {
      card.dispose();
    }
    this.pendingR3fBoardCardDisposals = [];
  }

  /**
   * Clean up cards that no longer match the current player assignments
   * Removes cards, stacks, and prizes for players that are no longer in the current positions
   */
  private cleanupOldCards(
    state: any,
    topPlayerToSync: Player | undefined,
    bottomPlayerToSync: Player | undefined,
    worldMount: Object3D,
  ): void {
    // Build map of expected positions for each player ID
    // This ensures we check both player ID validity AND position correctness
    const expectedPositions = new Map<number, 'topPlayer' | 'bottomPlayer'>();
    if (topPlayerToSync) {
      expectedPositions.set(topPlayerToSync.id, 'topPlayer');
    }
    if (bottomPlayerToSync) {
      expectedPositions.set(bottomPlayerToSync.id, 'bottomPlayer');
    }

    // If no valid players, clear everything except stadium
    if (expectedPositions.size === 0) {
      // Clear all cards except stadium
      const cardsToRemove: string[] = [];
      this.cardsMap.forEach((card, cardId) => {
        if (!isSharedStadiumMeshId(cardId)) {
          cardsToRemove.push(cardId);
        }
      });
      cardsToRemove.forEach((cardId) => this.removeCard(cardId));

      // Clear all stacks (no valid players, so remove everything)
      const allStacksToRemove: Array<{ stackId: string; isDeck: boolean }> = [];
      this.stackService.forEachDeckStackId((stackId) => {
        allStacksToRemove.push({ stackId, isDeck: true });
      });
      this.stackService.forEachDiscardStackId((stackId) => {
        allStacksToRemove.push({ stackId, isDeck: false });
      });
      this.stackService.forEachLostZoneStackId((stackId) => {
        this.stackService.removeLostZoneStack(stackId, worldMount);
      });
      allStacksToRemove.forEach(({ stackId, isDeck }) => {
        this.stackService.removeStack(stackId, worldMount, isDeck);
      });
      return;
    }

    // Remove cards that don't match current player assignments
    // Card IDs are formatted as: ${position}_${playerId}_${slot}
    // Examples: bottomPlayer_1_active, topPlayer_2_bench_0, bottomPlayer_1_deck
    const cardsToRemove: string[] = [];
    this.cardsMap.forEach((card, cardId) => {
      // Skip stadium (it's shared)
      if (isSharedStadiumMeshId(cardId)) {
        return;
      }

      // Extract player ID and position from card ID
      // Format: position_playerId_slot or position_playerId_slot_index
      const parts = cardId.split('_');
      if (parts.length >= 3) {
        const position = parts[0] as 'topPlayer' | 'bottomPlayer';
        const playerIdStr = parts[1];
        const playerId = parseInt(playerIdStr, 10);

        if (!isNaN(playerId)) {
          const expectedPosition = expectedPositions.get(playerId);
          // Remove if player ID doesn't exist OR position doesn't match expected position
          if (!expectedPosition || expectedPosition !== position) {
            cardsToRemove.push(cardId);
          }
        }
      }
    });

    // Remove cards that don't match
    cardsToRemove.forEach((cardId) => this.removeCard(cardId));

    // Clean up stacks (deck/discard) for removed players or wrong positions
    // Stack IDs are formatted as: ${position}_${playerId}_deck or ${position}_${playerId}_discard
    const stacksToRemove: Array<{ stackId: string; isDeck: boolean }> = [];

    // Check deck stacks
    this.stackService.forEachDeckStackId((stackId) => {
      const parts = stackId.split('_');
      if (parts.length >= 3) {
        const position = parts[0] as 'topPlayer' | 'bottomPlayer';
        const playerIdStr = parts[1];
        const playerId = parseInt(playerIdStr, 10);
        if (!isNaN(playerId)) {
          const expectedPosition = expectedPositions.get(playerId);
          // Remove if player ID doesn't exist OR position doesn't match expected position
          if (!expectedPosition || expectedPosition !== position) {
            stacksToRemove.push({ stackId, isDeck: true });
          }
        }
      }
    });

    // Check discard stacks
    this.stackService.forEachDiscardStackId((stackId) => {
      const parts = stackId.split('_');
      if (parts.length >= 3) {
        const position = parts[0] as 'topPlayer' | 'bottomPlayer';
        const playerIdStr = parts[1];
        const playerId = parseInt(playerIdStr, 10);
        if (!isNaN(playerId)) {
          const expectedPosition = expectedPositions.get(playerId);
          // Remove if player ID doesn't exist OR position doesn't match expected position
          if (!expectedPosition || expectedPosition !== position) {
            stacksToRemove.push({ stackId, isDeck: false });
          }
        }
      }
    });

    // Lost Zone stacks (`${position}_${id}_lostzone`)
    this.stackService.forEachLostZoneStackId((stackId) => {
      const parts = stackId.split('_');
      if (parts.length >= 3) {
        const position = parts[0] as 'topPlayer' | 'bottomPlayer';
        const playerIdStr = parts[1];
        const playerId = parseInt(playerIdStr, 10);
        if (!isNaN(playerId)) {
          const expectedPosition = expectedPositions.get(playerId);
          if (!expectedPosition || expectedPosition !== position) {
            this.stackService.removeLostZoneStack(stackId, worldMount);
          }
        }
      }
    });

    // Remove stacks for removed players or wrong positions
    stacksToRemove.forEach(({ stackId, isDeck }) => {
      this.stackService.removeStack(stackId, worldMount, isDeck);
    });
  }

  /**
   * Get a card mesh by ID
   */
  getCardById(cardId: string): Board3dCard | undefined {
    return this.cardsMap.get(cardId);
  }

  setSuppressedEnergyIconSlot(hostMeshId: string, energyIndex: number): void {
    this.overlayService.setSuppressedEnergyIconSlot(hostMeshId, energyIndex);
  }

  clearSuppressedEnergyIconSlot(hostMeshId: string): void {
    this.overlayService.clearSuppressedEnergyIconSlot(hostMeshId);
  }

  loadEnergyIconTexture(card: Card, energyCardList: CardList): Promise<Texture> {
    return this.overlayService.loadEnergyIconTexture(card, energyCardList);
  }

  refreshEnergyOverlayForCard(cardId: string, energyCardList: CardList): Promise<void> {
    return this.overlayService.refreshEnergyOverlayForCard(cardId, energyCardList);
  }

  /**
   * Re-key a board slot mesh as a ghost (e.g. Knock Out) before sync paints the slot's next contents.
   */
  detachBoardCardAsGhost(oldKey: string): string | null {
    const newKey = `${oldKey}_ghost`;
    if (this.cardsMap.has(newKey)) {
      this.removeCard(newKey);
    }
    const card = this.cardsMap.get(oldKey);
    if (!card) {
      return null;
    }
    this.cardsMap.delete(oldKey);
    this.cardsMap.set(newKey, card);
    this.overlayService.rekeyOverlays(oldKey, newKey);
    const ud = card.getGroup().userData;
    ud.koAnimGhost = true;
    ud.cardId = newKey;
    delete ud.cardTarget;
    return newKey;
  }

  /** Remove a board card and its overlays (e.g. after KO ghost animation). */
  removeBoardCardById(cardId: string): void {
    this.removeCard(cardId);
  }

  /**
   * Hide an existing board mesh while a hand card flies onto the same slot (avoid double image).
   * Full sync still runs after the flight; avoids an extra full sync on drop for replace plays.
   */
  hideBoardCardForHandFlight(meshId: string): void {
    const card = this.cardsMap.get(meshId);
    if (card) {
      card.getGroup().visible = false;
    }
  }

  /** Hide several meshes immediately (before sync paints new textures). */
  hideBoardCardsForHandFlight(meshIds: readonly string[]): void {
    for (const meshId of meshIds) {
      this.hideBoardCardForHandFlight(meshId);
    }
  }

  /**
   * Board Pokémon card group for a playmat {@link CardTarget} (active/bench).
   */
  getBoardPokemonGroupForTarget(target: CardTarget): Object3D | null {
    for (const card of this.cardsMap.values()) {
      const group = card.getGroup();
      const ud = group.userData;
      const ct = ud.cardTarget as CardTarget | undefined;
      if (
        ud.isBoardCard &&
        ct &&
        ct.player === target.player &&
        ct.slot === target.slot &&
        ct.index === target.index
      ) {
        return group;
      }
    }
    return null;
  }

  updateBillboards(camera: PerspectiveCamera): void {
    this.overlayService.updateBillboards(camera);
  }

  /**
   * Refreshes only the red “placing damage” chips when the Put damage prompt preview changes
   * (full {@link syncState} does not run because game state is unchanged).
   */
  refreshPutDamagePlacementOverlays(interaction: BoardInteractionService): void {
    const active = interaction.isPutDamageOverlayActive();
    this.cardsMap.forEach((card, meshId) => {
      const group = card.getGroup();
      const ud = group.userData;
      const ct = ud.cardTarget as CardTarget | undefined;
      if (!ud.isBoardCard || !ct) {
        return;
      }
      const pending = active ? interaction.getPutDamagePlacementDelta(ct) : 0;
      this.overlayService.updatePendingPlaceDamageOnly(meshId, pending);
    });
  }

  /**
   * Update selection outlines for all board cards based on BoardInteractionService state
   */
  updateSelectionState(
    isSelectionMode: boolean,
    interactionService: BoardInteractionService,
  ): void {
    this.cardsMap.forEach((card, cardId) => {
      const userData = card.getGroup().userData;
      const cardTarget = userData.cardTarget as CardTarget;

      // Skip cards without a cardTarget (deck, discard, stadium, etc.)
      if (!cardTarget) {
        card.setOutline(false);
        return;
      }

      if (userData.isSetupPreview) {
        card.setOutline(false);
        return;
      }

      if (isSelectionMode) {
        const isEligible = interactionService.isTargetEligible(cardTarget);
        const isSelected = interactionService.isTargetSelected(cardTarget);

        if (isSelected) {
          card.setOutline(true, 0x4ade80); // Green for selected
        } else if (isEligible) {
          card.setOutline(true, 0xffffff); // White for selectable
        } else {
          card.setOutline(false);
        }
      } else {
        card.setOutline(false);
      }
    });
  }

  /**
   * Show picked Basics on Active/Bench during setup (client preview until OK is pressed).
   */
  async updateSetupStartingPokemonPreview(
    player: Player,
    prompt: ChooseCardsPrompt,
    handIndices: number[],
    skipHandIndices?: ReadonlySet<number>,
  ): Promise<void> {
    const neededIds = new Set<string>();
    const updates: Promise<void>[] = [];

    for (let pickOrder = 0; pickOrder < handIndices.length; pickOrder++) {
      const handIndex = handIndices[pickOrder];
      // Prefer the live player hand — sandbox may have added cards after the prompt was captured.
      const card = player.hand.cards[handIndex] ?? prompt.player.hand.cards[handIndex];
      const slotTarget = getSetupPlaySlotForPickOrder(prompt, pickOrder);
      if (!card || !slotTarget) {
        continue;
      }

      const meshId = setupPreviewMeshId(player.id, slotTarget.slot, slotTarget.index);

      // In-flight picks keep animating; don't spawn a static duplicate. Preserve pick-order
      // for later indices by not compacting the handIndices list in the caller.
      if (skipHandIndices?.has(handIndex)) {
        if (this.cardsMap.has(meshId)) {
          neededIds.add(meshId);
        }
        continue;
      }

      neededIds.add(meshId);

      if (this.cardsMap.has(meshId)) {
        continue;
      }

      const tempList = new PokemonCardList();
      tempList.cards = [card];
      tempList.isPublic = true;
      // Match server starting Pokémon: face-down until game-start reveal.
      tempList.isSecret = true;

      const position =
        slotTarget.slot === SlotType.ACTIVE
          ? ZONE_POSITIONS.bottomPlayer.active.clone()
          : getBenchPositions(player.bench.length, PlayerType.BOTTOM_PLAYER)[
              slotTarget.index
            ].clone();

      const scale = slotTarget.slot === SlotType.ACTIVE ? 1.5 : 1.0;
      const cardTarget: CardTarget = {
        player: slotTarget.player,
        slot: slotTarget.slot,
        index: slotTarget.index,
      };

      updates.push(
        this.updateCard(tempList, meshId, position, true, 0, cardTarget, scale).then(() => {
          const mesh = this.cardsMap.get(meshId);
          if (!mesh) {
            return;
          }
          const group = mesh.getGroup();
          group.userData.isSetupPreview = true;
          group.userData.setupPreviewHandIndex = handIndex;
          group.userData.isBoardCard = true;
        }),
      );
    }

    await Promise.all(updates);

    for (const id of [...this.setupPreviewMeshIds]) {
      if (!neededIds.has(id)) {
        this.removeCard(id);
        this.setupPreviewMeshIds.delete(id);
      }
    }
    for (const id of neededIds) {
      this.setupPreviewMeshIds.add(id);
    }
  }

  clearSetupStartingPokemonPreview(): void {
    if (this.setupPreviewMeshIds.size === 0) {
      return;
    }
    for (const id of this.setupPreviewMeshIds) {
      this.removeCard(id);
    }
    this.setupPreviewMeshIds.clear();
  }

  /** Register a hand-play flight mesh as the setup preview for a slot (after animation). */
  adoptSetupPreviewCard(
    board3dCard: Board3dCard,
    meshId: string,
    handIndex: number,
    card: Card,
    cardTarget: CardTarget,
    landing: { position: Vector3; rotationY: number; scale: number },
  ): void {
    this.removeCard(meshId);

    const group = board3dCard.getGroup();
    group.userData.cardId = meshId;
    group.userData.cardData = card;
    group.userData.cardTarget = cardTarget;
    group.userData.isSetupPreview = true;
    group.userData.setupPreviewHandIndex = handIndex;
    group.userData.isBoardCard = true;
    group.userData.isFaceDown = true;
    delete group.userData.setupPlacementInFlight;
    delete group.userData.playingToBoard;
    delete group.userData.isHandCard;
    // Hand selection sync may have hidden the mesh before lift — keep preview visible.
    group.visible = true;

    board3dCard.setPosition(landing.position);
    board3dCard.setRotation(landing.rotationY);
    board3dCard.setScale(landing.scale);

    if (this.boardCardsMount) {
      this.boardCardsMount.add(group);
    }
    this.cardsMap.set(meshId, board3dCard);
    this.setupPreviewMeshIds.add(meshId);
  }

  /**
   * Dispose all resources
   */
  dispose(scene: Scene): void {
    this.clearSetupStartingPokemonPreview();

    // Clean up overlays
    this.overlayService.dispose(scene);

    // Clean up stacks
    this.stackService.dispose(scene);

    // Clean up prizes (minimal - uses cardsMap)
    this.prizeService.dispose(scene);

    for (const card of this.pendingR3fBoardCardDisposals) {
      card.dispose();
    }
    this.pendingR3fBoardCardDisposals = [];

    // Clean up cards
    this.cardsMap.forEach((card) => {
      card.getGroup().removeFromParent();
      card.dispose();
    });
    this.cardsMap.clear();
  }
}
