import {
  Raycaster,
  Vector2,
  Vector3,
  Euler,
  Quaternion,
  Plane,
  Camera,
  Scene,
  Object3D,
  Texture,
  InstancedMesh,
  type Intersection,
} from 'three';
import {
  PlayerType,
  SlotType,
  SuperType,
  Stage,
  TrainerType,
  Card,
  PokemonCard,
  PokemonCardList,
  type CardTarget,
} from 'ptcg-server';
import gsap from 'gsap';
import { Board3dDropZone, DropZoneType, type DropZoneConfig } from '../board-3d-drop-zone';
import {
  cardPlaysAsBasicPokemonFromHand,
  cardHasUseFromHandToBenchPower,
  resolveTrainerType,
  trainerTypeIsSupporter,
  type HandPlayPokemonZoneGameSettings,
} from '../board3dMeshIdForPlayTarget';
import { cardCanAssembleLegendFromHand } from '../dual-legend.utils';
import { isOpponentAttachTool, isOpponentPokemonExToolTarget } from '../opponent-attach-tool.util';
import { Board3dAssetLoaderService } from './board-3d-asset-loader.service';
import { Board3dStateSyncService } from './board-3d-state-sync.service';
import { Board3dHandService } from './board-3d-hand.service';
import { Board3dCard } from '../board-3d-card';
import { ZONE_POSITIONS, SNAP_DISTANCE, getBenchPositions } from '../board-3d-zone-positions';
import {
  BOARD3D_CARD_SLOT_BASE_HEIGHT,
  BOARD3D_CARD_SLOT_BASE_WIDTH,
  BOARD3D_BENCH_DROP_ZONE_HEIGHT,
  BOARD3D_BENCH_DROP_ZONE_WIDTH,
  BOARD3D_DECK_BULK_VISUAL_UD,
  BOARD3D_DROP_ZONE_TARGET_SCALE,
  BOARD3D_STADIUM_DROP_ZONE_EXTRA_SCALE,
} from '../board3d-constants';

export type EnergyAttachFlightPayload = {
  attachTarget: CardTarget;
  energyCard: Card;
};

export type PlayCardFlightPayload = {
  board3dCard: Board3dCard;
  targetWorld: Vector3;
  endScale: number;
  endRotationY: number;
  dropZoneType: DropZoneType;
  /** Resolves correct board mesh when slot is BOARD but drop zone is the general trainer BOARD. */
  trainerType?: TrainerType;
  /** Hand energy played onto a Pokémon — morph into the energy icon after flight. */
  energyAttach?: EnergyAttachFlightPayload;
  /**
   * Tool / evolution attach: card is detached for optimistic UX but should not fly to a board
   * slot — on reject it returns to hand; on success it is disposed when the play resolves.
   */
  holdForAttach?: boolean;
};

export interface DropResult {
  action: 'playCard' | 'retreat' | 'click' | 'pickAttachTarget' | 'cancelHandPlayTarget' | 'setupSelectCard';
  handIndex?: number;
  benchIndex?: number;
  zone?: CardTarget;
  clickedCard?: Object3D;
  eligibleTargets?: CardTarget[];
  /** Cosmetic flight to zone; playCardAction should still run immediately for correct handIndex. */
  playCardFlight?: PlayCardFlightPayload;
}

export interface DragContext {
  source: 'hand' | 'board';
  cardIndex: number;
  card: Card;
  superType: SuperType;
  stage?: Stage;
  trainerType?: TrainerType;
  originalTarget?: CardTarget;
}

export type SetupStartingPokemonDragState = {
  activeLocked: boolean;
  skipActivePhase: boolean;
};

export class Board3dInteractionService {
  private raycaster: Raycaster;
  private mouse: Vector2;
  private currentHoveredCard: Object3D | null = null;

  // Raycasting optimization
  private interactiveObjects: Object3D[] = []; // Cache of interactive objects for faster raycasting
  private lastRaycastTime: number = 0;
  private raycastThrottleMs: number = 16; // ~60fps (1000/60 ≈ 16.67ms)
  private lastMousePosition: Vector2 = new Vector2();
  private cachedRaycastResult: Object3D | null = null;

  // Drag state
  private isDragging: boolean = false;
  private draggedCard: Object3D | null = null;
  private draggedCardHandIndex: number = -1;
  private draggedCardOriginalPosition: Vector3 = new Vector3();
  private draggedCardOriginalRotation: Euler = new Euler();
  private draggedCardOriginalQuaternion: Quaternion = new Quaternion();
  private draggedCardOriginalScale: Vector3 = new Vector3();
  private draggedCardIsBoardCard: boolean = false;
  private dragPlane: Plane = new Plane(new Vector3(0, 1, 0), 0);
  private dragOffset: Vector3 = new Vector3();
  private previousDragPosition: Vector3 = new Vector3();
  private dragVelocity: Vector3 = new Vector3();
  private dragHoverRayScratch: Vector3 = new Vector3();
  private dragHoverRayNdc: Vector2 = new Vector2();

  // Click detection
  private mouseDownPosition: Vector2 = new Vector2();
  private mouseDownCard: Object3D | null = null;
  private clickThreshold: number = 5; // pixels

  // Pending drag state (before threshold exceeded)
  private pendingDragCard: Object3D | null = null;
  private pendingDragCamera: Camera | null = null;

  // Current drag context
  private currentDragContext: DragContext | null = null;

  /** Parent for hand play flights (R3F: hand+stacks group; legacy: same as scene). */
  private worldContentRoot!: Object3D;

  setWorldContentRoot(root: Object3D): void {
    this.worldContentRoot = root;
  }

  // Pokemon hover tracking during drag (for energy/tool cards and evolution cards)
  private hoveredPokemonCard: Object3D | null = null;
  private hoveredPokemonBoard3dCard: Board3dCard | null = null;
  private hoveredPokemonOriginalScale: Vector3 = new Vector3();
  private hoverMissStreak = 0;
  /** Resting scales for cards mid hover-out restore (avoids capturing inflated mid-tween scale). */
  private hoverRestingScales = new Map<string, Vector3>();
  /** Board mesh ids whose scale must not be overwritten by state sync (hover + hover-out). */
  private scaleLockedBoardCardIds = new Set<string>();
  /** Board plane (y = 0) for projecting the pointer / card onto the play surface. */
  private readonly boardPlane = new Plane(new Vector3(0, 1, 0), 0);
  private boardHitScratch = new Vector3();
  private static readonly POKEMON_HOVER_SCALE_MULTIPLIER = 1.2;
  private static readonly POKEMON_HOVER_SCALE_IN_DURATION = 0.15;
  private static readonly POKEMON_HOVER_SCALE_OUT_DURATION = 0.28;
  private static readonly HOVER_CLEAR_MISS_FRAMES = 2;

  // Drop zones
  private dropZones: Board3dDropZone[] = [];
  private occupiedZones: Set<string> = new Set();
  private slotGridTexture: Texture | null = null;
  private currentBenchSizes: { bottom: number; top: number } = { bottom: 5, top: 5 };

  /** Matches server {@link GameSettings} flags for sandbox bench targeting. */
  private handPlayZoneGameSettings: HandPlayPokemonZoneGameSettings = undefined;

  /** Bottom player's hand cards — used for dual LEGEND assembly checks. */
  private bottomHandCards: Card[] = [];
  /** null = unknown / omit gate (e.g. replay); otherwise server playableCardIds */
  private playableCardIds: Set<number> | null = null;
  /**
   * null = unknown / omit gate; otherwise server playableHandAbilityCardIds
   * (useFromHandToBench legal — distinct from evolution playability).
   */
  private playableHandAbilityCardIds: Set<number> | null = null;

  /** Game setup: drag Basics to Active/Bench instead of playCardAction. */
  private setupStartingPokemonDrag: SetupStartingPokemonDragState | null = null;

  setSetupStartingPokemonDrag(state: SetupStartingPokemonDragState | null): void {
    this.setupStartingPokemonDrag = state;
  }

  constructor(
    private assetLoader: Board3dAssetLoaderService,
    private stateSync: Board3dStateSyncService,
    private handService: Board3dHandService
  ) {
    this.raycaster = new Raycaster();
    this.mouse = new Vector2();
  }

  /** Called when game state updates so sandbox “all Pokémon as Basic” affects drop targeting. */
  setHandPlayZoneGameSettings(gs: HandPlayPokemonZoneGameSettings): void {
    this.handPlayZoneGameSettings = gs;
  }

  /** Called when the bottom player's hand updates (dual LEGEND assembly targeting). */
  setBottomHandCards(cards: Card[]): void {
    this.bottomHandCards = cards;
  }

  /** Server playableCardIds — general hand playability (glow / can play). */
  setPlayableCardIds(ids: number[] | undefined): void {
    this.playableCardIds = ids === undefined ? null : new Set(ids);
  }

  /**
   * Server playableHandAbilityCardIds — gates Excitedive-style empty-bench drops
   * under ability lock without blocking normal evolution.
   */
  setPlayableHandAbilityCardIds(ids: number[] | undefined): void {
    this.playableHandAbilityCardIds = ids === undefined ? null : new Set(ids);
  }

  private isHandCardPlayable(card: Card | undefined | null): boolean {
    if (!card || this.playableCardIds === null) {
      return true;
    }
    return this.playableCardIds.has(card.id);
  }

  private playsAsBasicPokemonFromHand(card: Card | undefined | null): boolean {
    return cardPlaysAsBasicPokemonFromHand(card, this.handPlayZoneGameSettings);
  }

  private canAssembleLegendFromHand(card: Card | undefined | null): boolean {
    return cardCanAssembleLegendFromHand(card, this.bottomHandCards);
  }

  /** Hand→bench ability path only when the server marks that ability legal. */
  private canUseFromHandToBenchPlay(card: Card | undefined | null): boolean {
    if (!cardHasUseFromHandToBenchPower(card)) {
      return false;
    }
    if (this.playableHandAbilityCardIds === null) {
      // Replay / selection omit: fall back to general playability.
      return this.isHandCardPlayable(card);
    }
    return this.playableHandAbilityCardIds.has(card!.id);
  }

  /**
   * Direct hand→board plays (Basic, LEGEND) — not energy/tool/evo attach.
   * useFromHandToBench is zone-aware (empty bench vs evolve) and handled separately.
   */
  private actsAsDirectBoardPlayFromHand(card: Card | undefined | null): boolean {
    return (
      this.playsAsBasicPokemonFromHand(card) ||
      this.canAssembleLegendFromHand(card)
    );
  }

  /** Empty-bench Excitedive drop (not evolution onto an occupied host). */
  private isEmptyBenchHandAbilityDrop(card: Card, zone: CardTarget): boolean {
    if (!this.canUseFromHandToBenchPlay(card)) {
      return false;
    }
    if (zone.slot !== SlotType.BENCH) {
      return false;
    }
    const key = `${PlayerType.BOTTOM_PLAYER}_${DropZoneType.BENCH}_${zone.index}`;
    return !this.occupiedZones.has(key);
  }

  /**
   * Update the list of interactive objects for optimized raycasting
   * Should be called when cards or drop zones are added/removed
   */
  updateInteractiveObjects(scene: Scene): void {
    this.interactiveObjects = [];
    scene.traverse((object: Object3D) => {
      // Exclude InstancedMesh objects - they are decorative stack meshes and should not intercept clicks
      // Only the top card (regular Mesh) should be clickable
      if (object instanceof InstancedMesh) {
        return;
      }
      if (object.userData?.[BOARD3D_DECK_BULK_VISUAL_UD]) {
        return;
      }
      // Only include objects that can be interacted with
      if (object.userData && (object.userData.isCard || object.userData.isDropZone)) {
        let p: Object3D | null = object;
        while (p) {
          if (
            p.userData?.drawingFromDeck ||
            p.userData?.playingToBoard ||
            p.userData?.discardingFromHand ||
            p.userData?.isOpponentHandCard
          ) {
            return;
          }
          p = p.parent;
        }
        this.interactiveObjects.push(object);
      }
    });
  }

  /**
   * Resolve card / overlay hit from a concrete Three.js object (R3F pointer hit path).
   */
  resolveInteractiveCardFromSurface(surface: Object3D): Object3D | null {
    let obj: Object3D | null = surface;
    while (obj) {
      if (obj.userData?.isOpponentHandCard) {
        return null;
      }
      if (obj.userData?.isEnergyIcon || obj.userData?.isToolCard) {
        return obj;
      }
      if (obj.userData?.isCard) {
        if (obj.userData?.[BOARD3D_DECK_BULK_VISUAL_UD]) {
          obj = obj.parent;
          continue;
        }
        return obj;
      }
      obj = obj.parent;
    }
    return null;
  }

  /**
   * Update mouse position and find card under cursor
   * Optimized with throttling and caching
   * @param r3fSurfaceHit When provided (mesh pointer path), skip raycast and resolve card from this object.
   */
  onMouseMove(
    event: MouseEvent,
    camera: Camera,
    scene: Scene,
    canvas: HTMLCanvasElement,
    r3fSurfaceHit?: Object3D | null
  ): Object3D | null {
    // Get canvas bounds for accurate coordinates
    const rect = canvas.getBoundingClientRect();

    // Convert to normalized device coordinates (-1 to +1)
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Check if mouse actually moved (cache result if not)
    const mouseMoved = Math.abs(mouseX - this.lastMousePosition.x) > 0.001 ||
      Math.abs(mouseY - this.lastMousePosition.y) > 0.001;

    if (!mouseMoved && this.cachedRaycastResult !== undefined && r3fSurfaceHit == null) {
      return this.cachedRaycastResult;
    }

    // Throttle raycasting to max 60fps
    const currentTime = performance.now();
    const timeSinceLastRaycast = currentTime - this.lastRaycastTime;

    if (timeSinceLastRaycast < this.raycastThrottleMs && !mouseMoved && r3fSurfaceHit == null) {
      return this.cachedRaycastResult;
    }

    this.mouse.x = mouseX;
    this.mouse.y = mouseY;
    this.lastMousePosition.set(mouseX, mouseY);
    this.lastRaycastTime = currentTime;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, camera);

    if (r3fSurfaceHit != null) {
      const card = this.resolveInteractiveCardFromSurface(r3fSurfaceHit);
      this.cachedRaycastResult = card;
      return card;
    }

    // Use cached interactive objects if available, otherwise fall back to scene traversal
    const objectsToTest = this.interactiveObjects.length > 0
      ? this.interactiveObjects
      : scene.children;

    // Find intersections with interactive objects only (much faster than entire scene)
    const intersects = this.raycaster.intersectObjects(objectsToTest, true);

    if (intersects.length > 0) {
      const card = this.getCardFromIntersection(intersects[0]);
      this.cachedRaycastResult = card;
      return card;
    }

    this.cachedRaycastResult = null;
    return null;
  }

  /**
   * Handle click event
   */
  onClick(
    event: MouseEvent,
    camera: Camera,
    scene: Scene,
    canvas: HTMLCanvasElement
  ): Object3D | null {
    const card = this.onMouseMove(event, camera, scene, canvas);
    if (card) {
      // Card was clicked
      return card;
    }
    return null;
  }

  /**
   * Get the card object from an intersection
   * Traverses up the object hierarchy to find the card group.
   * Energy icons and tool hit tabs take priority so clicking them shows that overlay's info.
   */
  private getCardFromIntersection(intersection: Intersection): Object3D | null {
    return this.resolveInteractiveCardFromSurface(intersection.object);
  }

  /**
   * Get Board3dCard instance from Object3D
   * Looks up the card by cardId from userData
   */
  private getBoard3dCardFromObject3D(cardObject: Object3D): Board3dCard | null {
    const direct = cardObject.userData?.board3dCard as Board3dCard | undefined;
    if (direct) {
      return direct;
    }
    const cardId = cardObject.userData?.cardId;
    if (!cardId) {
      return null;
    }
    return this.stateSync.getCardById(cardId) || null;
  }

  /**
   * Find the Pokemon card Object3D in a specific zone (for retreat hover / attach targeting).
   * Uses the board-card map so legend halves / tool overlays with a host cardTarget are ignored.
   */
  private getPokemonInZone(player: PlayerType, slotType: SlotType, index: number): Object3D | null {
    return this.stateSync.getBoardPokemonGroupForTarget({
      player,
      slot: slotType,
      index,
    });
  }

  /** In-play Pokémon card for evolution / tool checks (prefers cardList over display cardData). */
  private getPokemonCardFromBoardObject(boardPokemon: Object3D): PokemonCard | null {
    const cardList = boardPokemon.userData?.cardList as PokemonCardList | undefined;
    if (cardList && typeof cardList.getPokemonCard === 'function') {
      const fromList = cardList.getPokemonCard();
      if (fromList) {
        return fromList as PokemonCard;
      }
    }
    const data = boardPokemon.userData?.cardData as PokemonCard | undefined;
    return data ?? null;
  }

  private isDraggedCardOrChild(object: Object3D): boolean {
    if (!this.draggedCard) {
      return false;
    }
    let obj: Object3D | null = object;
    while (obj) {
      if (obj === this.draggedCard) {
        return true;
      }
      obj = obj.parent;
    }
    return false;
  }

  private pokemonPassesAttachHoverFilter(
    boardPokemon: Object3D,
    ctx: DragContext,
    options: {
      allowedPlayer?: PlayerType | null;
      isEvolutionCard: boolean;
      isEnergyOrTool: boolean;
    },
  ): boolean {
    const target = boardPokemon.userData.cardTarget as CardTarget | undefined;
    if (!target || (target.slot !== SlotType.ACTIVE && target.slot !== SlotType.BENCH)) {
      return false;
    }
    if (options.allowedPlayer != null && target.player !== options.allowedPlayer) {
      return false;
    }
    if (
      ctx.trainerType === TrainerType.TOOL &&
      isOpponentAttachTool(ctx.card) &&
      !isOpponentPokemonExToolTarget(boardPokemon.userData.cardList as PokemonCardList)
    ) {
      return false;
    }
    if (options.isEvolutionCard) {
      const evolutionCard = ctx.card as PokemonCard;
      const targetPokemonCard = this.getPokemonCardFromBoardObject(boardPokemon);
      if (!targetPokemonCard || !this.isValidEvolutionTarget(evolutionCard, targetPokemonCard)) {
        return false;
      }
      return true;
    }
    return options.isEnergyOrTool;
  }

  /**
   * Project a screen point onto the board plane (y = 0) so XZ targeting matches the play surface,
   * not a screen-space ray through an elevated dragged card (which misses under angled cameras).
   */
  private projectScreenToBoard(
    clientX: number,
    clientY: number,
    camera: Camera,
    canvas: HTMLCanvasElement,
    out: Vector3,
  ): boolean {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }
    this.dragHoverRayNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.dragHoverRayNdc, camera);
    return this.raycaster.ray.intersectPlane(this.boardPlane, out) != null;
  }

  /** True when board XZ is inside this Active/Bench drop zone's hit area (matches drop resolution). */
  private isBoardPositionInAttachZone(zone: Board3dDropZone, boardPos: Vector3): boolean {
    const config = zone.getConfig();
    if (config.type === DropZoneType.BENCH) {
      return zone.isPositionInBounds(boardPos);
    }
    if (config.type === DropZoneType.ACTIVE) {
      return zone.distanceToPosition(boardPos) < SNAP_DISTANCE;
    }
    return false;
  }

  /**
   * Find the attach/evolve host Pokémon under a board-plane XZ position.
   * Uses the same Active/Bench drop-zone hit areas as drops, then validates evolution / tool rules.
   */
  private findPokemonBoardCardNearBoardPosition(
    boardPos: Vector3,
    ctx: DragContext,
    options: {
      allowedPlayer?: PlayerType | null;
      isEvolutionCard: boolean;
      isEnergyOrTool: boolean;
    },
  ): Object3D | null {
    // Copy XZ so nested getWorldPosition scratches cannot alias the caller's vector.
    const probeX = boardPos.x;
    const probeZ = boardPos.z;
    this.boardHitScratch.set(probeX, 0, probeZ);

    let best: Object3D | null = null;
    let bestDist = Infinity;

    for (const zone of this.dropZones) {
      const config = zone.getConfig();
      if (config.type !== DropZoneType.ACTIVE && config.type !== DropZoneType.BENCH) {
        continue;
      }
      if (options.allowedPlayer != null && config.player !== options.allowedPlayer) {
        continue;
      }
      const zoneKey = `${config.player}_${config.type}_${config.index}`;
      if (!this.occupiedZones.has(zoneKey)) {
        continue;
      }
      if (!this.isBoardPositionInAttachZone(zone, this.boardHitScratch)) {
        continue;
      }

      const slotType = config.type === DropZoneType.ACTIVE ? SlotType.ACTIVE : SlotType.BENCH;
      const pokemon = this.getPokemonInZone(config.player, slotType, config.index);
      if (!pokemon || !this.pokemonPassesAttachHoverFilter(pokemon, ctx, options)) {
        continue;
      }

      const dist = zone.distanceToPosition(this.boardHitScratch);
      if (dist < bestDist) {
        bestDist = dist;
        best = pokemon;
      }
    }

    if (best) {
      return best;
    }

    // Fallback: XZ bounds around board Pokémon meshes (covers missing/out-of-sync drop zones).
    const halfW = (BOARD3D_CARD_SLOT_BASE_WIDTH * BOARD3D_DROP_ZONE_TARGET_SCALE) / 2;
    const halfH = (BOARD3D_CARD_SLOT_BASE_HEIGHT * BOARD3D_DROP_ZONE_TARGET_SCALE) / 2;
    for (const obj of this.interactiveObjects) {
      if (!obj.userData?.isBoardCard || !obj.userData?.cardTarget) {
        continue;
      }
      if (this.isDraggedCardOrChild(obj)) {
        continue;
      }
      if (!this.pokemonPassesAttachHoverFilter(obj, ctx, options)) {
        continue;
      }
      obj.getWorldPosition(this.dragHoverRayScratch);
      const dx = probeX - this.dragHoverRayScratch.x;
      const dz = probeZ - this.dragHoverRayScratch.z;
      if (Math.abs(dx) > halfW || Math.abs(dz) > halfH) {
        continue;
      }
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < bestDist) {
        bestDist = dist;
        best = obj;
      }
    }
    return best;
  }

  /**
   * Attach/evolve hover + drop targeting: board-plane XZ under the dragged card, then under the cursor.
   * Avoids screen-space rays through the lifted card, which miss table Pokémon with an angled camera.
   */
  private findPokemonBoardCardForAttachHover(
    event: MouseEvent,
    camera: Camera,
    canvas: HTMLCanvasElement,
    cardWorldPos: Vector3,
    ctx: DragContext,
    options: {
      allowedPlayer?: PlayerType | null;
      isEvolutionCard: boolean;
      isEnergyOrTool: boolean;
    },
  ): Object3D | null {
    const fromCard = this.findPokemonBoardCardNearBoardPosition(cardWorldPos, ctx, options);
    if (fromCard) {
      return fromCard;
    }

    if (this.projectScreenToBoard(event.clientX, event.clientY, camera, canvas, this.dragHoverRayScratch)) {
      const fromPointer = this.findPokemonBoardCardNearBoardPosition(
        this.dragHoverRayScratch,
        ctx,
        options,
      );
      if (fromPointer) {
        return fromPointer;
      }
    }

    return null;
  }

  private pokemonHoverTargetScale(): Vector3 {
    return this.hoveredPokemonOriginalScale.clone().multiplyScalar(
      Board3dInteractionService.POKEMON_HOVER_SCALE_MULTIPLIER,
    );
  }

  private lockBoardCardScale(cardId: string | undefined): void {
    if (cardId) {
      this.scaleLockedBoardCardIds.add(cardId);
    }
  }

  private unlockBoardCardScale(cardId: string | undefined): void {
    if (cardId) {
      this.scaleLockedBoardCardIds.delete(cardId);
    }
  }

  private rememberHoverRestingScale(cardId: string | undefined, scale: Vector3): void {
    if (cardId) {
      this.hoverRestingScales.set(cardId, scale.clone());
    }
  }

  private takeHoverRestingScale(cardId: string | undefined, fallback: Vector3): Vector3 {
    if (cardId) {
      const stored = this.hoverRestingScales.get(cardId);
      if (stored) {
        return stored.clone();
      }
    }
    return fallback.clone();
  }

  private schedulePokemonHoverScaleRestore(
    card: Object3D,
    originalScale: Vector3,
    board3d: Board3dCard | null,
  ): void {
    const cardId = card.userData?.cardId as string | undefined;
    gsap.killTweensOf(card.scale);
    this.lockBoardCardScale(cardId);
    this.rememberHoverRestingScale(cardId, originalScale);
    board3d?.setOutline(false);
    gsap.to(card.scale, {
      x: originalScale.x,
      y: originalScale.y,
      z: originalScale.z,
      duration: Board3dInteractionService.POKEMON_HOVER_SCALE_OUT_DURATION,
      ease: 'power2.inOut',
      onComplete: () => {
        this.unlockBoardCardScale(cardId);
        if (cardId && this.hoveredPokemonCard?.userData?.cardId !== cardId) {
          this.hoverRestingScales.delete(cardId);
        }
      },
    });
  }

  private beginPokemonHoverEffects(pokemon: Object3D): void {
    if (pokemon.userData?.inspecting) {
      return;
    }
    if (this.hoveredPokemonCard && this.hoveredPokemonCard !== pokemon) {
      this.schedulePokemonHoverScaleRestore(
        this.hoveredPokemonCard,
        this.hoveredPokemonOriginalScale,
        this.hoveredPokemonBoard3dCard,
      );
    }

    this.hoverMissStreak = 0;
    const pokemonId = pokemon.userData?.cardId as string | undefined;
    gsap.killTweensOf(pokemon.scale);

    this.hoveredPokemonOriginalScale.copy(
      this.takeHoverRestingScale(pokemonId, pokemon.scale),
    );
    this.rememberHoverRestingScale(pokemonId, this.hoveredPokemonOriginalScale);
    this.hoveredPokemonCard = pokemon;
    this.hoveredPokemonBoard3dCard = this.getBoard3dCardFromObject3D(pokemon);
    this.lockBoardCardScale(pokemonId);

    this.hoveredPokemonBoard3dCard?.setOutline(true, 0xffd700);
    const targetScale = this.pokemonHoverTargetScale();
    gsap.to(pokemon.scale, {
      x: targetScale.x,
      y: targetScale.y,
      z: targetScale.z,
      duration: Board3dInteractionService.POKEMON_HOVER_SCALE_IN_DURATION,
      ease: 'power2.out',
    });
  }

  private maintainPokemonHoverEffects(pokemon: Object3D): void {
    this.hoverMissStreak = 0;
    const targetScale = this.pokemonHoverTargetScale();
    const s = pokemon.scale;
    const drift =
      Math.abs(s.x - targetScale.x) > 0.015 ||
      Math.abs(s.y - targetScale.y) > 0.015 ||
      Math.abs(s.z - targetScale.z) > 0.015;
    if (drift) {
      gsap.killTweensOf(pokemon.scale);
      gsap.to(pokemon.scale, {
        x: targetScale.x,
        y: targetScale.y,
        z: targetScale.z,
        duration: Board3dInteractionService.POKEMON_HOVER_SCALE_IN_DURATION,
        ease: 'power2.out',
      });
    }
    this.hoveredPokemonBoard3dCard?.setOutline(true, 0xffd700);
  }

  private endPokemonHoverEffects(): void {
    if (!this.hoveredPokemonCard) {
      return;
    }
    const card = this.hoveredPokemonCard;
    const board3d = this.hoveredPokemonBoard3dCard;
    const original = this.hoveredPokemonOriginalScale.clone();
    this.hoveredPokemonCard = null;
    this.hoveredPokemonBoard3dCard = null;
    this.schedulePokemonHoverScaleRestore(card, original, board3d);
  }

  /** Immediately end Pokémon hover lift (e.g. before 3D card inspect). */
  clearPokemonHoverEffects(): void {
    if (!this.hoveredPokemonCard) {
      return;
    }
    const card = this.hoveredPokemonCard;
    const board3d = this.hoveredPokemonBoard3dCard;
    const original = this.takeHoverRestingScale(
      card.userData?.cardId as string | undefined,
      this.hoveredPokemonOriginalScale,
    );
    const cardId = card.userData?.cardId as string | undefined;
    gsap.killTweensOf(card.scale);
    card.scale.copy(original);
    board3d?.setOutline(false);
    this.unlockBoardCardScale(cardId);
    if (cardId) {
      this.hoverRestingScales.delete(cardId);
    }
    this.hoveredPokemonCard = null;
    this.hoveredPokemonBoard3dCard = null;
  }

  /**
   * Resolve attach/evolution drop target from the Pokemon board card under the pointer / card.
   */
  private allowedAttachTargetPlayer(ctx: DragContext): PlayerType | null {
    if (ctx.superType === SuperType.ENERGY) {
      return PlayerType.BOTTOM_PLAYER;
    }
    if (ctx.trainerType === TrainerType.TOOL) {
      return isOpponentAttachTool(ctx.card) ? PlayerType.TOP_PLAYER : PlayerType.BOTTOM_PLAYER;
    }
    if (
      ctx.superType === SuperType.POKEMON &&
      ctx.stage !== undefined &&
      ctx.stage !== Stage.BASIC &&
      !this.actsAsDirectBoardPlayFromHand(ctx.card)
    ) {
      return PlayerType.BOTTOM_PLAYER;
    }
    return null;
  }

  private findPokemonAttachTargetFromPointer(
    event: MouseEvent,
    camera: Camera,
    canvas: HTMLCanvasElement,
    ctx: DragContext
  ): CardTarget | null {
    const allowedPlayer = this.allowedAttachTargetPlayer(ctx);
    if (allowedPlayer === null || !this.draggedCard) {
      return null;
    }

    const isEvolutionCard =
      ctx.superType === SuperType.POKEMON &&
      ctx.stage !== undefined &&
      ctx.stage !== Stage.BASIC &&
      !this.actsAsDirectBoardPlayFromHand(ctx.card);
    const isEnergyOrTool =
      ctx.superType === SuperType.ENERGY || ctx.trainerType === TrainerType.TOOL;

    this.draggedCard.getWorldPosition(this.dragHoverRayScratch);
    const boardPokemon = this.findPokemonBoardCardForAttachHover(
      event,
      camera,
      canvas,
      this.dragHoverRayScratch,
      ctx,
      { allowedPlayer, isEvolutionCard, isEnergyOrTool },
    );
    return boardPokemon ? (boardPokemon.userData.cardTarget as CardTarget) : null;
  }

  /**
   * Get currently hovered card
   */
  getCurrentHoveredCard(): Object3D | null {
    return this.currentHoveredCard;
  }

  /**
   * Set currently hovered card
   */
  setCurrentHoveredCard(card: Object3D | null): void {
    this.currentHoveredCard = card;
  }

  /**
   * Check if a specific card is currently hovered
   */
  isCardHovered(card: Object3D): boolean {
    return this.currentHoveredCard === card;
  }

  /**
   * Clear hover state
   */
  clearHoverState(): void {
    this.currentHoveredCard = null;
  }

  /**
   * Handle mouse down - prepare for potential drag (deferred until threshold)
   * @param r3fSurfaceHit Optional R3F hit object under the pointer (avoids duplicate raycast).
   */
  onMouseDown(
    event: MouseEvent,
    camera: Camera,
    scene: Scene,
    canvas: HTMLCanvasElement,
    r3fSurfaceHit?: Object3D | null,
    disableHandDrag: boolean = false,
  ): Object3D | null {
    // Track mouse down position for click detection
    this.mouseDownPosition.set(event.clientX, event.clientY);

    const card = this.onMouseMove(event, camera, scene, canvas, r3fSurfaceHit);
    this.mouseDownCard = card;

    // Clear any previous pending drag
    this.pendingDragCard = null;
    this.pendingDragCamera = null;

    if (card) {
      if (card.userData?.inspecting) {
        return null;
      }
      // Check if card is draggable, but DON'T start drag yet - wait for threshold
      if (card.userData.isHandCard && event.button === 0 && !disableHandDrag) {
        // Store pending drag info - will start on move threshold
        this.pendingDragCard = card;
        this.pendingDragCamera = camera;
        return card;
      }
    }

    return null;
  }

  /**
   * Create drag context from the card being dragged
   */
  private createDragContext(card: Object3D, source: 'hand' | 'board'): void {
    const cardData = card.userData.cardData as Card;
    if (!cardData) {
      this.currentDragContext = null;
      return;
    }

    this.currentDragContext = {
      source,
      cardIndex: source === 'hand' ? card.userData.handIndex : card.userData.boardIndex,
      card: cardData,
      superType: cardData.superType,
      stage: (cardData as PokemonCard).stage,
      trainerType: resolveTrainerType(cardData),
      originalTarget: source === 'board' ? card.userData.cardTarget : undefined
    };

    // Show valid drop zones based on card type
    this.showValidDropZones();
  }

  /**
   * Find the next open bench slot for a given player
   * @param player Player type to find bench slot for
   * @returns The bench zone for the first open slot, or null if no open slots
   */
  private findNextOpenBenchSlot(player: PlayerType): Board3dDropZone | null {
    // Find all bench zones for this player, sorted by index
    const benchZones = this.dropZones
      .filter(zone => {
        const config = zone.getConfig();
        return config.type === DropZoneType.BENCH && config.player === player;
      })
      .sort((a, b) => a.getConfig().index - b.getConfig().index);

    // Find the first unoccupied bench zone
    for (const zone of benchZones) {
      const config = zone.getConfig();
      const zoneKey = `${config.player}_${config.type}_${config.index}`;
      if (!this.occupiedZones.has(zoneKey)) {
        return zone;
      }
    }

    return null;
  }

  /** Setup starting Pokémon: Active must be chosen before Bench; no BENCH_GENERAL. */
  private isSetupStartingDropZoneAllowed(config: DropZoneConfig, isOccupied: boolean): boolean {
    if (!this.setupStartingPokemonDrag || this.currentDragContext?.source !== 'hand') {
      return false;
    }
    const { card } = this.currentDragContext;
    if (!this.playsAsBasicPokemonFromHand(card)) {
      return false;
    }
    if (config.player !== PlayerType.BOTTOM_PLAYER) {
      return false;
    }
    if (config.type === DropZoneType.BENCH_GENERAL) {
      return false;
    }
    const { activeLocked, skipActivePhase } = this.setupStartingPokemonDrag;
    if (!skipActivePhase && !activeLocked) {
      return config.type === DropZoneType.ACTIVE;
    }
    return config.type === DropZoneType.BENCH && !isOccupied;
  }

  /**
   * Check if a drop zone is valid for the current drag context
   */
  private isValidDropZone(zone: Board3dDropZone): boolean {
    if (!this.currentDragContext) {
      return false;
    }

    const config = zone.getConfig();
    const zoneKey = `${config.player}_${config.type}_${config.index}`;
    const isOccupied = this.occupiedZones.has(zoneKey);

    // Board-to-board (retreat)
    if (this.currentDragContext.source === 'board') {
      const originalTarget = this.currentDragContext.originalTarget;
      if (!originalTarget) return false;

      // Active to Bench
      if (originalTarget.slot === SlotType.ACTIVE && config.type === DropZoneType.BENCH) {
        return true; // Can always switch to bench (will swap)
      }
      // Bench to Active
      if (originalTarget.slot === SlotType.BENCH && config.type === DropZoneType.ACTIVE) {
        return true; // Can always switch to active (will swap)
      }
      return false;
    }

    // Setup starting Pokémon — before BENCH_GENERAL so bench area cannot bypass Active-first rule
    if (this.setupStartingPokemonDrag && this.currentDragContext.source === 'hand') {
      if (config.type === DropZoneType.BENCH_GENERAL) {
        return false;
      }
      return this.isSetupStartingDropZoneAllowed(config, isOccupied);
    }

    // Hand cards the server marked unplayable (e.g. already attached energy) cannot drop.
    if (
      this.currentDragContext.source === 'hand' &&
      !this.isHandCardPlayable(this.currentDragContext.card)
    ) {
      return false;
    }

    // Handle BENCH_GENERAL zone - only valid for Basic Pokemon (and fossils played as Basic) with open bench slots
    if (config.type === DropZoneType.BENCH_GENERAL) {
      const { card } = this.currentDragContext;
      if (this.canUseFromHandToBenchPlay(card) || this.canAssembleLegendFromHand(card)) {
        return false;
      }
      if (this.playsAsBasicPokemonFromHand(card)) {
        return this.findNextOpenBenchSlot(config.player) !== null;
      }
      return false;
    }

    // Hand to Board
    const { superType, stage, trainerType, card } = this.currentDragContext;

    // useFromHandToBench ability: open Bench slots when the ability is legal.
    // Evolution onto occupied hosts still falls through to the Stage 1/2 rules below.
    if (
      this.canUseFromHandToBenchPlay(card) &&
      config.type === DropZoneType.BENCH &&
      !isOccupied
    ) {
      return true;
    }

    // Dual LEGEND halves — both must be in hand; open Bench slots only
    if (this.canAssembleLegendFromHand(card)) {
      return config.type === DropZoneType.BENCH && !isOccupied;
    }

    // Basic Pokemon and Fossil items that play as Basic onto bench/active
    if (this.playsAsBasicPokemonFromHand(card)) {
      if (config.type === DropZoneType.BENCH || config.type === DropZoneType.ACTIVE) {
        return !isOccupied;
      }
      return false;
    }

    switch (superType) {
      case SuperType.POKEMON:
        // Evolution Pokemon need to target a matching base Pokemon
        if (stage === Stage.STAGE_1 || stage === Stage.STAGE_2 ||
          stage === Stage.VMAX || stage === Stage.VSTAR || stage === Stage.MEGA) {
          if (config.type === DropZoneType.BENCH || config.type === DropZoneType.ACTIVE) {
            return isOccupied; // Must have a Pokemon to evolve
          }
        }
        return false;

      case SuperType.TRAINER:
        // Stadium cards go to stadium zone
        if (trainerType === TrainerType.STADIUM) {
          return config.type === DropZoneType.STADIUM;
        }
        // Supporter cards can go to supporter zone or board zone (like items)
        if (trainerTypeIsSupporter(trainerType)) {
          return config.type === DropZoneType.SUPPORTER || config.type === DropZoneType.BOARD;
        }
        // Tool cards need to target a Pokemon
        if (trainerType === TrainerType.TOOL) {
          if (config.type !== DropZoneType.BENCH && config.type !== DropZoneType.ACTIVE) {
            return false;
          }
          if (!isOccupied) {
            return false;
          }
          const opponentTool = isOpponentAttachTool(card);
          return opponentTool
            ? config.player === PlayerType.TOP_PLAYER
            : config.player === PlayerType.BOTTOM_PLAYER;
        }
        // Item cards go to board zone
        return config.type === DropZoneType.BOARD;

      case SuperType.ENERGY:
        // Energy attaches to your own Pokemon
        return (config.type === DropZoneType.BENCH || config.type === DropZoneType.ACTIVE)
          && isOccupied
          && config.player === PlayerType.BOTTOM_PLAYER;

      default:
        return false;
    }
  }

  /**
   * Show valid drop zones based on current drag context
   */
  private showValidDropZones(): void {
    if (!this.currentDragContext) {
      return;
    }

    const { superType, stage, trainerType, card } = this.currentDragContext;

    if (this.setupStartingPokemonDrag && this.currentDragContext.source === 'hand') {
      for (const zone of this.dropZones) {
        if (this.isValidDropZone(zone)) {
          zone.setValid();
        } else {
          zone.hide();
        }
      }
      return;
    }

    for (const zone of this.dropZones) {
      const config = zone.getConfig();

      // useFromHandToBench: empty bench (ability) and/or occupied evo hosts
      if (cardHasUseFromHandToBenchPower(card)) {
        if (this.isValidDropZone(zone)) {
          zone.setValid();
        } else {
          zone.hide();
        }
        continue;
      }

      // Dual LEGEND: both halves in hand — open bench slots only
      if (this.canAssembleLegendFromHand(card)) {
        if (config.type === DropZoneType.BENCH && this.isValidDropZone(zone)) {
          zone.setValid();
        } else {
          zone.hide();
        }
        continue;
      }

      // When dragging a Basic Pokemon or a Fossil that benches as Basic: BENCH_GENERAL + active
      if (this.playsAsBasicPokemonFromHand(card)) {
        if (config.type === DropZoneType.BENCH_GENERAL) {
          if (this.isValidDropZone(zone)) {
            zone.setValid();
          } else {
            zone.hide();
          }
          continue;
        }
        if (config.type === DropZoneType.BENCH) {
          // Hide individual bench zones when dragging Pokemon
          zone.hide();
          continue;
        }
        // Show ACTIVE zone if valid
        if (config.type === DropZoneType.ACTIVE && this.isValidDropZone(zone)) {
          zone.setValid();
          continue;
        }
        // Hide other zones
        zone.hide();
        continue;
      }

      // When dragging a Trainer (Item or Supporter): Only show BOARD, hide SUPPORTER zone
      if (superType === SuperType.TRAINER) {
        if (trainerType === TrainerType.STADIUM) {
          // Stadium cards: Only show STADIUM zone
          if (config.type === DropZoneType.STADIUM && this.isValidDropZone(zone)) {
            zone.setValid();
          } else {
            zone.hide();
          }
          continue;
        }
        // Item and Supporter cards: Only show BOARD zone
        if (config.type === DropZoneType.BOARD && this.isValidDropZone(zone)) {
          zone.setValid();
        } else if (config.type === DropZoneType.SUPPORTER) {
          // Hide SUPPORTER zone when dragging Trainer
          zone.hide();
        } else {
          // Hide other zones
          zone.hide();
        }
        continue;
      }

      // For other card types (Evolution Pokemon, Energy, Tool), show individual BENCH/ACTIVE zones
      // Hide BENCH_GENERAL for these card types (they need specific targets)
      if (config.type === DropZoneType.BENCH_GENERAL) {
        zone.hide();
        continue;
      }

      if (this.isValidDropZone(zone)) {
        zone.setValid();
      } else {
        zone.hide();
      }
    }
  }

  /**
   * Update occupied zones from game state
   */
  updateOccupiedZones(
    bottomActive: boolean,
    bottomBench: boolean[],
    topActive: boolean,
    topBench: boolean[]
  ): void {
    this.occupiedZones.clear();

    if (bottomActive) {
      this.occupiedZones.add(`${PlayerType.BOTTOM_PLAYER}_${DropZoneType.ACTIVE}_0`);
    }
    bottomBench.forEach((occupied, i) => {
      if (occupied) {
        this.occupiedZones.add(`${PlayerType.BOTTOM_PLAYER}_${DropZoneType.BENCH}_${i}`);
      }
    });

    if (topActive) {
      this.occupiedZones.add(`${PlayerType.TOP_PLAYER}_${DropZoneType.ACTIVE}_0`);
    }
    topBench.forEach((occupied, i) => {
      if (occupied) {
        this.occupiedZones.add(`${PlayerType.TOP_PLAYER}_${DropZoneType.BENCH}_${i}`);
      }
    });

    // Update zone visual states
    for (const zone of this.dropZones) {
      const config = zone.getConfig();
      const zoneKey = `${config.player}_${config.type}_${config.index}`;
      if (this.occupiedZones.has(zoneKey)) {
        zone.setOccupied();
      }
    }
  }

  /**
   * Start dragging a card
   */
  private startDrag(
    card: Object3D,
    event: MouseEvent,
    camera: Camera
  ): void {
    // Kill any existing animations on this card to prevent conflicts with hover
    gsap.killTweensOf(card.position);
    gsap.killTweensOf(card.rotation);
    gsap.killTweensOf(card.scale);

    this.isDragging = true;
    this.draggedCard = card;
    this.draggedCardHandIndex = card.userData.handIndex;
    this.draggedCardIsBoardCard = card.userData?.isBoardCard === true;

    // Store original position/rotation/scale (and quaternion for board cards)
    this.draggedCardOriginalPosition.copy(card.position);
    this.draggedCardOriginalRotation.copy(card.rotation);
    this.draggedCardOriginalQuaternion.copy(card.quaternion);
    this.draggedCardOriginalScale.copy(card.scale);

    // Create horizontal drag plane at elevated level (Y=2.0) to prevent clipping
    // This matches the minimum height we enforce during drag
    this.dragPlane.setFromNormalAndCoplanarPoint(
      new Vector3(0, 1, 0),
      new Vector3(0, 2.0, 0)
    );

    // Calculate offset between mouse ray and card's WORLD position
    // First, get the card's current world position
    const cardWorldPos = new Vector3();
    card.getWorldPosition(cardWorldPos);

    // Calculate intersection with drag plane
    const intersection = new Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      // Calculate offset to maintain relative position
      this.dragOffset.subVectors(cardWorldPos, intersection);
    } else {
      // Fallback: set offset to zero if no intersection
      this.dragOffset.set(0, 0, 0);
    }

    // Initialize previous position for velocity calculation
    this.previousDragPosition.copy(cardWorldPos);
    this.dragVelocity.set(0, 0, 0);

    // Visual feedback - lift card high enough to prevent clipping when rotated
    // Card is ~3.5 units tall, rotated up to ~0.3 radians, so need at least 3.5 * sin(0.3) ≈ 1.05
    // Add extra margin for safety: lift to Y=3.0 (well above board at Y=0.1)
    const liftHeight = 3.0;

    // Calculate local Y position for the lift (cardWorldPos already calculated above)
    if (card.parent) {
      const localLiftPos = card.parent.worldToLocal(new Vector3(cardWorldPos.x, liftHeight, cardWorldPos.z));
      gsap.to(card.position, {
        y: localLiftPos.y,
        duration: 0.2,
        ease: 'power2.out'
      });
    } else {
      gsap.to(card.position, {
        y: liftHeight,
        duration: 0.2,
        ease: 'power2.out'
      });
    }

    gsap.to(card.scale, {
      x: 1.3, y: 1.3, z: 1.3,
      duration: 0.2,
      ease: 'power2.out'
    });

    // Initialize rotation to flat (will be updated by physics during drag)
    gsap.to(card.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.2,
      ease: 'power2.out'
    });
  }

  /**
   * Check if an evolution card can evolve a specific Pokemon card
   */
  private isValidEvolutionTarget(evolutionCard: PokemonCard, targetPokemon: PokemonCard): boolean {
    if (!evolutionCard || !targetPokemon) {
      return false;
    }

    // Check if evolution card's evolvesFrom matches target Pokemon's name
    if (evolutionCard.evolvesFrom === targetPokemon.name) {
      return true;
    }

    // Check if target's name is a variant of evolvesFrom (e.g. "Eevee ex" for evolvesFrom "Eevee")
    if (evolutionCard.evolvesFrom && targetPokemon.name &&
      targetPokemon.name.startsWith(evolutionCard.evolvesFrom + ' ')) {
      return true;
    }

    // Check if target Pokemon's evolvesTo includes the evolution card name
    if (targetPokemon.evolvesTo && targetPokemon.evolvesTo.includes(evolutionCard.name)) {
      return true;
    }

    // Check if target Pokemon's evolvesToStage includes the evolution card stage
    if (targetPokemon.evolvesToStage && targetPokemon.evolvesToStage.includes(evolutionCard.stage)) {
      return true;
    }

    // Check if target Pokemon's evolvesFromBase includes the evolution card's evolvesFrom (e.g. Eevee ex)
    if (Array.isArray(targetPokemon.evolvesFromBase) && targetPokemon.evolvesFromBase.length > 0 && targetPokemon.evolvesFromBase.includes(evolutionCard.evolvesFrom)) {
      return true;
    }

    return false;
  }

  /**
   * Handle mouse move during drag
   */
  onMouseMoveDrag(
    event: MouseEvent,
    camera: Camera,
    scene: Scene,
    canvas: HTMLCanvasElement
  ): void {
    // Check if we have a pending drag that needs to be started
    if (this.pendingDragCard && !this.isDragging) {
      const dx = event.clientX - this.mouseDownPosition.x;
      const dy = event.clientY - this.mouseDownPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= this.clickThreshold) {
        // Start actual drag now that threshold is exceeded
        this.startDrag(this.pendingDragCard, event, this.pendingDragCamera!);
        this.createDragContext(
          this.pendingDragCard,
          this.pendingDragCard.userData.isHandCard ? 'hand' : 'board'
        );
        this.pendingDragCard = null;
        this.pendingDragCamera = null;
      }
    }

    if (!this.isDragging || !this.draggedCard) {
      return;
    }

    // Update raycaster
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, camera);

    // Intersect with drag plane
    const intersection = new Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      // Calculate target world position
      const targetWorldPos = intersection.add(this.dragOffset);

      // Allow dragging anywhere - don't clamp to board bounds
      // This allows cards to be dragged to hand area (z=30) and anywhere else

      // Maintain lifted height to prevent clipping when rotated
      // Card is ~3.5 units tall, max rotation ~0.3 radians
      // Need at least: 3.5 * sin(0.3) ≈ 1.05, plus margin = 3.0
      const liftHeight = 3.0;
      targetWorldPos.y = liftHeight;

      // Calculate velocity for physics-based rotation (using X and Z only for rotation)
      // Use previous position to calculate velocity (change per frame)
      const previousPos2D = new Vector3(this.previousDragPosition.x, 0, this.previousDragPosition.z);
      const targetPos2D = new Vector3(targetWorldPos.x, 0, targetWorldPos.z);
      this.dragVelocity.subVectors(targetPos2D, previousPos2D);

      // Update previous position for next frame
      this.previousDragPosition.copy(targetWorldPos);

      // Convert to local space for the card's parent
      if (this.draggedCard.parent) {
        const localPos = this.draggedCard.parent.worldToLocal(targetWorldPos.clone());
        this.draggedCard.position.copy(localPos);
      } else {
        this.draggedCard.position.copy(targetWorldPos);
      }

      // Apply physics-based rotation based on drag direction
      // Skip for board cards (retreat) - tilt causes tool overlays to disappear on return
      const velocityMagnitude = this.dragVelocity.length();
      if (velocityMagnitude > 0.01 && !this.draggedCard?.userData?.isBoardCard) {
        // Check if this is a hand card for enhanced physics
        const isHandCard = this.draggedCard?.userData?.isHandCard === true;

        // Scale factor for rotation intensity (double for hand cards)
        const rotationScale = isHandCard ? 0.6 : 0.3;
        const maxRotation = isHandCard ? 0.6 : 0.3; // Max rotation in radians (~34 degrees for hand, ~17 for board)

        // Calculate rotation based on drag direction
        // X rotation (pitch): tilt up/down based on Z velocity (forward/back)
        // Z rotation (roll): tilt left/right based on X velocity
        const targetRotationX = Math.max(-maxRotation, Math.min(maxRotation,
          -this.dragVelocity.z * rotationScale));
        const targetRotationZ = Math.max(-maxRotation, Math.min(maxRotation,
          -this.dragVelocity.x * rotationScale));

        // Smoothly animate to target rotation
        gsap.to(this.draggedCard.rotation, {
          x: targetRotationX,
          z: targetRotationZ,
          duration: 0.1,
          ease: 'power2.out'
        });
      }

      // Highlight drop zones using world position
      const worldPos = new Vector3();
      this.draggedCard.getWorldPosition(worldPos);

      // Check if card is over hand area
      const isOverHand = this.isOverHandArea(worldPos);

      // Check if dragging energy or tool card over Pokemon
      const handPlayable =
        !this.currentDragContext ||
        this.currentDragContext.source !== 'hand' ||
        this.isHandCardPlayable(this.currentDragContext.card);
      const isEnergyOrTool = !!(
        handPlayable &&
        this.currentDragContext &&
        (this.currentDragContext.superType === SuperType.ENERGY ||
          this.currentDragContext.trainerType === TrainerType.TOOL)
      );

      // Check if dragging evolution card over Pokemon
      const isEvolutionCard = !!(
        handPlayable &&
        this.currentDragContext &&
        this.currentDragContext.superType === SuperType.POKEMON &&
        this.currentDragContext.stage !== undefined &&
        this.currentDragContext.stage !== Stage.BASIC &&
        !this.actsAsDirectBoardPlayFromHand(this.currentDragContext.card)
      );

      // Check if retreat drag (board card for active/bench swap)
      const isRetreatDrag = this.currentDragContext?.source === 'board';

      // Detect Pokemon card under dragged card (for energy/tool cards and evolution cards)
      let pokemonUnderCard: Object3D | null = null;
      if ((isEnergyOrTool || isEvolutionCard) && !isOverHand && this.currentDragContext) {
        const allowedPlayer = this.allowedAttachTargetPlayer(this.currentDragContext);
        pokemonUnderCard = this.findPokemonBoardCardForAttachHover(
          event,
          camera,
          canvas,
          worldPos,
          this.currentDragContext,
          {
            allowedPlayer,
            isEvolutionCard: !!isEvolutionCard,
            isEnergyOrTool: !!isEnergyOrTool,
          },
        );
      }

      let validRetreatZoneUnderCard = false;
      let pokemonInRetreatZone: Object3D | null = null;
      if (isRetreatDrag && !isOverHand) {
        // For retreat: find valid drop zone under card, then get Pokemon in that zone (if any)
        const retreatZone = this.findValidDropZone(worldPos);
        if (retreatZone) {
          validRetreatZoneUnderCard = true;
          const config = retreatZone.getConfig();
          const slotType = config.type === DropZoneType.ACTIVE ? SlotType.ACTIVE : SlotType.BENCH;
          pokemonInRetreatZone = this.getPokemonInZone(config.player, slotType, config.index);
        }
      }

      // Handle Pokemon hover effects (for energy/tool cards, evolution cards, and retreat)
      const shouldShowHoverEffects = isEnergyOrTool || isEvolutionCard ||
        (isRetreatDrag && pokemonInRetreatZone !== null);
      const pokemonForHoverEffects = pokemonUnderCard ?? pokemonInRetreatZone;

      if (shouldShowHoverEffects && pokemonForHoverEffects) {
        if (pokemonForHoverEffects !== this.hoveredPokemonCard) {
          this.beginPokemonHoverEffects(pokemonForHoverEffects);
        } else {
          this.maintainPokemonHoverEffects(pokemonForHoverEffects);
        }
      } else if (this.hoveredPokemonCard) {
        if (!shouldShowHoverEffects) {
          this.endPokemonHoverEffects();
          this.hoverMissStreak = 0;
        } else {
          this.hoverMissStreak += 1;
          if (this.hoverMissStreak >= Board3dInteractionService.HOVER_CLEAR_MISS_FRAMES) {
            this.endPokemonHoverEffects();
            this.hoverMissStreak = 0;
          }
        }
      }

      // Determine scale based on priority:
      // 1. Over Pokemon (energy/tool/evolution): 0.7
      // 2. Over valid retreat zone: 0.7
      // 3. Over hand area (from hand): 1.05
      // 4. Otherwise: 1.3 (normal drag scale)
      let targetScale = 1.3; // Default drag scale
      if ((isEnergyOrTool || isEvolutionCard) && pokemonUnderCard) {
        targetScale = 0.7; // Shrink to 70% when over Pokemon
      } else if (isRetreatDrag && validRetreatZoneUnderCard) {
        targetScale = 0.7; // Shrink to 70% when over valid retreat target
      } else if (isOverHand && this.currentDragContext?.source === 'hand') {
        targetScale = 1.05; // Slight increase when over hand area
      }

      // Apply scale animation (kill previous tween to prevent conflicting animations)
      gsap.killTweensOf(this.draggedCard.scale);
      gsap.to(this.draggedCard.scale, {
        x: targetScale,
        y: targetScale,
        z: targetScale,
        duration: 0.15,
        ease: 'power2.out'
      });

      // Only highlight drop zones if not over hand area
      if (!isOverHand) {
        this.highlightNearestDropZone(worldPos, scene);
      } else {
        // Hide drop zones when over hand area
        this.hideAllDropZones();
      }
    }
  }

  /**
   * Check if the mouse movement from mousedown to mouseup constitutes a click
   */
  private isClick(event: MouseEvent): boolean {
    const dx = event.clientX - this.mouseDownPosition.x;
    const dy = event.clientY - this.mouseDownPosition.y;
    return Math.sqrt(dx * dx + dy * dy) < this.clickThreshold;
  }

  private findDropZoneByType(
    type: DropZoneType,
    player: PlayerType,
    index: number = 0,
  ): Board3dDropZone | null {
    return this.dropZones.find(z => {
      const c = z.getConfig();
      return c.type === type && c.player === player && c.index === index;
    }) ?? null;
  }

  private findDropZoneForCardTarget(target: CardTarget, ctx: DragContext): Board3dDropZone | null {
    if (target.slot === SlotType.ACTIVE) {
      return this.findDropZoneByType(DropZoneType.ACTIVE, target.player, target.index);
    }
    if (target.slot === SlotType.BENCH) {
      return this.findDropZoneByType(DropZoneType.BENCH, target.player, target.index);
    }
    if (target.slot === SlotType.BOARD) {
      if (ctx.trainerType === TrainerType.STADIUM) {
        return this.findDropZoneByType(DropZoneType.STADIUM, PlayerType.BOTTOM_PLAYER, 0);
      }
      return this.findDropZoneByType(DropZoneType.BOARD, target.player, target.index);
    }
    return null;
  }

  private findAllValidPokemonAttachTargets(ctx: DragContext): CardTarget[] {
    if (!this.isHandCardPlayable(ctx.card)) {
      return [];
    }
    const allowedPlayer = this.allowedAttachTargetPlayer(ctx);
    if (allowedPlayer === null) {
      return [];
    }

    const isEvolutionCard =
      ctx.superType === SuperType.POKEMON &&
      ctx.stage !== undefined &&
      ctx.stage !== Stage.BASIC &&
      !this.actsAsDirectBoardPlayFromHand(ctx.card);
    const checkOpponentEx = ctx.trainerType === TrainerType.TOOL && isOpponentAttachTool(ctx.card);
    const benchSize =
      allowedPlayer === PlayerType.BOTTOM_PLAYER
        ? this.currentBenchSizes.bottom
        : this.currentBenchSizes.top;

    const candidates: Array<{ slot: SlotType; index: number }> = [{ slot: SlotType.ACTIVE, index: 0 }];
    for (let i = 0; i < benchSize; i++) {
      candidates.push({ slot: SlotType.BENCH, index: i });
    }

    const targets: CardTarget[] = [];

    for (const { slot, index } of candidates) {
      const dropType = slot === SlotType.ACTIVE ? DropZoneType.ACTIVE : DropZoneType.BENCH;
      const zoneKey = `${allowedPlayer}_${dropType}_${index}`;
      if (!this.occupiedZones.has(zoneKey)) {
        continue;
      }

      const pokemon = this.getPokemonInZone(allowedPlayer, slot, index);

      if (checkOpponentEx) {
        if (!pokemon) {
          continue;
        }
        if (!isOpponentPokemonExToolTarget(pokemon.userData.cardList as PokemonCardList)) {
          continue;
        }
      }

      if (isEvolutionCard) {
        if (!pokemon) {
          continue;
        }
        const evolutionCard = ctx.card as PokemonCard;
        const targetPokemonCard = this.getPokemonCardFromBoardObject(pokemon);
        if (!targetPokemonCard || !this.isValidEvolutionTarget(evolutionCard, targetPokemonCard)) {
          continue;
        }
        // Evolution hosts are chosen by evo rules + occupancy — do not gate on drop-zone
        // stage enums (those can miss valid Bench hosts while still allowing Active).
        targets.push({ player: allowedPlayer, slot, index });
        continue;
      }

      const dropZone = this.findDropZoneByType(dropType, allowedPlayer, index);
      if (dropZone && this.isValidDropZone(dropZone)) {
        targets.push({ player: allowedPlayer, slot, index });
      }
    }

    return targets;
  }

  private countBoardPokemonForAttach(player: PlayerType): number {
    let count = 0;
    if (this.occupiedZones.has(`${player}_${DropZoneType.ACTIVE}_0`)) {
      count += 1;
    }
    const benchSize =
      player === PlayerType.BOTTOM_PLAYER
        ? this.currentBenchSizes.bottom
        : this.currentBenchSizes.top;
    for (let i = 0; i < benchSize; i++) {
      if (this.occupiedZones.has(`${player}_${DropZoneType.BENCH}_${i}`)) {
        count += 1;
      }
    }
    return count;
  }

  private isAttachPlayFromHand(ctx: DragContext): boolean {
    if (this.actsAsDirectBoardPlayFromHand(ctx.card)) {
      return false;
    }
    // Prefer Excitedive empty-bench click when that ability is legal.
    if (this.canUseFromHandToBenchPlay(ctx.card)) {
      return false;
    }
    return (
      ctx.superType === SuperType.ENERGY ||
      ctx.trainerType === TrainerType.TOOL ||
      (ctx.superType === SuperType.POKEMON &&
        ctx.stage !== undefined &&
        ctx.stage !== Stage.BASIC)
    );
  }

  /**
   * Auto-attach when unambiguous; otherwise the player must click a glowing target.
   */
  private resolveAutoAttachTarget(ctx: DragContext, targets: CardTarget[]): CardTarget | null {
    if (targets.length === 0) {
      return null;
    }

    const isEvolution =
      ctx.superType === SuperType.POKEMON &&
      ctx.stage !== undefined &&
      ctx.stage !== Stage.BASIC;

    if (isEvolution || ctx.superType === SuperType.ENERGY || ctx.trainerType === TrainerType.TOOL) {
      const allowedPlayer = this.allowedAttachTargetPlayer(ctx);
      const pokemonOnBoard =
        allowedPlayer != null ? this.countBoardPokemonForAttach(allowedPlayer) : targets.length;
      // Only skip the picker when there is literally one Pokémon on the board.
      // With Active + Bench in play, always highlight every legal host (never silently prefer Active).
      if (pokemonOnBoard <= 1) {
        return targets[0] ?? null;
      }
      return null;
    }

    return targets.length === 1 ? targets[0] : null;
  }

  private findDefaultPokemonAttachTarget(ctx: DragContext): CardTarget | null {
    const targets = this.findAllValidPokemonAttachTargets(ctx);
    return this.resolveAutoAttachTarget(ctx, targets);
  }

  private resolveDefaultPlayZone(ctx: DragContext): CardTarget | null {
    const { card, superType, stage, trainerType } = ctx;

    if (this.canUseFromHandToBenchPlay(card)) {
      const benchZone = this.findNextOpenBenchSlot(PlayerType.BOTTOM_PLAYER);
      if (benchZone && this.isValidDropZone(benchZone)) {
        return this.configToCardTarget(benchZone.getConfig());
      }
      // Ability legal but no open bench — fall through to evolution if possible.
    }

    if (this.canAssembleLegendFromHand(card)) {
      const benchZone = this.findNextOpenBenchSlot(PlayerType.BOTTOM_PLAYER);
      if (benchZone && this.isValidDropZone(benchZone)) {
        return this.configToCardTarget(benchZone.getConfig());
      }
      return null;
    }

    if (this.playsAsBasicPokemonFromHand(card)) {
      const activeZone = this.findDropZoneByType(DropZoneType.ACTIVE, PlayerType.BOTTOM_PLAYER, 0);
      if (activeZone && this.isValidDropZone(activeZone)) {
        return this.configToCardTarget(activeZone.getConfig());
      }
      const benchZone = this.findNextOpenBenchSlot(PlayerType.BOTTOM_PLAYER);
      if (benchZone && this.isValidDropZone(benchZone)) {
        return this.configToCardTarget(benchZone.getConfig());
      }
      return null;
    }

    if (
      superType === SuperType.POKEMON &&
      stage !== undefined &&
      stage !== Stage.BASIC
    ) {
      return this.findDefaultPokemonAttachTarget(ctx);
    }

    if (superType === SuperType.ENERGY || trainerType === TrainerType.TOOL) {
      return this.findDefaultPokemonAttachTarget(ctx);
    }

    if (trainerType === TrainerType.STADIUM) {
      const stadiumZone = this.findDropZoneByType(DropZoneType.STADIUM, PlayerType.BOTTOM_PLAYER, 0);
      return stadiumZone && this.isValidDropZone(stadiumZone)
        ? this.configToCardTarget(stadiumZone.getConfig())
        : null;
    }

    if (trainerTypeIsSupporter(trainerType)) {
      const boardZone = this.findDropZoneByType(DropZoneType.BOARD, PlayerType.BOTTOM_PLAYER, 0);
      if (boardZone && this.isValidDropZone(boardZone)) {
        return this.configToCardTarget(boardZone.getConfig());
      }
      const supporterZone = this.findDropZoneByType(DropZoneType.SUPPORTER, PlayerType.BOTTOM_PLAYER, 0);
      return supporterZone && this.isValidDropZone(supporterZone)
        ? this.configToCardTarget(supporterZone.getConfig())
        : null;
    }

    if (superType === SuperType.TRAINER) {
      const boardZone = this.findDropZoneByType(DropZoneType.BOARD, PlayerType.BOTTOM_PLAYER, 0);
      return boardZone && this.isValidDropZone(boardZone)
        ? this.configToCardTarget(boardZone.getConfig())
        : null;
    }

    return null;
  }

  private buildHandPlayDropResult(handIndex: number, zone: CardTarget): DropResult | null {
    const ctx = this.currentDragContext;
    if (!ctx || handIndex < 0) {
      return null;
    }

    const emptyBenchAbility = this.isEmptyBenchHandAbilityDrop(ctx.card, zone);
    const isAttachDropHand =
      !this.actsAsDirectBoardPlayFromHand(ctx.card) &&
      !emptyBenchAbility &&
      (ctx.superType === SuperType.ENERGY ||
        ctx.trainerType === TrainerType.TOOL ||
        (ctx.superType === SuperType.POKEMON &&
          ctx.stage !== undefined &&
          ctx.stage !== Stage.BASIC));

    const dropZone = this.findDropZoneForCardTarget(zone, ctx);
    const config = dropZone?.getConfig();

    if (this.draggedCard) {
      gsap.killTweensOf(this.draggedCard.position);
      gsap.killTweensOf(this.draggedCard.rotation);
      gsap.killTweensOf(this.draggedCard.scale);
    }

    if (isAttachDropHand) {
      if (ctx.superType === SuperType.ENERGY) {
        const ejected = this.handService.detachCardForBoardPlay(handIndex, this.worldContentRoot);
        if (ejected) {
          return {
            action: 'playCard',
            handIndex,
            zone,
            playCardFlight: {
              board3dCard: ejected,
              targetWorld: new Vector3(),
              endScale: 1,
              endRotationY: 0,
              dropZoneType: DropZoneType.BENCH,
              energyAttach: {
                attachTarget: zone,
                energyCard: ctx.card,
              },
            },
          };
        }
      }
      const ejected = this.handService.detachCardForBoardPlay(handIndex, this.worldContentRoot);
      if (ejected) {
        return {
          action: 'playCard',
          handIndex,
          zone,
          playCardFlight: {
            board3dCard: ejected,
            targetWorld: new Vector3(),
            endScale: 1,
            endRotationY: 0,
            dropZoneType: DropZoneType.BENCH,
            holdForAttach: true,
          },
        };
      }
      return { action: 'playCard', handIndex, zone };
    }

    if (config) {
      const landing = this.getHandPlayLandingTransform(config, ctx.card, ctx.trainerType);
      const ejected = this.handService.detachCardForBoardPlay(handIndex, this.worldContentRoot);
      if (ejected) {
        return {
          action: 'playCard',
          handIndex,
          zone,
          playCardFlight: {
            board3dCard: ejected,
            targetWorld: landing.world,
            endScale: landing.endScale,
            endRotationY: landing.rotationY,
            dropZoneType: config.type,
            trainerType: ctx.trainerType,
          },
        };
      }
    }

    return { action: 'playCard', handIndex, zone };
  }

  /**
   * Left-click on a hand card: play to the default zone (active, bench, attach target, etc.).
   */
  private tryPlayHandCardFromClick(handCard: Object3D): DropResult | null {
    if (!handCard.userData.isHandCard) {
      return null;
    }

    const handIndex = handCard.userData.handIndex ?? -1;
    if (handIndex < 0) {
      return null;
    }

    this.createDragContext(handCard, 'hand');
    const ctx = this.currentDragContext;
    if (!ctx) {
      return null;
    }

    // Server playableCardIds gate (no glow = not legal this turn).
    if (!this.isHandCardPlayable(ctx.card)) {
      this.currentDragContext = null;
      this.hideAllDropZones();
      return null;
    }

    if (this.isAttachPlayFromHand(ctx)) {
      const eligibleTargets = this.findAllValidPokemonAttachTargets(ctx);
      if (eligibleTargets.length === 0) {
        this.currentDragContext = null;
        this.hideAllDropZones();
        return null;
      }

      const autoTarget = this.resolveAutoAttachTarget(ctx, eligibleTargets);
      if (!autoTarget) {
        this.currentDragContext = null;
        this.hideAllDropZones();
        return {
          action: 'pickAttachTarget',
          handIndex,
          eligibleTargets,
        };
      }

      this.draggedCard = handCard;
      this.draggedCardHandIndex = handIndex;
      const result = this.buildHandPlayDropResult(handIndex, autoTarget);
      this.resetDragState();
      this.hideAllDropZones();
      return result;
    }

    if (cardCanAssembleLegendFromHand(ctx.card, this.bottomHandCards)) {
      this.resetDragState();
      this.hideAllDropZones();
      return null;
    }

    const zone = this.resolveDefaultPlayZone(ctx);
    if (!zone) {
      this.currentDragContext = null;
      this.hideAllDropZones();
      return null;
    }

    this.draggedCard = handCard;
    this.draggedCardHandIndex = handIndex;
    const result = this.buildHandPlayDropResult(handIndex, zone);
    this.resetDragState();
    this.hideAllDropZones();
    return result;
  }

  /**
   * Left-click on hand cards plays them; left-click on in-play board cards opens the info pane.
   * Right-click on any card opens the info pane via contextmenu.
   */
  private resolvePointerUpOnCard(
    card: Object3D,
    event: MouseEvent,
    isSelectionActive: boolean,
    isHandPlayTargetSelection: boolean,
  ): DropResult | null {
    if (isHandPlayTargetSelection && card.userData.isHandCard && event.button !== 2) {
      return this.tryPlayHandCardFromClick(card);
    }

    if (isSelectionActive) {
      return { action: 'click', clickedCard: card };
    }

    if (event.button === 2) {
      return null;
    }

    if (card.userData.isHandCard) {
      const cardData = card.userData.cardData as Card | undefined;
      if (cardCanAssembleLegendFromHand(cardData, this.bottomHandCards)) {
        return { action: 'click', clickedCard: card };
      }
      return this.tryPlayHandCardFromClick(card);
    }

    return { action: 'click', clickedCard: card };
  }

  /**
   * Handle mouse up - end dragging or detect click
   */
  onMouseUp(
    event: MouseEvent,
    camera: Camera,
    scene: Scene,
    canvas: HTMLCanvasElement,
    isSelectionActive: boolean = false,
    isHandPlayTargetSelection: boolean = false,
  ): DropResult | null {
    // Clear pending drag state
    this.pendingDragCard = null;
    this.pendingDragCamera = null;

    // Check for click on non-draggable card (board cards that aren't active/bench)
    if (!this.isDragging && this.mouseDownCard && this.isClick(event)) {
      const clickedCard = this.mouseDownCard;
      this.mouseDownCard = null;
      return this.resolvePointerUpOnCard(clickedCard, event, isSelectionActive, isHandPlayTargetSelection);
    }

    if (!this.isDragging || !this.draggedCard) {
      const hadMouseDownCard = this.mouseDownCard;
      this.mouseDownCard = null;
      if (isHandPlayTargetSelection && this.isClick(event) && !hadMouseDownCard) {
        return { action: 'cancelHandPlayTarget' };
      }
      return null;
    }

    // Check if it was actually a click (no significant movement)
    if (this.isClick(event)) {
      const clickedCard = this.draggedCard;
      const playOnClick =
        !isSelectionActive &&
        event.button !== 2 &&
        clickedCard.userData.isHandCard;
      let playResult: DropResult | null = null;
      if (playOnClick) {
        const cardData = clickedCard.userData.cardData as Card | undefined;
        if (cardCanAssembleLegendFromHand(cardData, this.bottomHandCards)) {
          this.returnCardToHand(this.draggedCard);
          this.resetDragState();
          this.hideAllDropZones();
          this.mouseDownCard = null;
          return { action: 'click', clickedCard: clickedCard };
        }
        playResult = this.tryPlayHandCardFromClick(clickedCard);
      }

      if (!playResult) {
        this.returnCardToHand(this.draggedCard);
      }

      this.resetDragState();
      this.hideAllDropZones();
      this.mouseDownCard = null;

      if (playResult) {
        return playResult;
      }

      if (!playOnClick) {
        return this.resolvePointerUpOnCard(
          clickedCard,
          event,
          isSelectionActive,
          isHandPlayTargetSelection,
        );
      }

      return null;
    }

    // Get world position for checks
    const worldPos = new Vector3();
    this.draggedCard.getWorldPosition(worldPos);

    // Check if card is over hand area first (priority over drop zones)
    const isOverHand = this.isOverHandArea(worldPos);

    let result: DropResult | null = null;

    // If over hand area and card came from hand, return to hand
    if (isOverHand && this.currentDragContext?.source === 'hand') {
      this.returnCardToHand(this.draggedCard);
      this.resetDragState();
      this.hideAllDropZones();
      this.mouseDownCard = null;
      return null; // No action needed, card returned to hand
    }

    const ctx = this.currentDragContext;
    const mayBeEvoOrAttach =
      !!ctx &&
      ctx.source === 'hand' &&
      this.isHandCardPlayable(ctx.card) &&
      !this.actsAsDirectBoardPlayFromHand(ctx.card) &&
      (ctx.superType === SuperType.ENERGY ||
        ctx.trainerType === TrainerType.TOOL ||
        (ctx.superType === SuperType.POKEMON &&
          ctx.stage !== undefined &&
          ctx.stage !== Stage.BASIC));

    // Attach drops: prefer Pokemon under pointer (opponent board has no drop zones)
    const opponentAttachTool =
      ctx?.trainerType === TrainerType.TOOL && ctx && isOpponentAttachTool(ctx.card);
    let zone: CardTarget | undefined;
    if (mayBeEvoOrAttach && ctx) {
      zone = this.findPokemonAttachTargetFromPointer(event, camera, canvas, ctx) ?? undefined;
    }
    if (!zone) {
      const dropZone = this.findValidDropZone(worldPos);
      if (dropZone) {
        const config = dropZone.getConfig();
        if (!opponentAttachTool || config.player === PlayerType.TOP_PLAYER) {
          zone = this.configToCardTarget(config);
        }
      }
    }
    // Empty-bench Excitedive is a direct play (flight); occupied evo hosts are attach.
    const isAttachDropHand =
      mayBeEvoOrAttach &&
      !!ctx &&
      !!zone &&
      !this.isEmptyBenchHandAbilityDrop(ctx.card, zone);

    if (zone) {
      const dropZoneForFlight = this.findValidDropZone(worldPos);
      const config = dropZoneForFlight?.getConfig();
      const handIndex = this.draggedCard?.userData?.handIndex ?? this.draggedCardHandIndex;

      if (
        this.setupStartingPokemonDrag &&
        this.currentDragContext?.source === 'hand' &&
        handIndex >= 0
      ) {
        gsap.killTweensOf(this.draggedCard!.position);
        gsap.killTweensOf(this.draggedCard!.rotation);
        gsap.killTweensOf(this.draggedCard!.scale);

        let playCardFlight: PlayCardFlightPayload | undefined;
        if (this.draggedCard && config) {
          const zoneKey = `${config.player}_${config.type}_${config.index}`;
          const isOccupied = this.occupiedZones.has(zoneKey);
          if (!this.isSetupStartingDropZoneAllowed(config, isOccupied)) {
            this.returnCardToHand(this.draggedCard);
          } else {
            const landing = this.getHandPlayLandingTransform(
              config,
              this.currentDragContext?.card,
              this.currentDragContext?.trainerType,
            );
            const ejected = this.handService.liftHandCardForSetupAnimation(handIndex, this.worldContentRoot);
            if (ejected) {
              playCardFlight = {
                board3dCard: ejected,
                targetWorld: landing.world,
                endScale: landing.endScale,
                endRotationY: landing.rotationY,
                dropZoneType: config.type,
              };
            } else {
              this.returnCardToHand(this.draggedCard);
            }
          }
        } else if (this.draggedCard) {
          this.returnCardToHand(this.draggedCard);
        }

        this.resetDragState();
        this.hideAllDropZones();
        this.mouseDownCard = null;
        if (!playCardFlight) {
          return null;
        }
        return {
          action: 'setupSelectCard',
          handIndex,
          zone,
          playCardFlight,
        };
      }

      const useHandPlayFlight =
        this.currentDragContext?.source === 'hand' && this.draggedCard && !isAttachDropHand;

      // Kill drag tweens; keep scale for cosmetic hand→board flight (still ~1.3 from drag)
      if (this.draggedCard) {
        gsap.killTweensOf(this.draggedCard.position);
        gsap.killTweensOf(this.draggedCard.rotation);
        gsap.killTweensOf(this.draggedCard.scale);
        if (!useHandPlayFlight) {
          this.draggedCard.scale.set(1, 1, 1);
        }
      }

      if (this.currentDragContext?.source === 'board') {
        // Retreat action
        const originalTarget = this.currentDragContext.originalTarget;
        if (originalTarget && config) {
          result = {
            action: 'retreat',
            benchIndex: originalTarget.slot === SlotType.ACTIVE
              ? config.index  // Active -> Bench: benchIndex is destination
              : originalTarget.index, // Bench -> Active: benchIndex is source
            zone
          };
        }
      } else {
        // Play card from hand - attach drops (energy/tool/evolution) removed optimistically for instant feedback
        // If play fails, board component restores hand via syncHand.
        const handIndex = this.draggedCard?.userData?.handIndex ?? this.draggedCardHandIndex;

        if (this.draggedCard && isAttachDropHand) {
          if (handIndex >= 0) {
            if (ctx.superType === SuperType.ENERGY) {
              const ejected = this.handService.detachCardForBoardPlay(handIndex, this.worldContentRoot);
              if (ejected) {
                result = {
                  action: 'playCard',
                  handIndex,
                  zone,
                  playCardFlight: {
                    board3dCard: ejected,
                    targetWorld: new Vector3(),
                    endScale: 1,
                    endRotationY: 0,
                    dropZoneType: DropZoneType.BENCH,
                    energyAttach: {
                      attachTarget: zone,
                      energyCard: ctx.card,
                    },
                  },
                };
              } else {
                result = {
                  action: 'playCard',
                  handIndex,
                  zone,
                };
              }
            } else {
              const ejected = this.handService.detachCardForBoardPlay(handIndex, this.worldContentRoot);
              if (ejected) {
                result = {
                  action: 'playCard',
                  handIndex,
                  zone,
                  playCardFlight: {
                    board3dCard: ejected,
                    targetWorld: new Vector3(),
                    endScale: 1,
                    endRotationY: 0,
                    dropZoneType: DropZoneType.BENCH,
                    holdForAttach: true,
                  },
                };
              } else {
                result = {
                  action: 'playCard',
                  handIndex,
                  zone,
                };
              }
            }
          } else {
            result = {
              action: 'playCard',
              handIndex,
              zone,
            };
          }
        } else if (this.draggedCard && handIndex >= 0 && config) {
          const landing = this.getHandPlayLandingTransform(
            config,
            this.currentDragContext?.card,
            this.currentDragContext?.trainerType
          );
          const ejected = this.handService.detachCardForBoardPlay(handIndex, this.worldContentRoot);
          if (ejected) {
            result = {
              action: 'playCard',
              handIndex,
              zone,
              playCardFlight: {
                board3dCard: ejected,
                targetWorld: landing.world,
                endScale: landing.endScale,
                endRotationY: landing.rotationY,
                dropZoneType: config.type,
                trainerType: this.currentDragContext?.trainerType
              }
            };
          } else {
            this.returnCardToHand(this.draggedCard);
            result = {
              action: 'playCard',
              handIndex,
              zone
            };
          }
        } else {
          result = {
            action: 'playCard',
            handIndex: handIndex >= 0 ? handIndex : this.draggedCardHandIndex,
            zone
          };
        }
      }
    } else {
      // Invalid drop - return to original position
      this.returnCardToHand(this.draggedCard);
    }

    // Reset drag state
    this.resetDragState();
    this.hideAllDropZones();
    this.mouseDownCard = null;

    return result;
  }

  /**
   * World position and final pose for a hand card animating onto a drop zone (matches board sync conventions).
   * Supporters use the large BOARD hit target but the card is played to the supporter slot — land there for the flight.
   */
  private getHandPlayLandingTransform(
    config: DropZoneConfig,
    card?: Card,
    dragTrainerType?: TrainerType
  ): {
    world: Vector3;
    endScale: number;
    rotationY: number;
  } {
    const trainerTypeFromCard = resolveTrainerType(card);
    const effectiveTrainer = trainerTypeFromCard ?? dragTrainerType;

    let world: Vector3;
    if (
      config.type === DropZoneType.BOARD &&
      trainerTypeIsSupporter(effectiveTrainer)
    ) {
      const supporterZone = this.dropZones.find(z => {
        const c = z.getConfig();
        return c.type === DropZoneType.SUPPORTER && c.player === config.player;
      });
      world = supporterZone
        ? supporterZone.getConfig().position.clone()
        : config.position.clone();
    } else {
      world = config.position.clone();
    }
    world.y = Math.max(world.y, 0.08);
    let endScale = 1.0;
    if (config.type === DropZoneType.ACTIVE) {
      endScale = 1.5;
    }
    const rotationY = config.player === PlayerType.TOP_PLAYER ? Math.PI : 0;
    return { world, endScale, rotationY };
  }

  /**
   * Convert DropZoneConfig to CardTarget
   */
  private configToCardTarget(config: DropZoneConfig): CardTarget {
    let slot: SlotType;
    switch (config.type) {
      case DropZoneType.ACTIVE:
        slot = SlotType.ACTIVE;
        break;
      case DropZoneType.BENCH:
        slot = SlotType.BENCH;
        break;
      case DropZoneType.STADIUM:
        slot = SlotType.BOARD; // Stadium uses BOARD slot
        break;
      case DropZoneType.SUPPORTER:
        slot = SlotType.BOARD; // Supporter uses BOARD slot (stored in player.supporter)
        break;
      case DropZoneType.BOARD:
      default:
        slot = SlotType.BOARD;
        break;
    }

    return {
      player: config.player,
      slot,
      index: config.index
    };
  }

  /**
   * Check if card position is over the hand area
   */
  private isOverHandArea(position: Vector3): boolean {
    // Hand is centered at (0, 0.1, 30)
    // Hand cards span approximately -20 to 20 on X axis
    // Hand is at z = 30, with some tolerance
    const handCenterZ = 30;
    const handTolerance = 5; // Allow some tolerance for easier targeting
    const handMinX = -25; // Extended bounds for easier targeting
    const handMaxX = 25;

    return position.x >= handMinX &&
      position.x <= handMaxX &&
      Math.abs(position.z - handCenterZ) < handTolerance;
  }

  /**
   * Find valid drop zone under card position
   */
  private findValidDropZone(position: Vector3): Board3dDropZone | null {
    let nearestZone: Board3dDropZone | null = null;
    let minDistance = Infinity;
    let nearestGeneralBenchZone: Board3dDropZone | null = null;
    let minGeneralBenchDistance = Infinity;

    // First pass: check for BENCH_GENERAL zones and individual zones separately
    for (const zone of this.dropZones) {
      if (!this.isValidDropZone(zone)) {
        continue;
      }

      const config = zone.getConfig();
      const distance = zone.distanceToPosition(position);

      // Handle BENCH_GENERAL zones separately - use bounds check instead of distance
      if (config.type === DropZoneType.BENCH_GENERAL) {
        // Check if position is actually within the zone's rectangular bounds
        if (zone.isPositionInBounds(position)) {
          // Use distance as tiebreaker if multiple BENCH_GENERAL zones match
          if (distance < minGeneralBenchDistance) {
            nearestGeneralBenchZone = zone;
            minGeneralBenchDistance = distance;
          }
        }
        continue;
      }

      // Handle BOARD zones - use bounds check instead of distance for large zones
      if (config.type === DropZoneType.BOARD) {
        // Check if position is actually within the zone's rectangular bounds
        if (zone.isPositionInBounds(position)) {
          // Use distance as tiebreaker if multiple BOARD zones match
          if (distance < minDistance) {
            nearestZone = zone;
            minDistance = distance;
          }
        }
        continue;
      }

      // Handle individual bench slots — use bounds so hit area matches the smaller zone
      if (config.type === DropZoneType.BENCH) {
        if (zone.isPositionInBounds(position)) {
          if (distance < minDistance) {
            nearestZone = zone;
            minDistance = distance;
          }
        }
        continue;
      }

      // Handle other small zones (ACTIVE, SUPPORTER, STADIUM)
      const snapDist = SNAP_DISTANCE;
      if (distance < snapDist && distance < minDistance) {
        nearestZone = zone;
        minDistance = distance;
      }
    }

    // If we found a BENCH_GENERAL zone, resolve it to the specific open bench slot
    if (nearestGeneralBenchZone) {
      const generalConfig = nearestGeneralBenchZone.getConfig();
      const openBenchSlot = this.findNextOpenBenchSlot(generalConfig.player);
      if (openBenchSlot) {
        // Return the specific bench zone instead of the general one
        return openBenchSlot;
      }
    }

    return nearestZone;
  }

  /**
   * Return card to original hand position with smooth animation
   */
  private returnCardToHand(card: Object3D): void {
    // Kill any existing animations to prevent conflicts
    gsap.killTweensOf(card.position);
    gsap.killTweensOf(card.rotation);
    gsap.killTweensOf(card.scale);

    // Check if this is a hand card and verify it's still valid
    // If card was removed from handGroup during updateHand(), it might be disposed
    // In that case, the hand will be re-synced and this card will be recreated
    if (card.userData.isHandCard) {
      // Check if card is still in the scene (not disposed)
      if (!card.parent) {
        // Card has no parent - it was likely removed/disposed
        // Don't animate, let updateHand() handle recreation
        return;
      }

      // Traverse up parent chain to verify card is still connected
      let currentParent: Object3D | null = card.parent;
      let depth = 0;
      const maxDepth = 10; // Safety limit

      while (currentParent && depth < maxDepth) {
        // Check if we've reached the scene root or handGroup-like structure
        // HandGroup is typically at z=30 and contains multiple cards
        if (currentParent.type === 'Scene' ||
          (Math.abs(currentParent.position.z - 30) < 1 && currentParent.children.length > 3)) {
          break;
        }
        currentParent = currentParent.parent;
        depth++;
      }

      // If card is orphaned (no valid parent chain), skip animation
      // The hand will be re-synced and card will be recreated
      if (!currentParent || depth >= maxDepth) {
        return;
      }
    }

    // Smoothly animate position back
    gsap.to(card.position, {
      x: this.draggedCardOriginalPosition.x,
      y: this.draggedCardOriginalPosition.y,
      z: this.draggedCardOriginalPosition.z,
      duration: 0.4,
      ease: 'power2.out'
    });

    // For board cards use quaternion to avoid Euler gimbal lock (preserves tool overlays)
    if (this.draggedCardIsBoardCard) {
      const startQuat = card.quaternion.clone();
      const endQuat = this.draggedCardOriginalQuaternion.clone();
      const progress = { t: 0 };
      gsap.to(progress, {
        t: 1,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => {
          card.quaternion.slerpQuaternions(startQuat, endQuat, progress.t);
        }
      });
    } else {
      // Hand cards: use Euler
      gsap.to(card.rotation, {
        x: this.draggedCardOriginalRotation.x,
        y: this.draggedCardOriginalRotation.y,
        z: this.draggedCardOriginalRotation.z,
        duration: 0.4,
        ease: 'power2.out'
      });
    }

    // Smoothly reset scale to original
    gsap.to(card.scale, {
      x: this.draggedCardOriginalScale.x,
      y: this.draggedCardOriginalScale.y,
      z: this.draggedCardOriginalScale.z,
      duration: 0.4,
      ease: 'power2.out'
    });
  }

  /**
   * Reset drag state
   */
  private resetDragState(): void {
    if (this.hoveredPokemonCard) {
      this.endPokemonHoverEffects();
    }
    this.hoverMissStreak = 0;
    this.hoverRestingScales.clear();

    this.isDragging = false;
    this.draggedCard = null;
    this.draggedCardHandIndex = -1;
    this.currentDragContext = null;
    this.pendingDragCard = null;
    this.pendingDragCamera = null;
    this.dragVelocity.set(0, 0, 0);
    this.previousDragPosition.set(0, 0, 0);
  }

  /**
   * Create drop zone indicators for all zones.
   * @returns whether zones were rebuilt (false when bench sizes unchanged and zones already exist — avoids hitch on every state sync).
   */
  async createDropZoneIndicators(
    scene: Scene,
    bottomBenchSize?: number,
    topBenchSize?: number
  ): Promise<boolean> {
    // Use provided bench sizes or defaults
    const bottomSize = bottomBenchSize ?? this.currentBenchSizes.bottom ?? 5;
    const topSize = topBenchSize ?? this.currentBenchSizes.top ?? 5;

    const benchSizesChanged =
      bottomSize !== this.currentBenchSizes.bottom ||
      topSize !== this.currentBenchSizes.top;

    if (this.dropZones.length > 0 && !benchSizesChanged) {
      return false;
    }

    if (this.dropZones.length > 0) {
      this.disposeDropZones(scene);
    }

    this.currentBenchSizes.bottom = bottomSize;
    this.currentBenchSizes.top = topSize;

    // Load aqua grid texture for slots
    if (!this.slotGridTexture) {
      this.slotGridTexture = await this.assetLoader.loadSlotGridTexture();
    }

    // Bottom player zones
    await this.createPlayerDropZones(
      scene,
      PlayerType.BOTTOM_PLAYER,
      ZONE_POSITIONS.bottomPlayer,
      bottomSize
    );

    // Top player zones (for board-to-board visibility, but typically not interactive)
    await this.createPlayerDropZones(
      scene,
      PlayerType.TOP_PLAYER,
      ZONE_POSITIONS.topPlayer,
      topSize
    );

    // Shared stadium zone — wider hit target than other slots (still centered on stadium mesh)
    const stW =
      BOARD3D_CARD_SLOT_BASE_WIDTH *
      BOARD3D_DROP_ZONE_TARGET_SCALE *
      BOARD3D_STADIUM_DROP_ZONE_EXTRA_SCALE;
    const stH =
      BOARD3D_CARD_SLOT_BASE_HEIGHT *
      BOARD3D_DROP_ZONE_TARGET_SCALE *
      BOARD3D_STADIUM_DROP_ZONE_EXTRA_SCALE;
    const stadiumZone = new Board3dDropZone({
      type: DropZoneType.STADIUM,
      position: ZONE_POSITIONS.stadium,
      player: PlayerType.BOTTOM_PLAYER, // Use bottom player for ownership, but it's shared
      index: 0,
      width: stW,
      height: stH,
      texture: this.slotGridTexture ?? undefined
    });
    this.dropZones.push(stadiumZone);

    // Update interactive objects cache after creating drop zones
    this.updateInteractiveObjects(scene);
    return true;
  }

  /**
   * Create drop zones for a player
   */
  private async createPlayerDropZones(
    scene: Scene,
    player: PlayerType,
    positions: typeof ZONE_POSITIONS.bottomPlayer,
    benchSize: number = 5
  ): Promise<void> {
    // Ensure texture is loaded
    if (!this.slotGridTexture) {
      this.slotGridTexture = await this.assetLoader.loadSlotGridTexture();
    }

    // Active zone
    const activeZone = new Board3dDropZone({
      type: DropZoneType.ACTIVE,
      position: positions.active,
      player,
      index: 0,
      texture: this.slotGridTexture ?? undefined
    });
    this.dropZones.push(activeZone);

    // Supporter zone
    const supporterZone = new Board3dDropZone({
      type: DropZoneType.SUPPORTER,
      position: positions.supporter,
      player,
      index: 0,
      texture: this.slotGridTexture ?? undefined
    });
    this.dropZones.push(supporterZone);

    // Bench zones - use dynamic positioning based on bench size
    const benchPositions = getBenchPositions(benchSize, player);
    benchPositions.forEach((pos, i) => {
      const benchZone = new Board3dDropZone({
        type: DropZoneType.BENCH,
        position: pos,
        player,
        index: i,
        width: BOARD3D_BENCH_DROP_ZONE_WIDTH,
        height: BOARD3D_BENCH_DROP_ZONE_HEIGHT,
        texture: this.slotGridTexture ?? undefined
      });
      this.dropZones.push(benchZone);
    });

    // General bench zone - large area covering entire bench for easy card placement
    if (benchPositions.length > 0) {
      // Calculate center position (average of all bench positions)
      const centerX = benchPositions.reduce((sum, pos) => sum + pos.x, 0) / benchPositions.length;
      const centerZ = benchPositions[0].z; // All bench positions share the same Z
      const benchCenter = new Vector3(centerX, 0.1, centerZ);

      // Calculate width to span all bench positions with some padding
      const minX = Math.min(...benchPositions.map(pos => pos.x));
      const maxX = Math.max(...benchPositions.map(pos => pos.x));
      const dzScale = BOARD3D_DROP_ZONE_TARGET_SCALE;
      const benchWidth = Math.max((maxX - minX) + 4.0, 20.0) * dzScale;
      const benchHeight = 6.0 * dzScale;

      const generalBenchZone = new Board3dDropZone({
        type: DropZoneType.BENCH_GENERAL,
        position: benchCenter,
        player,
        index: -1, // Special index for general zone
        width: benchWidth,
        height: benchHeight,
        texture: this.slotGridTexture ?? undefined
      });
      this.dropZones.push(generalBenchZone);
    }

    // Stadium zone is now shared - created in createDropZoneIndicators()

    // Board zone (for Items/Supporters) - large area covering player's side
    const dzScale = BOARD3D_DROP_ZONE_TARGET_SCALE;
    const boardZone = new Board3dDropZone({
      type: DropZoneType.BOARD,
      position: positions.board,
      player,
      index: 0,
      width: 30.0 * dzScale,
      height: 14.0 * dzScale,
      texture: this.slotGridTexture ?? undefined
    });
    this.dropZones.push(boardZone);
  }

  /**
   * Highlight nearest valid drop zone during drag
   */
  private highlightNearestDropZone(position: Vector3, scene: Scene): void {
    const nearestZone = this.findValidDropZone(position);

    if (!this.currentDragContext) {
      return;
    }

    const { superType, stage, trainerType, card } = this.currentDragContext;

    // Update visual states - show only relevant zones based on card type
    for (const zone of this.dropZones) {
      const config = zone.getConfig();

      // useFromHandToBench: empty bench (ability) and/or occupied evo hosts
      if (cardHasUseFromHandToBenchPower(card)) {
        if (this.isValidDropZone(zone)) {
          zone.setValid();
        } else {
          zone.hide();
        }
        continue;
      }

      // Dual LEGEND: open bench slots only
      if (this.canAssembleLegendFromHand(card)) {
        if (config.type === DropZoneType.BENCH && this.isValidDropZone(zone)) {
          zone.setValid();
        } else {
          zone.hide();
        }
        continue;
      }

      // Basic Pokemon or Fossil played as Basic
      if (this.playsAsBasicPokemonFromHand(card)) {
        if (config.type === DropZoneType.BENCH_GENERAL) {
          if (this.isValidDropZone(zone)) {
            zone.setValid();
          } else {
            zone.hide();
          }
          continue;
        }
        if (config.type === DropZoneType.BENCH) {
          // Hide individual bench zones when dragging Pokemon
          zone.hide();
          continue;
        }
        // Show ACTIVE zone if valid
        if (config.type === DropZoneType.ACTIVE && this.isValidDropZone(zone)) {
          zone.setValid();
          continue;
        }
        // Hide other zones
        zone.hide();
        continue;
      }

      // When dragging a Trainer (Item or Supporter): Only show BOARD, hide SUPPORTER zone
      if (superType === SuperType.TRAINER) {
        if (trainerType === TrainerType.STADIUM) {
          // Stadium cards: Only show STADIUM zone
          if (config.type === DropZoneType.STADIUM && this.isValidDropZone(zone)) {
            zone.setValid();
          } else {
            zone.hide();
          }
          continue;
        }
        // Item and Supporter cards: Only show BOARD zone
        if (config.type === DropZoneType.BOARD && this.isValidDropZone(zone)) {
          zone.setValid();
        } else if (config.type === DropZoneType.SUPPORTER) {
          // Hide SUPPORTER zone when dragging Trainer
          zone.hide();
        } else {
          // Hide other zones
          zone.hide();
        }
        continue;
      }

      // For other card types (Evolution Pokemon, Energy, Tool), show individual BENCH/ACTIVE zones
      // Hide BENCH_GENERAL for these card types (they need specific targets)
      if (config.type === DropZoneType.BENCH_GENERAL) {
        zone.hide();
        continue;
      }

      if (this.isValidDropZone(zone)) {
        zone.setValid();
      } else {
        zone.hide();
      }
    }
  }

  /**
   * Hide all drop zones
   */
  private hideAllDropZones(): void {
    for (const zone of this.dropZones) {
      zone.hide();
    }
    // Don't clear currentDragContext here - it's needed for drop zone validation
    // It will be cleared in resetDragState() when drag actually ends
  }

  /**
   * Dispose of all drop zones
   */
  private disposeDropZones(scene: Scene): void {
    for (const zone of this.dropZones) {
      zone.removeFromScene(scene);
      zone.dispose();
    }
    this.dropZones = [];
  }

  /**
   * Clean up resources
   */
  dispose(scene: Scene): void {
    this.disposeDropZones(scene);
  }

  /**
   * Check if currently dragging
   */
  getIsDragging(): boolean {
    return this.isDragging;
  }

  /**
   * Get the card ID of the board card being dragged (for state sync to skip position updates)
   */
  getDraggedBoardCardId(): string | null {
    if (!this.isDragging || !this.draggedCard?.userData?.isBoardCard) {
      return null;
    }
    return (this.draggedCard.userData?.cardId as string) ?? null;
  }

  /**
   * Get the card ID of the board card being hovered during drag (for state sync to preserve scale)
   */
  /**
   * Board mesh ids whose scale is driven by drag hover tweens (state sync must not overwrite).
   */
  getScaleLockedBoardCardIds(): readonly string[] {
    return [...this.scaleLockedBoardCardIds];
  }

  /** @deprecated Use {@link getScaleLockedBoardCardIds}. */
  getHoveredBoardCardId(): string | null {
    const ids = this.getScaleLockedBoardCardIds();
    return ids.length > 0 ? ids[0] : null;
  }

  /**
   * Check if there's a pending drag (mouse down on draggable card, waiting for threshold)
   */
  hasPendingDrag(): boolean {
    return this.pendingDragCard !== null;
  }

  /**
   * Cancel current drag
   */
  cancelDrag(): void {
    if (this.isDragging && this.draggedCard) {
      this.returnCardToHand(this.draggedCard);
      this.resetDragState(); // This will also remove glow from hovered Pokemon
      this.hideAllDropZones();
    }
  }

  /**
   * Get current drag context (for external use)
   */
  getDragContext(): DragContext | null {
    return this.currentDragContext;
  }
}
