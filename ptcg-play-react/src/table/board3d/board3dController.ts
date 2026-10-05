import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Mesh,
  PCFSoftShadowMap,
  ACESFilmicToneMapping,
  Vector3,
  Group,
  DoubleSide,
  Object3D,
  Clock,
  Texture,
} from 'three';
import { updateBoard3dHoloTime } from './board-3d-holo-material';
import { Subscription } from 'rxjs';
import gsap from 'gsap';
import type { ThreeEvent } from '@react-three/fiber';
import { Board3dAssetLoaderService } from './services/board-3d-asset-loader.service';
import { Board3dStateSyncService } from './services/board-3d-state-sync.service';
import { Board3dAnimationService } from './services/board-3d-animation.service';
import { Board3dInteractionService, type DropResult, type PlayCardFlightPayload } from './services/board-3d-interaction.service';
import { Board3dHandService, BOARD3D_PLAYER_HAND_Z } from './services/board-3d-hand.service';
import { Board3dWireframeService } from './services/board-3d-wireframe.service';
import { Board3dLightingService } from './services/board-3d-lighting.service';
import { Board3dPostProcessingService } from './services/board-3d-post-processing.service';
import { Board3dCardInspectService, BOARD3D_CARD_INFO_INSPECT_ENABLED } from './services/board-3d-card-inspect.service';
import type { LocalGameState } from '../types/localGameState';
import {
  Player,
  CardList,
  Card,
  SlotType,
  PlayerType,
  SuperType,
  PokemonCardList,
  CardTag,
  type CardTarget,
} from 'ptcg-server';
import type { Board3dCardsAdapter, Board3dCardInfoData, CardInfoPaneActionResult } from './board3dCardsAdapter';
import {
  BOARD3D_CARD_SLOT_BASE_HEIGHT,
  BOARD3D_CARD_SLOT_BASE_WIDTH,
  BOARD3D_DROP_ZONE_TARGET_SCALE,
  BOARD_3D_BENCH_OUTLINE_COLOR,
  BOARD_3D_CENTER_EMBLEM_Y,
} from './board3d-constants';
import type { CardInfoPaneOptions } from '../../card-info/CardInfoPane';
import type { Board3dGameActions } from './board3dGameActions';
import { BoardInteractionService, type AbilityAnimationEvent, type AbilityFocusAnchor, type BasicEntranceAnimationEvent, type CoinFlipAnimationEvent, type DeckShuffleAnimationEvent } from '../BoardInteractionService';
import { getCameraConfig, getDrawFlightStageCenterWorld } from './board-3d-config';
import {
  board3dMeshIdForPlayTarget,
  cardIsFossilLikeTrainer,
  cardIsStadium,
  cardIsSupporter,
  cardIsTrainerBoardHandPlay,
  resolveTrainerType,
  worldPositionForSupporterMeshId,
} from './board3dMeshIdForPlayTarget';
import { DropZoneType } from './board-3d-drop-zone';
import { getBenchPositions, ZONE_POSITIONS } from './board-3d-zone-positions';
import { isSharedStadiumMeshId, SHARED_STADIUM_MESH_IDS } from './dual-stadium.utils';
import {
  cardCanAssembleLegendFromHand,
  findLegendAssemblyPartnerHandIndex,
  resolveLegendAssemblyBenchTarget,
  resolveLegendAssemblyHalfHandIndices,
} from './dual-legend.utils';
import {
  getSetupPlaySlotForPickOrder,
  setupPreviewMeshId,
} from '../prompts/chooseCardsHandSelection';
import { r3fPointerEventAsMouse } from './board3dR3fPointer';
import { subscribeBoard3dInteractionStreams } from './board3dControllerSubscriptions';
import { Board3dCard } from './board-3d-card';
import { apply3dCardHolo } from './board-3d-holo-apply';
import { playSfx } from '../../sfx';
import {
  projectCardFaceToScreenAnchor,
  projectCardLowerFaceToScreenAnchor,
  projectCardRetreatPlateToScreenAnchor,
} from './board3dAbilityFocusProjection';
import { playDeckShuffleAnimation, playDeckShufflePreview } from './board3dDeckShufflePreview';
import {
  LEGEND_3D_HALF_ROTATION,
  LEGEND_3D_HALF_SCALE,
  resolveLegendDisplayHalves,
} from './legend-display.utils';
import type { Board3dDisplayOverrides } from './services/board-3d-state-sync.service';
import { Board3dStackService } from './services/board-3d-stack.service';
import { BoardTransitionQueue, type ProcessStateOptions } from './transitions/boardTransitionQueue';
import { captureSnapshot, type BoardSnapshot } from './transitions/boardSnapshot';
import { planTransition, type TransitionStep } from './transitions/planTransition';
import {
  Board3dTransitionRunner,
  type Board3dTransitionHost,
  type LocalTrainerFlight,
} from './transitions/board3dTransitionRunner';

export type AdminSpectatorReveal = {
  revealPrizes: boolean;
  revealHands: boolean;
};

export interface Board3dControllerProps {
  gameState: LocalGameState;
  topPlayer: Player;
  bottomPlayer: Player;
  bottomPlayerHand: CardList;
  topPlayerHand: CardList;
  clientId: number;
  player?: unknown;
  adminSpectatorReveal?: AdminSpectatorReveal;
  /** While true, React may hide Choose Prize until KO motion finishes. */
  onKoSequenceActiveChange?: (active: boolean) => void;
}

type Board3dFrame = {
  props: Board3dControllerProps;
  /** Resolve the silent animation WaitPrompts this state carries once it has played. */
  gates: (() => void)[];
};

/** Context when the board runs inside React Three Fiber (shared gl/scene/camera). */
export type Board3dR3fInitContext = {
  gl: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  worldContentRoot: Object3D;
  handSlot: Object3D;
  /** Far-player hand row parent (sibling of {@link handSlot}). */
  opponentHandSlot: Object3D;
  /** Texture anisotropy from graphics quality preset (clamped to GPU max). */
  maxAnisotropy?: number;
};

/** How long after one deck→bench card launches before the next may leave the deck. */
const DECK_TO_BENCH_LAUNCH_STAGGER_MS = 500;
/** Bench-drop pace for a deck play. Hand plays keep the default pace of 1. */
const DECK_TO_BENCH_DROP_PACE = 0.6;

export class Board3dController {
  gameState!: LocalGameState;
  topPlayer!: Player;
  bottomPlayer!: Player;
  bottomPlayerHand!: CardList;
  topPlayerHand!: CardList;
  clientId!: number;
  player?: unknown;
  private adminSpectatorReveal?: AdminSpectatorReveal;

  private canvasEl!: HTMLCanvasElement;
  private selectionSubs: Subscription[] = [];

  public scene!: Scene; // Made public for stats component
  private camera!: PerspectiveCamera;
  public renderer!: WebGLRenderer; // Made public for stats component

  // Board elements (legacy canvas mode only; R3F uses Board3dStaticScene)
  private boardMesh?: Mesh;
  private boardCenterOverlay?: Mesh;

  // Per-zone outlines (always visible, independent of drop zones)
  private otherSpotOutlines: Group[] = [];

  // 4x4 grid overlay on the board
  private boardGridGroup: Group | null = null;

  private animationFrameId: number = 0;
  private abilityFocusRafId: number | null = null;
  private cardInspectFocusRafId: number | null = null;
  private holoClock = new Clock();
  private needsRender: boolean = true;
  private currentHoveredCard: any = null;
  private resizeObserver: ResizeObserver | null = null;

  private r3fMode = false;
  /** Deck/discard stacks and flight attachments (and R3F board-card subtree parent). */
  private worldContentRoot!: Object3D;
  /** Group that contains the hand fan (child of worldContentRoot in R3F). */
  private handSlot!: Object3D;
  /** Group that contains the far-player hand row. */
  private opponentHandSlot!: Object3D;

  /** When R3F mesh `onPointerDown` handles the same DOM event, skip duplicate canvas listener. */
  private r3fMeshPointerDownTs = -1;

  // Player perspective - true when viewing from opposite side (like 2D board's isUpsideDown)
  private isUpsideDown: boolean = false;

  // Animation state caching
  private hasActiveAnimationsCache: boolean = false;
  private animationCheckInterval: number = 100; // Check animation state every 100ms instead of every frame
  private lastAnimationCheck: number = 0;

  // Wireframe overlay
  public showWireframes: boolean = false;

  /** Board mesh ids hidden while one or more hand-play flights are in progress. */
  private handPlayFlightHiddenMeshIds = new Set<string>();
  /**
   * Bench/slot meshes that already have a local hand-play flight; suppress duplicate
   * {@link playBoardBasicAnimation} from the server until consumed or timed out.
   */
  private handPlayBoardBasicAnimationSuppressedMeshIds = new Set<string>();
  /** Slots whose server entrance animation (basic / evolution) waits for its state to commit. */
  private pendingEntranceMeshIds = new Set<string>();
  /** Keep state sync from overwriting a card while it animates out of the deck. */
  private deckFlightProtectedMeshIds = new Set<string>();
  /** Deck→bench plays cascade. The next card leaves {@link DECK_TO_BENCH_LAUNCH_STAGGER_MS} after the previous one starts. */
  private deckToBenchChain: Promise<void> = Promise.resolve();
  /** Bumped on destroy so a queued deck flight does not start after the board is gone. */
  private deckToBenchGeneration = 0;
  /**
   * Deck-source entrances that have not landed yet. A shuffle that arrives while this is
   * above zero waits, so the riffle plays after the Pokémon leave the deck.
   */
  private outstandingDeckEntrances = 0;
  private deckEntranceIdleWaiters: (() => void)[] = [];
  /** Shuffle is waiting on deck flights, so the trainer discard must wait for that riffle too. */
  private deckShuffleDeferred = false;
  /** Trainer → discard flights held until the card's deck plays (and shuffle) have finished. */
  private deferredTrainerDiscards: Extract<TransitionStep, { kind: 'trainerToDiscard' }>[] = [];
  private onKoSequenceActiveChange?: (active: boolean) => void;
  /** Drop stale overlapping {@link syncSetupStartingPokemonPreview} runs. */
  private setupPreviewSyncGeneration = 0;
  /** Hand indices animating onto the board during setup (block hand resync). */
  private setupPlacementInFlight = new Set<number>();
  private setupHandSyncBlocked = false;
  /** Card ids detached for an optimistic hand→board play (omit from hand sync until resolve). */
  private handPlayFlightCardIds = new Set<number>();

  /** Serializes server states so each one's animations finish before the next begins. */
  private transitionQueue = new BoardTransitionQueue<Board3dFrame>({
    processState: (frame, options) => this.processFrame(frame, options),
    onError: (error) => console.error('[Board3D] board transition failed:', error),
  });
  /** Newest props from React; `this.*` props are what the board currently shows. */
  private latestProps: Board3dControllerProps | null = null;
  private displayedProps: Board3dControllerProps | null = null;
  private displayedSnapshot: BoardSnapshot | null = null;
  private displayOverrides: Board3dDisplayOverrides = {};
  /** Serializes {@link Board3dStateSyncService.syncState} calls. */
  private renderChain: Promise<void> = Promise.resolve();
  /** Trainers dragged onto the play zone, waiting for the state that resolves them. */
  private localTrainerFlights = new Map<number, LocalTrainerFlight>();
  /**
   * Cards that left a player's deck into untracked prompt lists (look-at-top, etc.).
   * Credited into draw budget on the resolve frame so ability hand-adds still animate.
   */
  private deckLimboByPlayer = new Map<number, number>();
  /** Silent server WaitPrompts already tied to a queued frame. */
  private gatedPromptIds = new Set<number>();
  private openAnimationGates = new Set<() => void>();
  private lastBottomHandSignature = '';
  private lastTopHandSignature = '';

  constructor(
    private assetLoader: Board3dAssetLoaderService,
    private stateSync: Board3dStateSyncService,
    private animationService: Board3dAnimationService,
    private interactionService: Board3dInteractionService,
    private handService: Board3dHandService,
    private wireframeService: Board3dWireframeService,
    private lightingService: Board3dLightingService,
    private postProcessingService: Board3dPostProcessingService,
    private cardInspectService: Board3dCardInspectService,
    private cardsAdapter: Board3dCardsAdapter,
    private gameActions: Board3dGameActions,
    private boardInteractionService: BoardInteractionService,
  ) {}

  private getHandPlayableCardIdsForDisplay(): number[] | undefined {
    if (
      this.boardInteractionService.isChooseHandCardsSelectionActive() ||
      this.boardInteractionService.isLegendAssemblySelectionActive()
    ) {
      return undefined;
    }
    return this.isReplayOmniscient() ? undefined : this.bottomPlayer?.playableCardIds;
  }

  private getHandPlayableAbilityCardIdsForDisplay(): number[] | undefined {
    if (
      this.boardInteractionService.isChooseHandCardsSelectionActive() ||
      this.boardInteractionService.isLegendAssemblySelectionActive()
    ) {
      return undefined;
    }
    return this.isReplayOmniscient() ? undefined : this.bottomPlayer?.playableHandAbilityCardIds;
  }

  private shouldDisableHandDragForSelection(): boolean {
    if (this.boardInteractionService.isChooseStartingPokemonsSelectionActive()) {
      return false;
    }
    if (this.boardInteractionService.isChooseHandCardsSelectionActive()) {
      return true;
    }
    if (this.boardInteractionService.isLegendAssemblySelectionActive()) {
      return true;
    }
    return false;
  }

  private refreshSetupStartingPokemonDragState(): void {
    const startingSetup = this.boardInteractionService.isChooseStartingPokemonsSelectionActive();
    this.interactionService.setSetupStartingPokemonDrag(
      startingSetup
        ? {
            activeLocked: this.boardInteractionService.isSetupActiveLocked(),
            skipActivePhase: this.boardInteractionService.isSetupActivePhaseSkipped(),
          }
        : null,
    );
  }

  private refreshHandSelectionVisualsIfNeeded(): void {
    if (this.boardInteractionService.isSelectionActive()) {
      this.updateHandSelectionVisuals(true);
    }
  }

  private getSetupOmittedHandIndices(): ReadonlySet<number> | undefined {
    if (!this.boardInteractionService.isChooseStartingPokemonsSelectionActive()) {
      return undefined;
    }
    return new Set([
      ...this.boardInteractionService.getChooseHandCardSelectionHandIndices(),
      ...this.setupPlacementInFlight,
    ]);
  }

  /** Setup omissions plus cards mid optimistic play-flight (server hand still has them). */
  private getHandSyncOmitIndices(): ReadonlySet<number> | undefined {
    const setupOmit = this.getSetupOmittedHandIndices();
    if (this.handPlayFlightCardIds.size === 0) {
      return setupOmit;
    }
    const omit = new Set<number>(setupOmit ?? []);
    const cards = this.bottomPlayerHand?.cards;
    if (cards) {
      for (let i = 0; i < cards.length; i++) {
        if (this.handPlayFlightCardIds.has(cards[i].id)) {
          omit.add(i);
        }
      }
    }
    return omit.size > 0 ? omit : undefined;
  }

  private trackHandPlayFlightCard(board3dCard: Board3dCard | null | undefined): void {
    const id = board3dCard?.getGroup().userData.cardData?.id as number | undefined;
    if (id != null) {
      this.handPlayFlightCardIds.add(id);
    }
  }

  private clearHandPlayFlightCard(board3dCard: Board3dCard | null | undefined): void {
    const id = board3dCard?.getGroup().userData.cardData?.id as number | undefined;
    if (id != null) {
      this.handPlayFlightCardIds.delete(id);
    }
  }

  /**
   * Server rejected playCard: animate the detached mesh back into the hand fan
   * (same feel as dropping onto an invalid zone).
   */
  private async returnFailedPlayCardToHand(
    board3dCard: Board3dCard | null | undefined,
    handIndex: number,
    options?: { scrubEnergyMorph?: boolean },
  ): Promise<void> {
    if (!board3dCard) {
      this.forceHandResyncAfterFailedPlay();
      return;
    }

    const group = board3dCard.getGroup();
    gsap.killTweensOf(group.position);
    gsap.killTweensOf(group.rotation);
    gsap.killTweensOf(group.scale);

    if (options?.scrubEnergyMorph) {
      this.animationService.scrubFailedEnergyAttachVisuals(board3dCard);
    }

    const resolvedIndex =
      (group.userData.detachedFromHandIndex as number | undefined) ??
      (group.userData.handIndex as number | undefined) ??
      handIndex;

    const cardId = group.userData.cardData?.id as number | undefined;
    const isPlayable =
      cardId != null && !!this.bottomPlayer?.playableCardIds?.includes(cardId);

    try {
      await this.handService.returnDetachedCardToHand(board3dCard, resolvedIndex, {
        isPlayable,
      });
    } catch {
      group.removeFromParent();
      board3dCard.dispose();
      this.forceHandResyncAfterFailedPlay();
      return;
    } finally {
      this.clearHandPlayFlightCard(board3dCard);
    }

    this.interactionService.updateInteractiveObjects(this.scene);
    this.stateSync.publishSceneModel(this.handService.getHandSlotSnapshots());
    this.refreshHandSelectionVisualsIfNeeded();
    this.markDirty();
  }

  getStateSync(): Board3dStateSyncService {
    return this.stateSync;
  }

  /** R3F mesh pointer surface: forwards native pointer + hit object into the interaction pipeline. */
  handleR3fMeshPointerDown(ev: ThreeEvent<PointerEvent>): void {
    if (!this.r3fMode) {
      return;
    }
    this.r3fMeshPointerDownTs = ev.nativeEvent.timeStamp;
    const canvas = this.canvasEl;
    const card = this.interactionService.onMouseDown(
      r3fPointerEventAsMouse(ev),
      this.camera,
      this.scene,
      canvas,
      ev.object,
      this.shouldDisableHandDragForSelection(),
    );
    if (card) {
      const startingSetup = this.boardInteractionService.isChooseStartingPokemonsSelectionActive();
      const disableHandDrag = this.shouldDisableHandDragForSelection();
      canvas.style.cursor = disableHandDrag && !startingSetup ? 'pointer' : 'grabbing';
      this.markDirty();
    }
  }

  setProps(p: Board3dControllerProps): void {
    this.gameState = p.gameState;
    this.topPlayer = p.topPlayer;
    this.bottomPlayer = p.bottomPlayer;
    this.bottomPlayerHand = p.bottomPlayerHand;
    this.topPlayerHand = p.topPlayerHand;
    this.clientId = p.clientId;
    this.player = p.player;
    this.adminSpectatorReveal = p.adminSpectatorReveal;
    this.onKoSequenceActiveChange = p.onKoSequenceActiveChange;
    this.interactionService.setHandPlayZoneGameSettings(p.gameState.state.gameSettings);
    this.interactionService.setBottomHandCards(p.bottomPlayerHand?.cards ?? []);
    this.interactionService.setPlayableCardIds(this.getHandPlayableCardIdsForDisplay());
    this.interactionService.setPlayableHandAbilityCardIds(
      this.getHandPlayableAbilityCardIdsForDisplay(),
    );
  }

  init(canvas: HTMLCanvasElement, initial: Board3dControllerProps): void {
    this.canvasEl = canvas;
    this.latestProps = initial;
    this.setProps(initial);
    this.runInit();
    this.afterCanvasReady();
  }

  /** Initialize when React Three Fiber owns the renderer, scene, and camera. */
  initFromR3f(ctx: Board3dR3fInitContext, initial: Board3dControllerProps): void {
    this.r3fMode = true;
    this.canvasEl = ctx.gl.domElement;
    this.renderer = ctx.gl;
    this.scene = ctx.scene;
    this.camera = ctx.camera;
    this.worldContentRoot = ctx.worldContentRoot;
    this.handSlot = ctx.handSlot;
    this.opponentHandSlot = ctx.opponentHandSlot;
    this.assetLoader.setMaxAnisotropy(
      ctx.maxAnisotropy ?? ctx.gl.capabilities.getMaxAnisotropy(),
    );
    this.latestProps = initial;
    this.setProps(initial);
    this.stateSync.setAttachmentTargets(this.worldContentRoot, null, this.scene);
    this.interactionService.setWorldContentRoot(this.worldContentRoot);
    this.runInitR3f();
    this.afterCanvasReadyR3f();
  }

  private runInit(): void {
    this.r3fMode = false;
    this.handService.setR3fDeclarativeHand(false);
    // Initialize scene components
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.worldContentRoot = this.scene;
    this.handSlot = this.scene;
    this.opponentHandSlot = this.scene;
    this.stateSync.setAttachmentTargets(this.worldContentRoot, this.worldContentRoot, this.scene);
    this.interactionService.setWorldContentRoot(this.worldContentRoot);
    this.lightingService.initialize(this.scene);
    this.createBoardAsync();
    this.postProcessingService.initialize(this.renderer, this.scene, this.camera, this.canvasEl);

    // Initialize wireframe service
    this.wireframeService.initialize(this.scene);

    // Initialize hand service
    this.handSlot.add(this.handService.getHandGroup());
    this.opponentHandSlot.add(this.handService.getOpponentHandGroup());

    // Create drop zone indicators (async) with actual bench sizes
    const bottomBenchSize = this.bottomPlayer?.bench?.length ?? 5;
    const topBenchSize = this.topPlayer?.bench?.length ?? 5;
    this.interactionService
      .createDropZoneIndicators(this.scene, bottomBenchSize, topBenchSize)
      .then((rebuilt) => {
        if (rebuilt) {
          this.createZoneOutlines();
        }
        this.markDirty();
      });

    this.enqueueInitialFrame();

    this.selectionSubs.push(
      ...subscribeBoard3dInteractionStreams(this.boardInteractionService, {
        updateSelectionVisuals: () => this.updateSelectionVisuals(),
        refreshPutDamagePlacementOverlays: () => this.refreshPutDamagePlacementOverlays(),
        playBoardAttackAnimation: (ev) => this.playBoardAttackAnimation(ev),
        playBoardBasicAnimation: (ev) => this.playBoardBasicAnimation(ev),
        playBoardEvolutionAnimation: (ev) => this.playBoardEvolutionAnimation(ev),
        playBoardAbilityAnimation: (ev) => this.playBoardAbilityAnimation(ev),
        playBoardCoinFlipAnimation: (ev) => this.playBoardCoinFlipAnimation(ev),
        cancelBoardCoinFlipAnimation: () => this.cancelBoardCoinFlipAnimation(),
        playBoardDeckShuffleAnimation: (ev) => this.playBoardDeckShuffleAnimation(ev),
      }),
    );

    this.animationService.initCoinFlipScene(
      this.scene,
      this.cardsAdapter.getCoinUrl('twinleaf-coin.png'),
      this.cardsAdapter.getCoinUrl('twinleaf-coin-back.png'),
    );
    this.stateSync.setBoardInteractionForDamagePreview(this.boardInteractionService);
  }

  private runInitR3f(): void {
    this.wireframeService.initialize(this.scene);
    this.handSlot.add(this.handService.getHandGroup());
    this.opponentHandSlot.add(this.handService.getOpponentHandGroup());

    const bottomBenchSize = this.bottomPlayer?.bench?.length ?? 5;
    const topBenchSize = this.topPlayer?.bench?.length ?? 5;
    this.interactionService
      .createDropZoneIndicators(this.scene, bottomBenchSize, topBenchSize)
      .then((rebuilt) => {
        if (rebuilt) {
          this.createZoneOutlines();
        }
        this.markDirty();
      });

    this.enqueueInitialFrame();

    this.selectionSubs.push(
      ...subscribeBoard3dInteractionStreams(this.boardInteractionService, {
        updateSelectionVisuals: () => this.updateSelectionVisuals(),
        refreshPutDamagePlacementOverlays: () => this.refreshPutDamagePlacementOverlays(),
        playBoardAttackAnimation: (ev) => this.playBoardAttackAnimation(ev),
        playBoardBasicAnimation: (ev) => this.playBoardBasicAnimation(ev),
        playBoardEvolutionAnimation: (ev) => this.playBoardEvolutionAnimation(ev),
        playBoardAbilityAnimation: (ev) => this.playBoardAbilityAnimation(ev),
        playBoardCoinFlipAnimation: (ev) => this.playBoardCoinFlipAnimation(ev),
        cancelBoardCoinFlipAnimation: () => this.cancelBoardCoinFlipAnimation(),
        playBoardDeckShuffleAnimation: (ev) => this.playBoardDeckShuffleAnimation(ev),
      }),
    );

    this.animationService.initCoinFlipScene(
      this.scene,
      this.cardsAdapter.getCoinUrl('twinleaf-coin.png'),
      this.cardsAdapter.getCoinUrl('twinleaf-coin-back.png'),
    );
    this.stateSync.setBoardInteractionForDamagePreview(this.boardInteractionService);
  }

  /** Called from React when props change after mount. */
  refreshProps(next: Board3dControllerProps): void {
    this.onKoSequenceActiveChange = next.onKoSequenceActiveChange;
    const prev = this.latestProps;
    if (
      prev &&
      prev.gameState === next.gameState &&
      prev.topPlayer === next.topPlayer &&
      prev.bottomPlayer === next.bottomPlayer &&
      prev.bottomPlayerHand === next.bottomPlayerHand &&
      prev.topPlayerHand === next.topPlayerHand &&
      prev.clientId === next.clientId &&
      prev.adminSpectatorReveal?.revealPrizes === next.adminSpectatorReveal?.revealPrizes &&
      prev.adminSpectatorReveal?.revealHands === next.adminSpectatorReveal?.revealHands
    ) {
      return;
    }
    this.latestProps = next;
    if (!this.scene) {
      this.setProps(next);
      return;
    }
    this.enqueueFrame(next);
  }

  private enqueueInitialFrame(): void {
    if (this.latestProps?.gameState) {
      this.enqueueFrame(this.latestProps);
    }
  }

  private enqueueFrame(props: Board3dControllerProps): void {
    this.transitionQueue.enqueueState({ props, gates: this.openGatesForState(props) });
  }

  /**
   * Silent server WaitPrompts ("Hand to deck animation", "Draw animation") arrive in the same
   * state as the change they gate. Publish a pending promise now and settle it once that state
   * has played on the board.
   */
  private openGatesForState(props: Board3dControllerProps): (() => void)[] {
    const gates: (() => void)[] = [];
    for (const prompt of props.gameState?.state?.prompts ?? []) {
      if (
        prompt.type !== 'WaitPrompt' ||
        prompt.result !== undefined ||
        this.gatedPromptIds.has(prompt.id)
      ) {
        continue;
      }
      const message = String((prompt as { message?: string }).message ?? '').toLowerCase();
      const isHandToDeck = message.includes('hand to deck animation');
      if (!isHandToDeck && !message.includes('draw animation')) {
        continue;
      }
      this.gatedPromptIds.add(prompt.id);
      const { promise, settle } = this.openAnimationGate();
      if (isHandToDeck) {
        this.boardInteractionService.setPendingHandToDeckAnimationPromise(promise);
      } else {
        this.boardInteractionService.setPendingDrawAnimationPromise(promise);
      }
      gates.push(settle);
    }
    return gates;
  }

  private openAnimationGate(): { promise: Promise<void>; settle: () => void } {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    const settle = (): void => {
      this.openAnimationGates.delete(settle);
      resolve();
    };
    this.openAnimationGates.add(settle);
    return { promise, settle };
  }

  private captureBoardSnapshot(props: Board3dControllerProps): BoardSnapshot | null {
    const state = props.gameState?.state;
    if (!state) {
      return null;
    }
    return captureSnapshot(state, {
      omniscient: !!props.gameState.replay,
      handIdsReal: (p) =>
        p.id === props.clientId || !!p.hand?.isPublic || !!props.adminSpectatorReveal?.revealHands,
    });
  }

  private async processFrame(frame: Board3dFrame, options: ProcessStateOptions): Promise<void> {
    try {
      await this.waitForHandInteractionIdle(options.isStale);
      if (options.isStale()) {
        return;
      }
      const { props } = frame;
      const prevProps = this.displayedProps;
      const prevSnapshot = this.displayedSnapshot;
      const perspectiveChanged =
        !prevProps ||
        prevProps.topPlayer?.id !== props.topPlayer?.id ||
        prevProps.bottomPlayer?.id !== props.bottomPlayer?.id ||
        prevProps.clientId !== props.clientId;
      const seatChanged = !!prevProps && prevProps.bottomPlayer?.id !== props.bottomPlayer?.id;

      this.setProps(props);
      this.displayedProps = props;
      if (this.camera && perspectiveChanged) {
        this.updatePerspective();
      }
      const snapshot = this.captureBoardSnapshot(props);
      this.displayedSnapshot = snapshot;

      if (options.animate && prevSnapshot && snapshot) {
        const plan = planTransition(prevSnapshot, snapshot, {
          preFlownCardIds: new Set(this.localTrainerFlights.keys()),
          deckLimboByPlayer: this.deckLimboByPlayer,
        });
        let steps = seatChanged ? this.stepsWithoutHandOrigins(plan.steps) : plan.steps;
        if (this.outstandingDeckEntrances > 0) {
          const held = steps.filter(
            (step): step is Extract<TransitionStep, { kind: 'trainerToDiscard' }> =>
              step.kind === 'trainerToDiscard',
          );
          if (held.length > 0) {
            for (const step of held) {
              const alreadyHeld = this.deferredTrainerDiscards.some(
                (existing) => existing.playerId === step.playerId && existing.cardId === step.cardId,
              );
              if (!alreadyHeld) {
                this.deferredTrainerDiscards.push(step);
              }
            }
            steps = steps.filter((step) => step.kind !== 'trainerToDiscard');
          }
        }
        if (steps.length > 0) {
          const result = await new Board3dTransitionRunner(
            this.transitionHost(),
            prevSnapshot,
            snapshot,
            plan,
            steps,
            seatChanged,
            options.isStale,
          ).run();
          if (result.bottomHandTouched) {
            this.lastBottomHandSignature = '';
          }
          if (result.topHandTouched) {
            this.lastTopHandSignature = '';
          }
        }
      }
      if (options.isStale()) {
        return;
      }
      await this.commitFrame();
    } finally {
      frame.gates.forEach((settle) => settle());
    }
  }

  /** After a seat swap the hand rows are rebuilt, so cards cannot fly out of them. */
  private stepsWithoutHandOrigins(steps: TransitionStep[]): TransitionStep[] {
    return steps.flatMap((step): TransitionStep[] => {
      if (step.kind === 'handToDeck' || (step.kind === 'trainerToPlayZone' && !step.preFlown)) {
        return [];
      }
      if (step.kind === 'toPile') {
        const cards = step.cards.filter((c) => c.origin.kind !== 'hand');
        return cards.length > 0 ? [{ ...step, cards }] : [];
      }
      return [step];
    });
  }

  /**
   * Keep a trainer on the play zone, and out of the discard pile, until its deck plays and
   * shuffle have animated. The server state already has the card in the discard.
   */
  private deferredTrainerHoldOverrides(): Board3dDisplayOverrides {
    if (this.deferredTrainerDiscards.length === 0) {
      return {};
    }
    const supporterCard = new Map<number, Card>();
    const omitDiscard = new Map<number, Set<number>>();
    const omitLost = new Map<number, Set<number>>();
    for (const step of this.deferredTrainerDiscards) {
      const player = this.playerById(step.playerId);
      const card = player ? this.findPlayerCard(player, step.cardId) : undefined;
      if (card) {
        supporterCard.set(step.playerId, card);
      }
      const omit = step.zone === 'discard' ? omitDiscard : omitLost;
      let ids = omit.get(step.playerId);
      if (!ids) {
        ids = new Set();
        omit.set(step.playerId, ids);
      }
      ids.add(step.cardId);
    }
    const discardIds = new Map<number, number[]>();
    const lostzoneIds = new Map<number, number[]>();
    for (const [playerId, ids] of omitDiscard) {
      const player = this.playerById(playerId);
      if (player) {
        discardIds.set(
          playerId,
          player.discard.cards.map((c) => c.id).filter((id) => !ids.has(id)),
        );
      }
    }
    for (const [playerId, ids] of omitLost) {
      const player = this.playerById(playerId);
      if (player) {
        lostzoneIds.set(
          playerId,
          player.lostzone.cards.map((c) => c.id).filter((id) => !ids.has(id)),
        );
      }
    }
    return { supporterCard, discardIds, lostzoneIds };
  }

  private playerById(playerId: number): Player | undefined {
    if (this.bottomPlayer?.id === playerId) {
      return this.bottomPlayer;
    }
    if (this.topPlayer?.id === playerId) {
      return this.topPlayer;
    }
    return undefined;
  }

  private findPlayerCard(player: Player, cardId: number): Card | undefined {
    const lists = [player.discard, player.lostzone, player.supporter, player.hand, player.deck];
    for (const list of lists) {
      const card = list?.cards?.find((c) => c.id === cardId);
      if (card) {
        return card;
      }
    }
    return undefined;
  }

  /** Fly held trainers from the play zone into their pile, after the card's other effects. */
  private async playDeferredTrainerDiscards(): Promise<void> {
    const steps = this.deferredTrainerDiscards;
    const snapshot = this.displayedSnapshot;
    if (steps.length === 0 || !snapshot) {
      this.deferredTrainerDiscards = [];
      return;
    }
    this.deferredTrainerDiscards = [];
    const prev = this.snapshotWithTrainersStillInPlay(snapshot, steps);
    await new Board3dTransitionRunner(
      this.transitionHost(),
      prev,
      snapshot,
      { steps, players: new Map() },
      steps,
      false,
      () => false,
    ).run();
    this.displayOverrides = {};
    await this.renderDisplay();
  }

  /** Prev snapshot for the delayed discard flight: the trainer is still on the play zone. */
  private snapshotWithTrainersStillInPlay(
    base: BoardSnapshot,
    steps: Extract<TransitionStep, { kind: 'trainerToDiscard' }>[],
  ): BoardSnapshot {
    const players = new Map(base.players);
    for (const step of steps) {
      const player = players.get(step.playerId);
      if (!player) {
        continue;
      }
      players.set(step.playerId, {
        ...player,
        supporterIds: player.supporterIds.includes(step.cardId)
          ? player.supporterIds
          : [...player.supporterIds, step.cardId],
        discardIds:
          step.zone === 'discard' ? player.discardIds.filter((id) => id !== step.cardId) : player.discardIds,
        lostzoneIds:
          step.zone === 'lostzone'
            ? player.lostzoneIds.filter((id) => id !== step.cardId)
            : player.lostzoneIds,
      });
    }
    return { ...base, players };
  }

  private async commitFrame(): Promise<void> {
    this.displayOverrides = this.deferredTrainerHoldOverrides();
    await this.renderDisplay();
    await this.waitForHandInteractionIdle();
    await this.syncHandRows();
    await this.releaseOrphanLocalTrainerFlights();
  }

  /** A dragged trainer whose card left the hand without a play-zone step just snaps into place. */
  private async releaseOrphanLocalTrainerFlights(): Promise<void> {
    const handIds = new Set(this.bottomPlayerHand?.cards.map((c) => c.id) ?? []);
    const orphans = [...this.localTrainerFlights].filter(([id]) => !handIds.has(id));
    if (orphans.length === 0) {
      return;
    }
    for (const [id, flight] of orphans) {
      this.localTrainerFlights.delete(id);
      await Promise.race([flight.landed, new Promise<void>((r) => setTimeout(r, 2000))]);
      flight.endHiding();
    }
    await this.renderDisplay();
    orphans.forEach(([, flight]) => flight.dispose());
  }

  private async waitForHandInteractionIdle(isStale?: () => boolean): Promise<void> {
    while (
      !isStale?.() &&
      (this.interactionService.getIsDragging() ||
        this.interactionService.hasPendingDrag() ||
        this.setupHandSyncBlocked)
    ) {
      await new Promise<void>((r) => setTimeout(r, 50));
    }
  }

  private transitionHost(): Board3dTransitionHost {
    return {
      worldRoot: this.worldContentRoot,
      handSlot: this.handSlot,
      opponentHandSlot: this.opponentHandSlot,
      stateSync: this.stateSync,
      handService: this.handService,
      animationService: this.animationService,
      assetLoader: this.assetLoader,
      cardsAdapter: this.cardsAdapter,
      bottomPlayer: () => this.bottomPlayer,
      topPlayer: () => this.topPlayer,
      bottomHand: () => this.bottomPlayerHand,
      topHand: () => this.topPlayerHand,
      aspect: () => this.canvasEl.clientWidth / Math.max(this.canvasEl.clientHeight, 1),
      isUpsideDown: () => this.isUpsideDown,
      isBottomHandFaceUp: () => this.isHandVisibleToViewer(),
      isTopHandFaceUp: () => this.isOpponentHandVisibleToViewer(),
      playableCardIds: () => this.getHandPlayableCardIdsForDisplay(),
      handFlightCardIds: () => this.handPlayFlightCardIds,
      takeLocalTrainerFlight: (cardId) => {
        const flight = this.localTrainerFlights.get(cardId);
        this.localTrainerFlights.delete(cardId);
        return flight;
      },
      setOverrides: (overrides) => {
        this.displayOverrides = overrides;
      },
      render: () => this.renderDisplay(),
      setKoActive: (active) => this.onKoSequenceActiveChange?.(active),
      markDirty: () => this.markDirty(),
    };
  }

  /** Re-render board meshes from the displayed props and current overrides. */
  private syncGameState(): void {
    void this.renderDisplay();
  }

  private renderDisplay(): Promise<void> {
    const run = this.renderChain
      .then(() => this.renderDisplayNow())
      .catch((error) => console.error('Failed to sync 3D board state:', error));
    this.renderChain = run;
    return run;
  }

  private async renderDisplayNow(): Promise<void> {
    if (!this.gameState || !this.scene) {
      return;
    }
    await this.stateSync.syncState(this.gameState, this.clientId, this.topPlayer, this.bottomPlayer, {
      skippedCardId:
        this.interactionService.getDraggedBoardCardId() ??
        this.cardInspectService.getInspectedCardId(),
      skippedScaleCardId: this.interactionService.getScaleLockedBoardCardIds(),
      handPlayFlightHiddenCardId: this.getHandPlayFlightHiddenMeshIdsForSync(),
      protectedVisualCardIds: [...this.deckFlightProtectedMeshIds],
      display: this.displayOverrides,
      adminSpectatorReveal: this.adminSpectatorReveal,
    });
    this.updateDropZoneOccupancy();
    this.updateDropZonesForBenchSize();
    this.interactionService.updateInteractiveObjects(this.scene);
    this.markDirty();
    if (this.r3fMode) {
      this.stateSync.publishSceneModel(this.handService.getHandSlotSnapshots());
      requestAnimationFrame(() => {
        this.stateSync.drainPendingR3fBoardCardDisposals();
        this.handService.drainPendingR3fHandDisposals();
      });
    }
  }

  /** Rebuild both hand rows from the displayed props when they differ from what is shown. */
  private async syncHandRows(force = false): Promise<void> {
    if (!this.scene) {
      return;
    }
    if (this.bottomPlayerHand && this.bottomPlayer) {
      const isOwner = this.isHandVisibleToViewer();
      const playable = this.getHandPlayableCardIdsForDisplay();
      const omit = this.getHandSyncOmitIndices();
      const signature = JSON.stringify([
        this.bottomPlayer.id,
        this.bottomPlayerHand.cards.map((c) => c.id),
        isOwner,
        playable ?? null,
        omit ? [...omit].sort((a, b) => a - b) : null,
      ]);
      if (force || signature !== this.lastBottomHandSignature) {
        await this.handService.updateHand(this.bottomPlayerHand, isOwner, this.handSlot, playable, omit);
        this.lastBottomHandSignature = signature;
      }
    }
    if (this.topPlayerHand && this.topPlayer && this.opponentHandSlot) {
      const visible = this.isOpponentHandVisibleToViewer();
      const signature = JSON.stringify([
        this.topPlayer.id,
        visible ? this.topPlayerHand.cards.map((c) => c.id) : this.topPlayerHand.cards.length,
        visible,
      ]);
      if (force || signature !== this.lastTopHandSignature) {
        await this.handService.updateOpponentHand(this.topPlayerHand, visible, this.opponentHandSlot);
        this.lastTopHandSignature = signature;
      }
    }
    this.interactionService.updateInteractiveObjects(this.scene);
    this.refreshHandSelectionVisualsIfNeeded();
    this.markDirty();
    if (this.r3fMode) {
      this.stateSync.publishSceneModel(this.handService.getHandSlotSnapshots());
      requestAnimationFrame(() => this.handService.drainPendingR3fHandDisposals());
    }
  }

  /** After a failed play or abandoned flight: rebuild the hand once the current transition ends. */
  private forceHandResyncAfterFailedPlay(): void {
    this.transitionQueue.enqueueEvent(() => this.syncHandRows(true), { droppable: false });
  }

  /** Map a displayed hand index to the server's current hand (the board may lag a state behind). */
  private serverHandIndex(displayIndex: number, card?: Card): number {
    const played = card ?? this.bottomPlayerHand?.cards[displayIndex];
    const latest = this.latestProps?.bottomPlayerHand ?? this.bottomPlayerHand;
    if (!played || !latest) {
      return displayIndex;
    }
    const index = latest.cards.findIndex((c) => c.id === played.id);
    return index >= 0 ? index : displayIndex;
  }

  /**
   * The card a hand drop refers to. Row indices are re-compacted whenever a card leaves the row
   * (e.g. an earlier play still in flight), so the dragged mesh's card wins over the index.
   */
  private droppedHandCard(result: DropResult): Card | undefined {
    const meshCard = result.playCardFlight?.board3dCard.getGroup().userData.cardData as Card | undefined;
    if (meshCard) {
      return meshCard;
    }
    return result.handIndex != null && result.handIndex >= 0
      ? this.bottomPlayerHand.cards[result.handIndex]
      : undefined;
  }

  private afterCanvasReadyR3f(): void {
    this.lastAnimationCheck = performance.now();
    this.addEventListeners();
  }

  private afterCanvasReady(): void {
    this.lastAnimationCheck = performance.now();
    this.animate();
    this.addEventListeners();
    const container = this.canvasEl.parentElement;
    if (container) {
      this.resizeObserver = new ResizeObserver(() => {
        this.onContainerResize();
      });
      this.resizeObserver.observe(container);
    }
  }

  destroy(): void {
    // Stop animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.transitionQueue.reset();
    this.deckToBenchGeneration++;
    this.deckToBenchChain = Promise.resolve();
    this.deckShuffleDeferred = false;
    this.deferredTrainerDiscards = [];
    this.releaseDeckEntranceWaiters();
    for (const settle of [...this.openAnimationGates]) {
      settle();
    }
    for (const flight of this.localTrainerFlights.values()) {
      flight.dispose();
    }
    this.localTrainerFlights.clear();
    this.deckLimboByPlayer.clear();

    // Kill any active animations
    this.animationService.killAllAnimations();
    this.animationService.disposeCoinFlipScene();
    this.stopAbilityFocusTracking();
    this.stopCardInspectFocusTracking();
    this.cardInspectService.dispose();

    this.wireframeService.dispose(this.scene);

    this.disposeOtherSpotOutlines();
    this.disposeBoardGrid();

    this.stateSync.setBoardInteractionForDamagePreview(null);
    this.stateSync.dispose(this.scene);
    this.handService.dispose(this.worldContentRoot);
    this.interactionService.dispose(this.scene);

    if (!this.r3fMode) {
      this.lightingService.dispose(this.scene);
      this.postProcessingService.dispose();
      this.disposeScene();
      this.renderer?.dispose();
    }

    this.removeEventListeners();

    this.resizeObserver?.disconnect();

    for (const s of this.selectionSubs) {
      s.unsubscribe();
    }
    this.selectionSubs = [];
    this.handPlayFlightHiddenMeshIds.clear();
    this.handPlayBoardBasicAnimationSuppressedMeshIds.clear();
    this.pendingEntranceMeshIds.clear();
    this.deckFlightProtectedMeshIds.clear();
    this.displayedProps = null;
    this.displayedSnapshot = null;
    this.displayOverrides = {};
    this.gatedPromptIds.clear();
    this.lastBottomHandSignature = '';
    this.lastTopHandSignature = '';
  }

  private beginHandPlayFlightHiddenMeshes(meshIds: readonly string[]): void {
    const ids = meshIds.filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      return;
    }
    for (const meshId of ids) {
      this.handPlayFlightHiddenMeshIds.add(meshId);
      this.handPlayBoardBasicAnimationSuppressedMeshIds.add(meshId);
    }
    this.stateSync.hideBoardCardsForHandFlight(ids);
  }

  private endHandPlayFlightHiddenMeshes(meshIds: readonly string[]): void {
    const ids = meshIds.filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      return;
    }
    for (const meshId of ids) {
      this.handPlayFlightHiddenMeshIds.delete(meshId);
      if (!this.handPlayFlightHiddenMeshIds.has(meshId)) {
        const boardCard = this.stateSync.getCardById(meshId);
        if (boardCard) {
          boardCard.getGroup().visible = true;
        }
      }
    }
    window.setTimeout(() => {
      for (const meshId of ids) {
        this.handPlayBoardBasicAnimationSuppressedMeshIds.delete(meshId);
      }
    }, 2000);
  }

  private getHandPlayFlightHiddenMeshIdsForSync(): readonly string[] | undefined {
    const ids = new Set([
      ...this.handPlayFlightHiddenMeshIds,
      ...this.pendingEntranceMeshIds,
    ]);
    return ids.size > 0 ? [...ids] : undefined;
  }

  private initScene(): void {
    this.scene = new Scene();
  }

  private initCamera(): void {
    const canvas = this.canvasEl;
    const aspect = canvas.clientWidth / canvas.clientHeight;

    // Calculate initial perspective
    this.isUpsideDown = this.topPlayer?.id === this.clientId;

    // Get camera configuration based on aspect ratio
    const cameraConfig = getCameraConfig(aspect, this.isUpsideDown);

    this.camera = new PerspectiveCamera(cameraConfig.fov, aspect, 0.1, 2000);
    this.camera.position.set(
      cameraConfig.position.x,
      cameraConfig.position.y,
      cameraConfig.position.z,
    );
    this.camera.lookAt(cameraConfig.lookAt.x, cameraConfig.lookAt.y, cameraConfig.lookAt.z);
  }

  private initRenderer(): void {
    const canvas = this.canvasEl;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Shadow settings - optimized for performance
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    // Note: Shadow map size is controlled by light.shadow.mapSize, not renderer

    // Optimize renderer settings
    this.renderer.sortObjects = false; // Disable sorting for better performance (we handle transparency with alphaTest)

    // Color and tone mapping
    this.renderer.outputColorSpace = 'srgb';
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.assetLoader.setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
  }

  private async createBoardAsync(): Promise<void> {
    // Create board surface geometry
    const boardGeometry = new PlaneGeometry(70, 50);

    // Load black grid texture
    // const boardTexture = await this.assetLoader.loadBoardGridTexture();

    // Board material - dark grey (texture commented out)
    const boardMaterial = new MeshStandardMaterial({
      // map: boardTexture,
      color: 0x404040, // Dark grey
      roughness: 1,
      metalness: 0.0,
    });

    this.boardMesh = new Mesh(boardGeometry, boardMaterial);
    this.boardMesh.rotation.x = -Math.PI / 2; // Make it horizontal
    this.boardMesh.position.z = 12;
    this.boardMesh.receiveShadow = false;
    this.scene.add(this.boardMesh);

    // Twinleaf emblem at true midfield (midpoint between bottom and top active rows)
    const centerTexture = await this.assetLoader.loadBoardCenterTexture();
    const emblemSize = Board3dController.BOARD_CENTER_EMBLEM_SIZE;
    const centerGeometry = new PlaneGeometry(emblemSize, emblemSize);
    const centerMaterial = new MeshBasicMaterial({
      map: centerTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
      alphaTest: 0.02,
    });

    this.boardCenterOverlay = new Mesh(centerGeometry, centerMaterial);
    this.boardCenterOverlay.rotation.x = -Math.PI / 2;
    this.boardCenterOverlay.rotation.z = Math.PI;
    this.boardCenterOverlay.scale.x = -1;

    const midX = (ZONE_POSITIONS.bottomPlayer.active.x + ZONE_POSITIONS.topPlayer.active.x) / 2;
    const midZ = (ZONE_POSITIONS.bottomPlayer.active.z + ZONE_POSITIONS.topPlayer.active.z) / 2;
    this.boardCenterOverlay.position.set(midX, BOARD_3D_CENTER_EMBLEM_Y, midZ);
    this.boardCenterOverlay.renderOrder = 50;
    this.boardCenterOverlay.receiveShadow = false;
    this.scene.add(this.boardCenterOverlay);

    // Add 1-unit grid overlay (same thickness as slot outlines, half opacity)
    this.createBoardGrid();

    this.markDirty();
  }

  /** Grid height - below cards (0.1) so grid appears underneath */
  private static readonly BOARD_GRID_Y = 0.1;
  /** Diameter in world units — ~fit between active rows with margin */
  private static readonly BOARD_CENTER_EMBLEM_SIZE = 7;

  /**
   * Create a 1-unit grid overlay on the board surface.
   * Aligns with the game board's coordinate system so "move by 1 unit" is visible.
   * Same thickness as BENCH_OUTLINE_THICKNESS, 10% opacity.
   * Positioned below cards (y=0.01) so it renders underneath.
   */
  private createBoardGrid(): void {
    this.disposeBoardGrid();

    const t = Board3dController.BENCH_OUTLINE_THICKNESS;
    const y = Board3dController.BOARD_GRID_Y;
    const boardW = 70;
    const boardH = 50;
    const boardCenterZ = 12;
    const minX = -boardW / 2;
    const maxX = boardW / 2;
    const minZ = boardCenterZ - boardH / 2;
    const maxZ = boardCenterZ + boardH / 2;

    const material = new MeshBasicMaterial({
      color: BOARD_3D_BENCH_OUTLINE_COLOR,
      transparent: true,
      opacity: 0.1,
      side: DoubleSide,
      depthTest: true,
    });

    this.boardGridGroup = new Group();

    // Vertical lines at every integer x (1 unit = 1 world unit, same as zone positions)
    for (let x = Math.ceil(minX) + 1; x <= Math.floor(maxX) - 1; x++) {
      const line = new Mesh(new PlaneGeometry(t, boardH), material);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, y, boardCenterZ);
      this.boardGridGroup.add(line);
    }

    // Horizontal lines at every integer z
    for (let z = Math.ceil(minZ) + 1; z <= Math.floor(maxZ) - 1; z++) {
      const line = new Mesh(new PlaneGeometry(boardW, t), material);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, y, z);
      this.boardGridGroup.add(line);
    }

    this.boardGridGroup.renderOrder = -1; // Render first so grid appears underneath cards
    this.boardGridGroup.userData.isBoardGrid = true;
    this.scene.add(this.boardGridGroup);
  }

  private disposeBoardGrid(): void {
    if (!this.boardGridGroup) {
      return;
    }
    this.scene.remove(this.boardGridGroup);
    let material: MeshBasicMaterial | null = null;
    for (const child of this.boardGridGroup.children) {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        material = child.material as MeshBasicMaterial;
      }
    }
    material?.dispose();
    this.boardGridGroup = null;
  }

  private animate = (): void => {
    if (this.r3fMode) {
      return;
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
    updateBoard3dHoloTime(this.holoClock.getElapsedTime());
    this.stateSync.updateBillboards(this.camera);
    this.syncRemoveDamageHudPosition();
    this.postProcessingService.render();
    this.needsRender = false;
  };

  /** Legacy hook for tests; R3F uses {@link Board3dFrameEffects} instead. */
  tick(): void {
    if (!this.r3fMode) {
      return;
    }
  }

  /** World → client pixels for floating Remove damage +/- HUD (follows orbit / selected Pokémon). */
  private syncRemoveDamageHudPosition(): void {
    if (!this.boardInteractionService.isFloatingDamageHudOverlayActive()) {
      this.boardInteractionService.setRemoveDamageHudAnchor(null);
      return;
    }
    const targets = this.boardInteractionService.getSelectedTargets();
    if (targets.length === 0) {
      this.boardInteractionService.setRemoveDamageHudAnchor(null);
      return;
    }
    const group = this.stateSync.getBoardPokemonGroupForTarget(targets[0]);
    if (!group) {
      this.boardInteractionService.setRemoveDamageHudAnchor(null);
      return;
    }
    const worldPos = new Vector3(0, -2.35, 0);
    group.localToWorld(worldPos);
    worldPos.project(this.camera);
    const rect = this.canvasEl.getBoundingClientRect();
    const x = rect.left + (worldPos.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (-worldPos.y * 0.5 + 0.5) * rect.height;
    this.boardInteractionService.setRemoveDamageHudAnchor({ x, y });
  }

  /** Walk from an overlay mesh (energy icon, tool, etc.) to the host board Pokémon {@link CardTarget}. */
  private resolveBoardPokemonCardTargetFromObject(cardObject: Object3D): CardTarget | null {
    let obj: Object3D | null = cardObject;
    while (obj) {
      const ud = obj.userData;
      if (ud?.isBoardCard && ud?.cardTarget) {
        return ud.cardTarget as CardTarget;
      }
      obj = obj.parent;
    }
    return null;
  }

  private onContainerResize(): void {
    const canvas = this.canvasEl;
    const container = canvas.parentElement;
    if (!container) return;

    this.applyViewportDimensions(container.clientWidth, container.clientHeight);
  }

  /** Resize camera (and legacy renderer/composer); R3F sets gl size separately. */
  applyViewportDimensions(width: number, height: number): void {
    if (width === 0 || height === 0) return;

    const aspect = width / height;

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    if (!this.r3fMode) {
      this.renderer.setSize(width, height);
      this.postProcessingService.setSize(width, height);
    }

    const cameraConfig = getCameraConfig(aspect, this.isUpsideDown);

    this.camera.position.set(
      cameraConfig.position.x,
      cameraConfig.position.y,
      cameraConfig.position.z,
    );
    this.camera.lookAt(cameraConfig.lookAt.x, cameraConfig.lookAt.y, cameraConfig.lookAt.z);

    this.markDirty();
  }

  /**
   * Update player perspective - determines if we're viewing from the opposite side
   * Mirrors the 2D board's isUpsideDown logic
   */
  private updatePerspective(): void {
    const wasUpsideDown = this.isUpsideDown;
    this.isUpsideDown = this.topPlayer?.id === this.clientId;

    // Only update camera if perspective changed
    if (wasUpsideDown !== this.isUpsideDown) {
      this.onContainerResize();
    }
  }

  private disposeScene(): void {
    this.scene.traverse((object: any) => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material: any) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }

  public markDirty(): void {
    // Set render flag immediately - batching happens at render level
    this.needsRender = true;
    // Force immediate render if animations are active or dragging
    if (this.animationService.hasActiveAnimations() || this.interactionService.getIsDragging()) {
      // Render will happen on next frame via animate loop
    }
  }

  public onWireframeToggle(enabled: boolean): void {
    this.showWireframes = enabled;
    if (this.showWireframes) {
      this.wireframeService.createWireframes(this.scene);
    } else {
      this.wireframeService.removeWireframes(this.scene);
    }
    this.markDirty();
  }

  public toggleWireframes(): void {
    this.showWireframes = !this.showWireframes;
    if (this.showWireframes) {
      this.wireframeService.createWireframes(this.scene);
    } else {
      this.wireframeService.removeWireframes(this.scene);
    }
    this.markDirty();
  }

  /** Visual-only deck shuffle preview for tuning animation (e.g. S key in R3F). */
  triggerDeckShufflePreview(): void {
    if (!this.r3fMode) {
      return;
    }
    const stackService = this.stateSync.getStackService();
    for (const stackId of stackService.getDeckStackIds()) {
      void playDeckShufflePreview({
        stackService,
        getCardById: (id) => this.stateSync.getCardById(id),
        stackId,
      });
    }
  }

  /**
   * Production shuffle animation for one player's deck (socket / sandbox). Runs in order with
   * board transitions; the pending promise covers the wait in the queue too.
   */
  triggerDeckShuffle(playerId: number): Promise<void> {
    const { promise, settle } = this.openAnimationGate();
    this.boardInteractionService.setPendingDeckShuffleAnimationPromise(promise);
    this.transitionQueue.enqueueEvent(
      async () => {
        try {
          await this.runDeckShuffle(playerId);
        } finally {
          settle();
        }
      },
      { droppable: false },
    );
    return promise;
  }

  private runDeckShuffle(playerId: number): Promise<void> {
    if (!this.r3fMode) {
      return Promise.resolve();
    }
    const position =
      this.bottomPlayer?.id === playerId
        ? 'bottomPlayer'
        : this.topPlayer?.id === playerId
          ? 'topPlayer'
          : null;
    if (!position) {
      return Promise.resolve();
    }
    const stackId = `${position}_${playerId}_deck`;
    const stackService = this.stateSync.getStackService();
    return playDeckShuffleAnimation({
      stackService,
      getCardById: (id) => this.stateSync.getCardById(id),
      stackId,
    });
  }

  private playBoardDeckShuffleAnimation(ev: DeckShuffleAnimationEvent): void {
    if (this.outstandingDeckEntrances > 0) {
      this.deferDeckShuffleUntilEntrancesFinish(ev.playerId);
      return;
    }
    void this.triggerDeckShuffle(ev.playerId);
  }

  /**
   * The bench state is still behind this socket event. Leave the shuffle off the queue until the
   * deck flights that are already announced have landed, then enqueue it in the normal way.
   */
  private deferDeckShuffleUntilEntrancesFinish(playerId: number): void {
    this.deckShuffleDeferred = true;
    const { promise, settle } = this.openAnimationGate();
    this.boardInteractionService.setPendingDeckShuffleAnimationPromise(promise);
    const generation = this.deckToBenchGeneration;
    void this.whenDeckEntrancesIdle().then(() => {
      if (generation !== this.deckToBenchGeneration) {
        this.deckShuffleDeferred = false;
        settle();
        return;
      }
      this.transitionQueue.enqueueEvent(
        async () => {
          try {
            await this.runDeckShuffle(playerId);
            if (generation === this.deckToBenchGeneration) {
              await this.playDeferredTrainerDiscards();
            }
          } finally {
            this.deckShuffleDeferred = false;
            settle();
          }
        },
        { droppable: false },
      );
    });
  }

  private trackDeckEntrance(): void {
    this.outstandingDeckEntrances++;
  }

  private finishDeckEntrance(): void {
    this.outstandingDeckEntrances = Math.max(0, this.outstandingDeckEntrances - 1);
    if (this.outstandingDeckEntrances === 0) {
      const waiters = this.deckEntranceIdleWaiters;
      this.deckEntranceIdleWaiters = [];
      for (const waiter of waiters) {
        waiter();
      }
      if (!this.deckShuffleDeferred && this.deferredTrainerDiscards.length > 0) {
        this.transitionQueue.enqueueEvent(() => this.playDeferredTrainerDiscards(), { droppable: false });
      }
    }
  }

  private whenDeckEntrancesIdle(): Promise<void> {
    if (this.outstandingDeckEntrances === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.deckEntranceIdleWaiters.push(resolve);
    });
  }

  /** Wake deferred shuffles during destroy so they can bail instead of hanging. */
  private releaseDeckEntranceWaiters(): void {
    this.outstandingDeckEntrances = 0;
    const waiters = this.deckEntranceIdleWaiters;
    this.deckEntranceIdleWaiters = [];
    for (const waiter of waiters) {
      waiter();
    }
  }

  /**
   * Update drop zones if bench size has changed
   */
  private updateDropZonesForBenchSize(): void {
    const bottomBenchSize = this.bottomPlayer?.bench?.length ?? 5;
    const topBenchSize = this.topPlayer?.bench?.length ?? 5;

    // Recreate drop zones with updated bench sizes
    this.interactionService
      .createDropZoneIndicators(this.scene, bottomBenchSize, topBenchSize)
      .then((rebuilt) => {
        if (rebuilt) {
          this.createZoneOutlines();
        }
        this.markDirty();
      });
  }

  /** Bench ribbon tuning */
  private static readonly BENCH_OUTLINE_THICKNESS = 0.02;
  private static readonly BENCH_OUTLINE_Y = 0.15;

  /** Card/slot dimensions for non-bench outlines (match enlarged {@link Board3dDropZone} defaults). */
  private static readonly CARD_SLOT_WIDTH =
    BOARD3D_CARD_SLOT_BASE_WIDTH * BOARD3D_DROP_ZONE_TARGET_SCALE;
  private static readonly CARD_SLOT_HEIGHT =
    BOARD3D_CARD_SLOT_BASE_HEIGHT * BOARD3D_DROP_ZONE_TARGET_SCALE;

  /**
   * Create decorative outlines for non-bench zones.
   * Bench card spaces are marked by the static cream frames in Board3dStaticScene.
   */
  private createZoneOutlines(): void {
    this.disposeOtherSpotOutlines();

    const w = Board3dController.CARD_SLOT_WIDTH;
    const h = Board3dController.CARD_SLOT_HEIGHT;

    // Stadium (single shared slot)
    this.addSpotOutline(ZONE_POSITIONS.stadium, w, h);

    // Active, supporter, deck, discard (each player)
    for (const position of ['bottomPlayer', 'topPlayer'] as const) {
      const zp = ZONE_POSITIONS[position];
      this.addSpotOutline(zp.active, w, h);
      this.addSpotOutline(zp.supporter, w, h);
      this.addSpotOutline(zp.deck, w, h);
      this.addSpotOutline(zp.discard, w, h);
      this.addSpotOutline(zp.lostZone, w, h);
    }

    // Prize slots (6 per player, 2x3 grid - match board-3d-prize.service layout)
    for (const basePos of [ZONE_POSITIONS.bottomPlayer.prizes, ZONE_POSITIONS.topPlayer.prizes]) {
      for (let i = 0; i < 6; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const offsetX = (col - 0.5) * 3;
        const offsetZ = (row - 1) * 4;
        const pos = new Vector3(basePos.x + offsetX, basePos.y, basePos.z + offsetZ);
        this.addSpotOutline(pos, w, h);
      }
    }
  }

  private addSpotOutline(position: Vector3, width: number, height: number): void {
    const group = this.createSpotOutlineGroup(position, width, height);
    this.otherSpotOutlines.push(group);
    this.scene.add(group);
  }

  /**
   * Create a Group with 4 thin plane meshes forming a rectangle outline.
   */
  private createSpotOutlineGroup(
    position: Vector3,
    width: number,
    height: number,
    outlineColor: number = BOARD_3D_BENCH_OUTLINE_COLOR,
    outlineOpacity: number = 0,
  ): Group {
    const t = Board3dController.BENCH_OUTLINE_THICKNESS;
    const y = Board3dController.BENCH_OUTLINE_Y;
    const minX = position.x - width / 2;
    const maxX = position.x + width / 2;
    const minZ = position.z - height / 2;
    const maxZ = position.z + height / 2;

    const material = new MeshBasicMaterial({
      color: outlineColor,
      transparent: true,
      opacity: outlineOpacity,
      side: DoubleSide,
      depthTest: true,
    });

    const group = new Group();

    const topEdge = new Mesh(new PlaneGeometry(width + t * 2, t), material);
    topEdge.rotation.x = -Math.PI / 2;
    topEdge.position.set(position.x, y, maxZ + t / 2);
    group.add(topEdge);

    const bottomEdge = new Mesh(new PlaneGeometry(width + t * 2, t), material);
    bottomEdge.rotation.x = -Math.PI / 2;
    bottomEdge.position.set(position.x, y, minZ - t / 2);
    group.add(bottomEdge);

    const leftEdge = new Mesh(new PlaneGeometry(t, height), material);
    leftEdge.rotation.x = -Math.PI / 2;
    leftEdge.position.set(minX - t / 2, y, position.z);
    group.add(leftEdge);

    const rightEdge = new Mesh(new PlaneGeometry(t, height), material);
    rightEdge.rotation.x = -Math.PI / 2;
    rightEdge.position.set(maxX + t / 2, y, position.z);
    group.add(rightEdge);

    group.renderOrder = 100;
    group.userData.isSpotOutline = true;
    return group;
  }

  /**
   * Remove and dispose other (non-bench) spot outline meshes.
   */
  private disposeOtherSpotOutlines(): void {
    const disposeGroup = (g: Group) => {
      this.scene.remove(g);
      let material: MeshBasicMaterial | null = null;
      for (const child of g.children) {
        if (child instanceof Mesh) {
          child.geometry.dispose();
          material = child.material as MeshBasicMaterial;
        }
      }
      material?.dispose();
    };
    this.otherSpotOutlines.forEach(disposeGroup);
    this.otherSpotOutlines = [];
  }

  private updateDropZoneOccupancy(): void {
    // Use the correctly assigned bottomPlayer and topPlayer from inputs
    // (these are already assigned correctly by parent component based on clientId)
    const bottom = this.bottomPlayer;
    const top = this.topPlayer;

    // Bottom player occupancy
    const bottomActive = bottom?.active?.cards?.length > 0;
    const bottomBench = bottom?.bench?.map((slot) => slot?.cards?.length > 0) ?? [];

    // Top player occupancy
    const topActive = top?.active?.cards?.length > 0;
    const topBench = top?.bench?.map((slot) => slot?.cards?.length > 0) ?? [];

    this.interactionService.updateOccupiedZones(bottomActive, bottomBench, topActive, topBench);
  }

  /** Replay viewer sees both hands; near-hand must render face-up like the owner's. */
  private isReplayOmniscient(): boolean {
    return !!this.gameState?.replay;
  }

  private isHandVisibleToViewer(): boolean {
    if (!this.bottomPlayer) {
      return false;
    }
    if (this.bottomPlayer.id === this.clientId) {
      return true;
    }
    if (this.isReplayOmniscient()) {
      return true;
    }
    return this.adminSpectatorReveal?.revealHands ?? false;
  }

  /** Far hand face-up when viewing as that player, replay, admin reveal, or hand.isPublic (e.g. Clairvoyance). */
  private isOpponentHandVisibleToViewer(): boolean {
    if (!this.topPlayer) {
      return false;
    }
    if (this.topPlayer.id === this.clientId) {
      return true;
    }
    if (this.isReplayOmniscient()) {
      return true;
    }
    if (this.topPlayerHand?.isPublic || this.topPlayer.hand?.isPublic) {
      return true;
    }
    return this.adminSpectatorReveal?.revealHands ?? false;
  }

  private canRevealPrizesToViewer(): boolean {
    if (this.isReplayOmniscient()) {
      return true;
    }
    return this.adminSpectatorReveal?.revealPrizes ?? false;
  }

  /**
   * Socket animation events use the same mesh ids as {@link Board3dStateSyncService}.
   * Slot may be `'active'` / `'bench'` (attack, board emit helpers) or stringified {@link SlotType} (`"1"` / `"2"`).
   * When slot/index are missing, falls back to scanning board meshes by cardData.id.
   */
  private boardMeshIdFromAnimationEvent(ev: BasicEntranceAnimationEvent): string | null {
    if (!this.bottomPlayer?.id || !this.topPlayer?.id) {
      return null;
    }
    const pos =
      ev.playerId === this.bottomPlayer.id
        ? 'bottomPlayer'
        : ev.playerId === this.topPlayer.id
          ? 'topPlayer'
          : null;
    if (!pos) {
      return null;
    }
    const slot = ev.slot;
    const isActive = slot === 'active' || slot === String(SlotType.ACTIVE);
    const isBench = slot === 'bench' || slot === String(SlotType.BENCH);
    if (isActive) {
      return `${pos}_${ev.playerId}_active`;
    }
    if (isBench && ev.index !== undefined) {
      return `${pos}_${ev.playerId}_bench_${ev.index}`;
    }
    return this.stateSync.findMeshIdByCardDataId(ev.cardId, ev.playerId);
  }

  private playBoardAttackAnimation(ev: BasicEntranceAnimationEvent): void {
    const meshId = this.boardMeshIdFromAnimationEvent(ev);
    if (!meshId) {
      this.boardInteractionService.setPendingAttackAnimationPromise(Promise.resolve());
      return;
    }
    const boardCard = this.stateSync.getCardById(meshId);
    if (!boardCard) {
      this.boardInteractionService.setPendingAttackAnimationPromise(Promise.resolve());
      return;
    }
    const p = this.animationService.playAttackAnimation(boardCard.getGroup());
    this.boardInteractionService.setPendingAttackAnimationPromise(p);
  }

  private playBoardAbilityAnimation(ev: AbilityAnimationEvent): void {
    this.stopAbilityFocusTracking();
    const maxAttempts = 12;
    const fallbackWait = this.animationService.createAbilityActivationFallbackWait();

    const tryPlay = (attempt: number): void => {
      const meshId = this.boardMeshIdFromAnimationEvent(ev);
      if (!meshId) {
        this.boardInteractionService.setPendingAbilityAnimationPromise(fallbackWait());
        return;
      }
      const boardCard = this.stateSync.getCardById(meshId);
      if (!boardCard) {
        if (attempt < maxAttempts) {
          requestAnimationFrame(() => tryPlay(attempt + 1));
          return;
        }
        this.boardInteractionService.setPendingAbilityAnimationPromise(fallbackWait());
        return;
      }
      const group = boardCard.getGroup();
      const data = group.userData?.cardData as Card | undefined;
      if (data && data.id !== ev.cardId) {
        if (attempt < maxAttempts) {
          requestAnimationFrame(() => tryPlay(attempt + 1));
          return;
        }
        this.boardInteractionService.setPendingAbilityAnimationPromise(fallbackWait());
        return;
      }

      this.startAbilityFocusTracking(group, ev.abilityName);
      const p = this.animationService.playAbilityActivationAnimation(group);
      this.boardInteractionService.setPendingAbilityAnimationPromise(p);
      void p.finally(() => {
        this.stopAbilityFocusTracking();
      });
    };

    tryPlay(0);
  }

  private playBoardCoinFlipAnimation(ev: CoinFlipAnimationEvent): void {
    if (!this.scene) {
      return;
    }
    const flippingPlayer =
      this.bottomPlayer?.id === ev.playerId
        ? this.bottomPlayer
        : this.topPlayer?.id === ev.playerId
          ? this.topPlayer
          : undefined;
    const frontPath =
      (flippingPlayer as { coinImagePath?: string } | undefined)?.coinImagePath ||
      'twinleaf-coin.png';
    const headsUrl = this.cardsAdapter.getCoinUrl(frontPath);
    const tailsUrl = this.cardsAdapter.getCoinUrl('twinleaf-coin-back.png');
    this.animationService.playCoinFlipAnimation(this.scene, ev.result, headsUrl, tailsUrl);
  }

  private cancelBoardCoinFlipAnimation(): void {
    this.animationService.cancelCoinFlipAnimation();
  }

  private projectCardGroupToScreenRect(group: Object3D): AbilityFocusAnchor | null {
    if (!this.canvasEl || !this.camera) {
      return null;
    }

    const bridge = group.userData?.board3dCard as Board3dCard | undefined;
    const cardMesh = bridge?.getMesh();
    if (!cardMesh) {
      return null;
    }

    const canvasRect = this.canvasEl.getBoundingClientRect();
    return projectCardFaceToScreenAnchor(cardMesh, this.camera, canvasRect, 6);
  }

  private startAbilityFocusTracking(group: Object3D, abilityName: string): void {
    const tick = (): void => {
      const anchor = this.projectCardGroupToScreenRect(group);
      this.boardInteractionService.setAbilityFocus({ abilityName, anchor });
      this.abilityFocusRafId = requestAnimationFrame(tick);
    };
    tick();
  }

  private stopAbilityFocusTracking(): void {
    if (this.abilityFocusRafId != null) {
      cancelAnimationFrame(this.abilityFocusRafId);
      this.abilityFocusRafId = null;
    }
    this.boardInteractionService.clearAbilityFocus();
  }

  private projectCardGroupLowerFaceToScreen(group: Object3D): AbilityFocusAnchor | null {
    if (!this.canvasEl || !this.camera) {
      return null;
    }
    const bridge = group.userData?.board3dCard as Board3dCard | undefined;
    const cardMesh = bridge?.getMesh();
    if (!cardMesh) {
      return null;
    }
    const canvasRect = this.canvasEl.getBoundingClientRect();
    return projectCardLowerFaceToScreenAnchor(cardMesh, this.camera, canvasRect, 2);
  }

  private projectCardGroupRetreatToScreen(group: Object3D): AbilityFocusAnchor | null {
    if (!this.canvasEl || !this.camera) {
      return null;
    }
    const bridge = group.userData?.board3dCard as Board3dCard | undefined;
    const cardMesh = bridge?.getMesh();
    if (!cardMesh) {
      return null;
    }
    const canvasRect = this.canvasEl.getBoundingClientRect();
    return projectCardRetreatPlateToScreenAnchor(cardMesh, this.camera, canvasRect, 1);
  }

  private startCardInspectFocusTracking(group: Object3D): void {
    this.stopCardInspectFocusTracking();
    const tick = (): void => {
      const anchor = this.projectCardGroupLowerFaceToScreen(group);
      const retreatAnchor = this.projectCardGroupRetreatToScreen(group);
      this.boardInteractionService.setCardInspectFocus({ anchor, retreatAnchor });
      this.cardInspectFocusRafId = requestAnimationFrame(tick);
    };
    tick();
  }

  private stopCardInspectFocusTracking(): void {
    if (this.cardInspectFocusRafId != null) {
      cancelAnimationFrame(this.cardInspectFocusRafId);
      this.cardInspectFocusRafId = null;
    }
    this.boardInteractionService.clearCardInspectFocus();
  }

  /** Full card meshes get 3D inspect; energy icons / tool tabs keep the modal. */
  private canUse3dCardInspect(cardObject: Object3D): boolean {
    if (cardObject.userData.isEnergyIcon || cardObject.userData.isToolCard) {
      return false;
    }
    if (cardObject.userData.isLegendHalf) {
      return false;
    }
    return (
      cardObject.userData.isCard === true ||
      cardObject.userData.board3dCard != null ||
      cardObject.userData.isBoardCard === true ||
      cardObject.userData.isHandCard === true ||
      cardObject.userData.isOpponentHandCard === true ||
      cardObject.userData.isStadium === true ||
      cardObject.userData.isPrize === true
    );
  }

  /**
   * Open card info — optionally starts 3D inspect when {@link BOARD3D_CARD_INFO_INSPECT_ENABLED}.
   * Call {@link exitCardInspect} when the React prompt closes (no-op if inspect was not used).
   */
  private openCardInfo(
    cardObject: Object3D,
    data: Board3dCardInfoData,
  ): Promise<CardInfoPaneActionResult> {
    if (
      !BOARD3D_CARD_INFO_INSPECT_ENABLED ||
      !this.canUse3dCardInspect(cardObject) ||
      !this.scene ||
      !this.camera
    ) {
      return this.cardsAdapter.showCardInfo(data);
    }

    // Clear board hover scale so the inspect snapshot is the resting pose.
    this.interactionService.clearPokemonHoverEffects();
    this.interactionService.clearHoverState();

    void this.cardInspectService.enterInspect(cardObject, this.scene, this.camera);
    this.startCardInspectFocusTracking(cardObject);
    return this.cardsAdapter.showCardInfo({ ...data, inspect3d: true });
  }

  /** Reverse inspect animation after the info overlay / modal closes. */
  exitCardInspect(): void {
    this.stopCardInspectFocusTracking();
    void this.cardInspectService.exitInspect();
  }

  /**
   * Basic Pokémon entrance from hand/item (socket): same motion as dragging from hand to bench
   * ({@link Board3dAnimationService.playHandCardDropOnBoard}), not {@link Board3dAnimationService.playBasicAnimation}.
   */
  private playHandCardDropBasicAnimation(group: Group, meshId: string): void {
    /** Matches {@link BOARD3D_PLAYER_HAND_Z} / player hand row. */
    const handPlayFlightStartZ = BOARD3D_PLAYER_HAND_Z;
    /** Matches retained drag scale when {@link Board3dInteractionService} uses hand play flight. */
    const handPlayFlightInitialScale = 1.3;

    const targetWorld = group.position.clone();
    targetWorld.y = Math.max(targetWorld.y, 0.08);

    const isTopPlayer = meshId.startsWith('topPlayer_');
    const endRotationY = isTopPlayer ? Math.PI : 0;
    const isActive = meshId.endsWith('_active');
    const endScale = isActive ? 1.5 : 1.0;

    gsap.killTweensOf(group.position);
    gsap.killTweensOf(group.rotation);
    gsap.killTweensOf(group.scale);

    group.position.set(targetWorld.x, 0.15, handPlayFlightStartZ);
    group.rotation.set(0, 0, 0);
    group.scale.setScalar(handPlayFlightInitialScale);

    void this.animationService.playHandCardDropOnBoard(group, targetWorld, {
      endScale,
      endRotationY,
    });
  }

  /**
   * Cascade deck→bench flights. The next card may leave the deck 0.5s after this one starts,
   * while this flight is still in the air. `markStarted` releases that wait.
   */
  private enqueueDeckToBench(run: (markStarted: () => void) => Promise<void>): void {
    const generation = this.deckToBenchGeneration;
    let resolveStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    let didStart = false;
    const markStarted = (): void => {
      if (didStart) {
        return;
      }
      didStart = true;
      resolveStarted();
    };

    const flight = this.deckToBenchChain.then(async () => {
      try {
        if (generation !== this.deckToBenchGeneration) {
          markStarted();
          return;
        }
        await run(markStarted);
      } finally {
        markStarted();
        this.finishDeckEntrance();
      }
    });
    this.deckToBenchChain = started.then(
      () =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, DECK_TO_BENCH_LAUNCH_STAGGER_MS);
        }),
    );
    void flight.catch((error) => {
      markStarted();
      console.error('[Board3D] deck-to-board basic animation failed:', error);
    });
  }

  /**
   * Basic Pokémon from deck: arc off the deck face-down, flip to reveal mid-flight, hover
   * over the slot, then play the same drop used when a card is played from the hand.
   */
  private playDeckToBenchBasicAnimation(group: Group, meshId: string, boardCard: Board3dCard): void {
    const targetWorld = group.position.clone();
    targetWorld.y = Math.max(targetWorld.y, 0.08);

    const isTopPlayer = meshId.startsWith('topPlayer_');
    const seat = isTopPlayer ? 'topPlayer' : 'bottomPlayer';
    const player = isTopPlayer ? this.topPlayer : this.bottomPlayer;
    // Match the draw animation's start: top card of the post-effect deck (one card removed).
    const deckCountAfter = player?.deck?.cards?.length ?? 0;
    const deckStart = ZONE_POSITIONS[seat].deck.clone();
    deckStart.y +=
      Math.max(0, deckCountAfter) * Board3dStackService.STACK_HEIGHT_INCREMENT + 0.35;

    const isActive = meshId.endsWith('_active');
    const endScale = isActive ? 1.5 : 1.0;
    const endRotationY = isTopPlayer ? Math.PI : 0;
    const card = group.userData?.cardData as Card | undefined;
    const cardList = group.userData?.cardList as PokemonCardList | undefined;
    let flightCard: Board3dCard | null = null;
    const generation = this.deckToBenchGeneration;
    const flightStillOwned = (): boolean =>
      generation === this.deckToBenchGeneration && this.deckFlightProtectedMeshIds.has(meshId);
    const cleanupFlightMetadata = (): void => {
      this.pendingEntranceMeshIds.delete(meshId);
      delete group.userData.playingToBoard;
      group.position.copy(targetWorld);
      group.rotation.set(0, endRotationY, 0);
      group.scale.setScalar(endScale);
      flightCard?.dispose();
      flightCard = null;
      group.visible = true;
      this.deckFlightProtectedMeshIds.delete(meshId);
      this.stateSync.unprotectBoardCardVisual(meshId);
      this.stateSync.publishSceneModel(this.handService.getHandSlotSnapshots());
      this.syncGameState();
      this.markDirty();
    };
    const sleevePath = (player?.deck as { sleeveImagePath?: string } | undefined)?.sleeveImagePath;
    const sleeveUrl = sleevePath ? this.cardsAdapter.getSleeveUrl(sleevePath) : undefined;
    const assetReady = Promise.all([
      sleeveUrl ? this.assetLoader.loadSleeveTexture(sleeveUrl) : this.assetLoader.loadCardBack(),
      this.assetLoader.loadCardMaskTexture(),
    ]).then(async ([cardBack, mask]) => {
      const scanUrl = card ? this.cardsAdapter.getScanUrlFor3D(card, cardList) : undefined;
      let scan = cardBack;
      if (scanUrl?.trim()) {
        try {
          scan = await this.assetLoader.loadCardTexture(scanUrl);
        } catch {
          // Keep the cardback as the face if the scan cannot be loaded.
        }
      }
      return { cardBack, mask, scan };
    });

    group.userData.playingToBoard = true;
    group.visible = false;
    this.pendingEntranceMeshIds.add(meshId);
    this.deckFlightProtectedMeshIds.add(meshId);
    this.stateSync.protectBoardCardVisual(meshId);
    this.stateSync.publishSceneModel(this.handService.getHandSlotSnapshots());
    this.markDirty();

    this.enqueueDeckToBench(async (markStarted) => {
      try {
        const { cardBack, mask, scan } = await assetReady;
        if (!flightStillOwned()) {
          return;
        }

        // Animate an independent card, leaving the actual slot mesh hidden until the drop lands.
        flightCard = new Board3dCard(cardBack, cardBack, deckStart, isTopPlayer ? 180 : 0, 1.1, mask);
        const flightGroup = flightCard.getGroup();
        flightGroup.userData.cardData = card;
        flightGroup.userData.cardList = cardList;
        flightGroup.userData.isFaceDown = true;
        flightGroup.rotation.set(0, endRotationY, Math.PI);
        flightGroup.renderOrder = 110;
        this.worldContentRoot.add(flightGroup);
        this.pendingEntranceMeshIds.delete(meshId);
        this.markDirty();
        playSfx('pokemonplay');
        markStarted();

        await this.animationService.playDrawDeckToBoard(flightGroup, targetWorld, {
          endRotationY,
          onRevealFace: () => {
            // Flip is z=π → 0, so the exposed face at the end of the turn is the card front.
            flightCard?.updateTexture(scan, cardBack, mask);
            flightCard?.setHolo(null);
            if (flightGroup.userData) {
              flightGroup.userData.isFaceDown = false;
            }
            this.markDirty();
          },
        });
        if (!flightStillOwned()) {
          flightCard?.dispose();
          flightCard = null;
          return;
        }

        await this.animationService.playHandCardDropOnBoard(flightGroup, targetWorld, {
          endScale,
          endRotationY,
          durationScale: DECK_TO_BENCH_DROP_PACE,
        });
        if (!flightStillOwned()) {
          flightCard?.dispose();
          flightCard = null;
          return;
        }

        boardCard.updateTexture(scan, cardBack, mask);
        boardCard.setHolo(null);
        cleanupFlightMetadata();
        if (card) {
          void apply3dCardHolo(this.assetLoader, boardCard, card, false);
        }
      } catch (error) {
        console.error('[Board3D] deck-to-board basic animation failed:', error);
        if (flightStillOwned()) {
          cleanupFlightMetadata();
        } else {
          flightCard?.dispose();
          flightCard = null;
        }
      }
    });
  }

  private async createLegendHalfFlightCard(
    card: Card,
    cardList: PokemonCardList,
    startPosition: Vector3,
  ): Promise<Board3dCard | null> {
    const scanUrl = this.cardsAdapter.getScanUrlFor3D(card, cardList);
    const loadFrontTexture = async (): Promise<Texture> => {
      if (!scanUrl?.trim()) {
        return this.assetLoader.loadCardBack();
      }
      try {
        return await this.assetLoader.loadCardTexture(scanUrl);
      } catch {
        return this.assetLoader.loadCardBack();
      }
    };

    const [frontTexture, backTexture, maskTexture] = await Promise.all([
      loadFrontTexture(),
      this.assetLoader.loadCardBack(),
      this.assetLoader.loadCardMaskTexture(),
    ]);

    const mesh = new Board3dCard(
      frontTexture,
      backTexture,
      startPosition,
      LEGEND_3D_HALF_ROTATION,
      LEGEND_3D_HALF_SCALE,
      maskTexture,
    );
    const cardGroup = mesh.getGroup();
    cardGroup.userData.cardData = card;
    cardGroup.userData.board3dCard = mesh;
    this.worldContentRoot.add(cardGroup);
    return mesh;
  }

  private playRemoteLegendAssemblyAnimation(
    meshId: string,
    boardCard: Board3dCard,
    topCard: Card,
    bottomCard: Card,
    cardList: PokemonCardList,
  ): void {
    this.beginHandPlayFlightHiddenMeshes([meshId]);

    const aspect = this.canvasEl.clientWidth / Math.max(this.canvasEl.clientHeight, 1);
    const stageCenter = getDrawFlightStageCenterWorld(aspect, this.isUpsideDown);
    const targetWorld = boardCard.getGroup().position.clone();
    targetWorld.y = Math.max(targetWorld.y, 0.08);
    const isTopPlayer = meshId.startsWith('topPlayer_');
    const endRotationY = isTopPlayer ? Math.PI : 0;
    const startPosition = new Vector3(stageCenter.x, 0.15, 30);

    let disposed = false;
    const finish = (topHalf: Board3dCard | null, bottomHalf: Board3dCard | null): void => {
      if (disposed) {
        return;
      }
      disposed = true;
      topHalf?.dispose();
      bottomHalf?.dispose();
      this.endHandPlayFlightHiddenMeshes([meshId]);
      this.syncGameState();
      this.markDirty();
    };

    void (async () => {
      const [topHalf, bottomHalf] = await Promise.all([
        this.createLegendHalfFlightCard(topCard, cardList, startPosition.clone()),
        this.createLegendHalfFlightCard(bottomCard, cardList, startPosition.clone()),
      ]);
      if (!topHalf || !bottomHalf) {
        finish(topHalf, bottomHalf);
        return;
      }

      try {
        await this.animationService.playLegendAssemblyAnimation(
          this.worldContentRoot,
          topHalf.getGroup(),
          bottomHalf.getGroup(),
          stageCenter,
          targetWorld,
          endRotationY,
        );
      } finally {
        finish(topHalf, bottomHalf);
      }
    })();
  }

  /**
   * Socket entrance events arrive just before the state that contains their mesh. Keep the slot
   * hidden while earlier transitions play, then animate right after that state commits.
   */
  private playBoardBasicAnimation(ev: BasicEntranceAnimationEvent): void {
    if (ev.source === 'deck') {
      this.trackDeckEntrance();
    }
    const meshId = this.boardMeshIdFromAnimationEvent(ev);
    const hide =
      meshId != null &&
      (ev.source === 'deck' ||
        (!this.handPlayBoardBasicAnimationSuppressedMeshIds.has(meshId) &&
          !this.handPlayFlightHiddenMeshIds.has(meshId)));
    if (hide) {
      this.pendingEntranceMeshIds.add(meshId);
      if (ev.source === 'deck') {
        // Protect synchronously so a state sync racing the socket event cannot show the slot card.
        this.deckFlightProtectedMeshIds.add(meshId);
        this.stateSync.protectBoardCardVisual(meshId);
        this.stateSync.publishSceneModel(this.handService.getHandSlotSnapshots());
      }
    }
    this.transitionQueue.runAfterNextCommit(() => {
      if (!hide) {
        this.playBoardBasicAnimationNow(ev);
        return;
      }
      // Deck arrivals keep their board mesh hidden while texture assets load and it launches.
      if (ev.source !== 'deck') {
        this.pendingEntranceMeshIds.delete(meshId);
        const boardCard = this.stateSync.getCardById(meshId);
        if (boardCard) {
          boardCard.getGroup().visible = true;
        }
      }
      this.playBoardBasicAnimationNow(ev);
      this.markDirty();
    });
  }

  private playBoardBasicAnimationNow(ev: BasicEntranceAnimationEvent): void {
    const maxAttempts = 12;
    const abandonDeckEntrance = (): void => {
      if (ev.source === 'deck') {
        this.finishDeckEntrance();
      }
    };

    const tryPlay = (attempt: number): void => {
      const meshId = this.boardMeshIdFromAnimationEvent(ev);
      if (!meshId) {
        abandonDeckEntrance();
        return;
      }
      const boardCard = this.stateSync.getCardById(meshId);
      if (!boardCard) {
        if (attempt < maxAttempts) {
          requestAnimationFrame(() => tryPlay(attempt + 1));
          return;
        }
        abandonDeckEntrance();
        return;
      }
      if (
        ev.source !== 'deck' &&
        this.handPlayBoardBasicAnimationSuppressedMeshIds.has(meshId)
      ) {
        this.handPlayBoardBasicAnimationSuppressedMeshIds.delete(meshId);
        return;
      }
      if (ev.source !== 'deck' && this.handPlayFlightHiddenMeshIds.has(meshId)) {
        return;
      }
      const group = boardCard.getGroup();
      const data = group.userData?.cardData as Card | undefined;
      if (data && data.id !== ev.cardId) {
        if (attempt < maxAttempts) {
          requestAnimationFrame(() => tryPlay(attempt + 1));
          return;
        }
        abandonDeckEntrance();
        return;
      }

      const cardList = group.userData?.cardList as PokemonCardList | undefined;
      const { top: topHalfCard, bottom: bottomHalfCard } = cardList
        ? resolveLegendDisplayHalves(cardList)
        : {};
      const waitingForLegendHalves =
        !!cardList &&
        !!cardList.getPokemonCard()?.tags.includes(CardTag.LEGEND) &&
        (!topHalfCard || !bottomHalfCard) &&
        cardList.cards.some((c) => c.fullName.includes('(Top)') || c.fullName.includes('(Bottom)'));
      if (waitingForLegendHalves) {
        if (attempt < maxAttempts) {
          requestAnimationFrame(() => tryPlay(attempt + 1));
          return;
        }
        abandonDeckEntrance();
        return;
      }
      if (topHalfCard && bottomHalfCard && cardList) {
        abandonDeckEntrance();
        this.playRemoteLegendAssemblyAnimation(
          meshId,
          boardCard,
          topHalfCard,
          bottomHalfCard,
          cardList,
        );
        return;
      }

      if (ev.source === 'deck') {
        // Keep state-sync from snapping the card back into the slot while it flies from the deck.
        this.playDeckToBenchBasicAnimation(group, meshId, boardCard);
        return;
      }

      this.playHandCardDropBasicAnimation(group, meshId);
    };
    tryPlay(0);
  }

  private playBoardEvolutionAnimation(ev: BasicEntranceAnimationEvent): void {
    this.transitionQueue.runAfterNextCommit(() => this.playBoardEvolutionAnimationNow(ev));
  }

  private playBoardEvolutionAnimationNow(ev: BasicEntranceAnimationEvent): void {
    const maxAttempts = 12;
    const tryPlay = (attempt: number): void => {
      const meshId = this.boardMeshIdFromAnimationEvent(ev);
      if (!meshId) {
        return;
      }
      const boardCard = this.stateSync.getCardById(meshId);
      if (!boardCard) {
        if (attempt < maxAttempts) {
          requestAnimationFrame(() => tryPlay(attempt + 1));
        }
        return;
      }
      const group = boardCard.getGroup();
      const data = group.userData?.cardData as Card | undefined;
      if (data && data.id !== ev.cardId) {
        if (attempt < maxAttempts) {
          requestAnimationFrame(() => tryPlay(attempt + 1));
        }
        return;
      }
      void this.animationService.evolutionAnimation(group);
    };
    tryPlay(0);
  }

  private addEventListeners(): void {
    const canvas = this.canvasEl;

    if (this.r3fMode) {
      // `pointerdown`: raycast for hand, prizes, stacks, drop zones; board cards also fire mesh `onPointerDown`
      // with the same timestamp — {@link handleR3fMeshPointerDown} + {@link r3fMeshPointerDownTs} dedup.
      canvas.addEventListener('pointerdown', this.onPointerDown);
      canvas.addEventListener('pointermove', this.onPointerMove);
      canvas.addEventListener('pointerup', this.onPointerUp);
      canvas.addEventListener('pointercancel', this.onPointerCancel);
      canvas.addEventListener('pointerleave', this.onPointerLeave);
      canvas.addEventListener('contextmenu', this.onContextMenu);
    } else {
      canvas.addEventListener('mousedown', this.onMouseDown);
      canvas.addEventListener('mousemove', this.onMouseMove);
      canvas.addEventListener('mouseup', this.onMouseUp);
      canvas.addEventListener('mouseleave', this.onMouseLeave);
      canvas.addEventListener('contextmenu', this.onContextMenu);
    }
  }

  private removeEventListeners(): void {
    const canvas = this.canvasEl;

    if (this.r3fMode) {
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('pointercancel', this.onPointerCancel);
      canvas.removeEventListener('pointerleave', this.onPointerLeave);
      canvas.removeEventListener('contextmenu', this.onContextMenu);
    } else {
      canvas.removeEventListener('mousedown', this.onMouseDown);
      canvas.removeEventListener('mousemove', this.onMouseMove);
      canvas.removeEventListener('mouseup', this.onMouseUp);
      canvas.removeEventListener('mouseleave', this.onMouseLeave);
      canvas.removeEventListener('contextmenu', this.onContextMenu);
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (this.r3fMode && event.timeStamp === this.r3fMeshPointerDownTs) {
      return;
    }
    this.onMouseDown(event as unknown as MouseEvent);
  };

  private onPointerMove = (event: PointerEvent): void => {
    this.onMouseMove(event as unknown as MouseEvent);
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.onMouseUp(event as unknown as MouseEvent);
  };

  private onPointerCancel = (): void => {
    this.onMouseLeave();
  };

  private onPointerLeave = (): void => {
    this.onMouseLeave();
  };

  private onMouseDown = (event: MouseEvent): void => {
    const canvas = this.canvasEl;
    const card = this.interactionService.onMouseDown(
      event,
      this.camera,
      this.scene,
      canvas,
      undefined,
      this.shouldDisableHandDragForSelection(),
    );

    if (card) {
      const startingSetup = this.boardInteractionService.isChooseStartingPokemonsSelectionActive();
      const disableHandDrag = this.shouldDisableHandDragForSelection();
      canvas.style.cursor = disableHandDrag && !startingSetup ? 'pointer' : 'grabbing';
      this.markDirty();
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    const canvas = this.canvasEl;

    if (this.interactionService.getIsDragging() || this.interactionService.hasPendingDrag()) {
      this.interactionService.onMouseMoveDrag(event, this.camera, this.scene, canvas);
    } else {
      const hoveredCard = this.interactionService.onMouseMove(
        event,
        this.camera,
        this.scene,
        canvas,
      );

      if (hoveredCard !== this.currentHoveredCard) {
        if (hoveredCard) {
          const chooseHandCards = this.boardInteractionService.isChooseHandCardsSelectionActive();
          const legendAssembly = this.boardInteractionService.isLegendAssemblySelectionActive();
          const startingSetup =
            this.boardInteractionService.isChooseStartingPokemonsSelectionActive();
          canvas.style.cursor = hoveredCard.userData.isHandCard
            ? startingSetup || (!chooseHandCards && !legendAssembly)
              ? 'grab'
              : 'pointer'
            : 'pointer';
        } else {
          canvas.style.cursor = 'default';
        }
        this.currentHoveredCard = hoveredCard;
      }
    }

    this.markDirty();
  };

  private onMouseUp = (event: MouseEvent): void => {
    const canvas = this.canvasEl;
    const isHandPlayTargetSelection =
      this.boardInteractionService.isHandPlayTargetSelectionActive();
    const result = this.interactionService.onMouseUp(
      event,
      this.camera,
      this.scene,
      canvas,
      this.boardInteractionService.isSelectionActive(),
      isHandPlayTargetSelection,
    );

    if (result?.action === 'cancelHandPlayTarget') {
      this.boardInteractionService.cancelHandPlayTargetSelection();
      this.updateSelectionVisuals();
      canvas.style.cursor = 'default';
      this.markDirty();
      return;
    }

    if (
      result &&
      (result.action === 'playCard' ||
        result.action === 'pickAttachTarget' ||
        (result.action === 'click' && result.clickedCard?.userData.isHandCard))
    ) {
      if (isHandPlayTargetSelection) {
        this.boardInteractionService.clearHandPlayTargetSelectionSilently();
        this.updateSelectionVisuals();
      }
    }

    if (result) {
      if (result.action === 'click' && result.clickedCard) {
        this.onCardClicked(result.clickedCard);
      } else if (
        result.action === 'pickAttachTarget' &&
        result.handIndex !== undefined &&
        result.eligibleTargets
      ) {
        this.boardInteractionService.startHandPlayTargetSelection(
          result.eligibleTargets,
          (target) => {
            this.updateSelectionVisuals();
            if (target && result.handIndex !== undefined) {
              this.executeHandAttachPlay(result.handIndex, target);
            }
          },
        );
        this.updateSelectionVisuals();
      } else if (result.action === 'playCard' && result.handIndex !== undefined && result.zone) {
        if (this.boardInteractionService.isChooseStartingPokemonsSelectionActive()) {
          void this.executeSetupHandCardPlacement(result.handIndex, result.playCardFlight);
        } else {
          this.executeHandPlayCard(result);
        }
      } else if (result.action === 'setupSelectCard' && result.handIndex !== undefined) {
        void this.executeSetupHandCardPlacement(result.handIndex, result.playCardFlight);
      } else if (result.action === 'retreat' && result.benchIndex !== undefined) {
        void this.gameActions.retreatAction(this.gameState.gameId, result.benchIndex);
      }
    }

    canvas.style.cursor = 'default';
    this.markDirty();
  };

  private handleLegendAssemblyHandClick(handIndex: number): void {
    const card = this.bottomPlayerHand?.cards?.[handIndex];
    if (!card || !this.bottomPlayer) {
      return;
    }

    this.boardInteractionService.startLegendAssemblySelection(
      this.bottomPlayerHand.cards,
      handIndex,
      (playHandIndex) => {
        const target = resolveLegendAssemblyBenchTarget(this.bottomPlayer!);
        if (target) {
          this.executeHandPlayCard({ action: 'playCard', handIndex: playHandIndex, zone: target });
        }
      },
    );
    this.updateSelectionVisuals();
    this.markDirty();
  }

  private executeHandAttachPlay(handIndex: number, zone: CardTarget): void {
    const handCard = handIndex >= 0 ? this.bottomPlayerHand.cards[handIndex] : undefined;
    if (handCard?.superType === SuperType.ENERGY) {
      const ejected = this.handService.detachCardForBoardPlay(handIndex, this.worldContentRoot);
      if (ejected) {
        this.executeEnergyAttachFlight(handIndex, zone, {
          board3dCard: ejected,
          targetWorld: new Vector3(),
          endScale: 1,
          endRotationY: 0,
          dropZoneType: DropZoneType.BENCH,
          energyAttach: {
            attachTarget: zone,
            energyCard: handCard,
          },
        });
        return;
      }
    }
    const ejected = this.handService.detachCardForBoardPlay(handIndex, this.worldContentRoot);
    this.trackHandPlayFlightCard(ejected);
    void this.gameActions
      .playCardAction(this.gameState.gameId, this.serverHandIndex(handIndex), zone)
      .then(() => {
        this.clearHandPlayFlightCard(ejected);
        if (ejected) {
          const group = ejected.getGroup();
          gsap.killTweensOf(group.position);
          gsap.killTweensOf(group.rotation);
          gsap.killTweensOf(group.scale);
          group.removeFromParent();
          ejected.dispose();
        }
        this.interactionService.updateInteractiveObjects(this.scene);
        this.markDirty();
      })
      .catch(() => {
        void this.returnFailedPlayCardToHand(ejected, handIndex);
      });
    this.markDirty();
  }

  private pokemonListForAttachTarget(target: CardTarget): PokemonCardList | null {
    const player = target.player === PlayerType.BOTTOM_PLAYER ? this.bottomPlayer : this.topPlayer;
    if (!player) {
      return null;
    }
    if (target.slot === SlotType.ACTIVE) {
      return player.active;
    }
    if (target.slot === SlotType.BENCH) {
      return player.bench[target.index] ?? null;
    }
    return null;
  }

  private hostMeshIdForAttachTarget(target: CardTarget): string | null {
    const dropType = target.slot === SlotType.ACTIVE ? DropZoneType.ACTIVE : DropZoneType.BENCH;
    return board3dMeshIdForPlayTarget(target, dropType, this.bottomPlayer, this.topPlayer);
  }

  private executeEnergyAttachFlight(
    handIndex: number,
    playTarget: CardTarget,
    flight: PlayCardFlightPayload,
  ): void {
    const energyAttach = flight.energyAttach;
    if (!energyAttach) {
      return;
    }

    const hostMeshId = this.hostMeshIdForAttachTarget(playTarget);
    const hostBoardCard = hostMeshId ? this.stateSync.getCardById(hostMeshId) : undefined;
    const pokemonBeforeAttach = this.pokemonListForAttachTarget(playTarget);
    const energySlotIndex = pokemonBeforeAttach?.energies?.cards.length ?? 0;
    let flightDisposed = false;
    let playSucceeded: boolean | null = null;
    let attachAnimDone = false;
    this.trackHandPlayFlightCard(flight.board3dCard);

    if (hostMeshId) {
      this.stateSync.setSuppressedEnergyIconSlot(hostMeshId, energySlotIndex);
    }

    const finishFlight = (): void => {
      if (flightDisposed) {
        return;
      }
      flightDisposed = true;
      this.clearHandPlayFlightCard(flight.board3dCard);
      if (hostMeshId) {
        this.stateSync.clearSuppressedEnergyIconSlot(hostMeshId);
        const pokemonAfter = this.pokemonListForAttachTarget(playTarget);
        if (pokemonAfter?.energies) {
          void this.stateSync.refreshEnergyOverlayForCard(hostMeshId, pokemonAfter.energies);
        }
      }
      flight.board3dCard.dispose();
      this.interactionService.updateInteractiveObjects(this.scene);
      this.markDirty();
    };

    const abortFlight = (): void => {
      if (flightDisposed) {
        return;
      }
      flightDisposed = true;
      if (hostMeshId) {
        this.stateSync.clearSuppressedEnergyIconSlot(hostMeshId);
      }
      this.interactionService.updateInteractiveObjects(this.scene);
      void this.returnFailedPlayCardToHand(flight.board3dCard, handIndex, {
        scrubEnergyMorph: true,
      });
      this.markDirty();
    };

    const maybeComplete = (): void => {
      if (flightDisposed || playSucceeded === null) {
        return;
      }
      if (playSucceeded === false) {
        abortFlight();
        return;
      }
      if (!hostBoardCard || attachAnimDone) {
        finishFlight();
        this.syncGameState();
      }
    };

    void this.gameActions
      .playCardAction(this.gameState.gameId, this.serverHandIndex(handIndex), playTarget)
      .then(() => {
        playSucceeded = true;
        maybeComplete();
      })
      .catch(() => {
        playSucceeded = false;
        maybeComplete();
      });

    if (!hostBoardCard) {
      attachAnimDone = true;
      maybeComplete();
      return;
    }

    void (async () => {
      try {
        const energyList = pokemonBeforeAttach?.energies ?? new CardList();
        const iconTexture = await this.stateSync.loadEnergyIconTexture(
          energyAttach.energyCard,
          energyList,
        );
        if (flightDisposed) {
          return;
        }
        await this.animationService.playEnergyAttachToPokemon(
          flight.board3dCard,
          hostBoardCard,
          energySlotIndex,
          iconTexture,
        );
        if (flightDisposed) {
          return;
        }
        attachAnimDone = true;
        maybeComplete();
      } catch {
        playSucceeded = false;
        maybeComplete();
      }
    })();
  }

  private releaseSetupHandSyncIfIdle(): void {
    if (this.setupPlacementInFlight.size === 0) {
      this.setupHandSyncBlocked = false;
    }
  }

  private abandonSetupHandCardFlight(flight?: PlayCardFlightPayload): void {
    if (!flight?.board3dCard) {
      return;
    }
    const group = flight.board3dCard.getGroup();
    gsap.killTweensOf(group.position);
    gsap.killTweensOf(group.rotation);
    gsap.killTweensOf(group.scale);
    if (group.parent) {
      group.removeFromParent();
    }
    flight.board3dCard.dispose();
    this.forceHandResyncAfterFailedPlay();
  }

  private executeSetupHandCardPlacement(
    handIndex: number,
    flight?: PlayCardFlightPayload,
  ): void {
    let selectionCommitted = false;
    const fail = (): void => {
      if (selectionCommitted) {
        this.boardInteractionService.revokeChooseHandCardForSetup(handIndex);
        selectionCommitted = false;
        this.refreshSetupStartingPokemonDragState();
      }
      this.setupPlacementInFlight.delete(handIndex);
      this.releaseSetupHandSyncIfIdle();
      this.abandonSetupHandCardFlight(flight);
    };

    const prompt = this.boardInteractionService.getChooseCardsPrompt();
    if (!prompt || !this.bottomPlayer) {
      fail();
      return;
    }
    if (!this.boardInteractionService.isChooseStartingPokemonsSelectionActive()) {
      fail();
      return;
    }

    const handTarget: CardTarget = {
      player: PlayerType.BOTTOM_PLAYER,
      slot: SlotType.HAND,
      index: handIndex,
    };
    if (!this.boardInteractionService.isTargetEligible(handTarget)) {
      fail();
      return;
    }
    if (
      this.boardInteractionService.isTargetSelected(handTarget) ||
      this.setupPlacementInFlight.has(handIndex)
    ) {
      fail();
      return;
    }

    // Reserve in-flight BEFORE committing selection. selectedTargets$ syncs visuals
    // immediately; skipping this card prevents a static preview from spawning and
    // keeps the hand mesh available to lift for the flight animation.
    this.setupHandSyncBlocked = true;
    this.setupPlacementInFlight.add(handIndex);

    if (!this.boardInteractionService.addChooseHandCardForSetup(handIndex)) {
      fail();
      return;
    }
    selectionCommitted = true;
    this.refreshSetupStartingPokemonDragState();

    const selected = this.boardInteractionService.getChooseHandCardSelectionHandIndices();
    const pickOrder = selected.indexOf(handIndex);
    const slotTarget = getSetupPlaySlotForPickOrder(prompt, pickOrder);
    if (!slotTarget || pickOrder < 0) {
      fail();
      return;
    }

    // Live hand — sandbox may have added cards after the prompt was captured.
    const card = this.bottomPlayer.hand.cards[handIndex];
    if (!card) {
      fail();
      return;
    }

    const meshId = setupPreviewMeshId(this.bottomPlayer.id, slotTarget.slot, slotTarget.index);
    const position =
      slotTarget.slot === SlotType.ACTIVE
        ? ZONE_POSITIONS.bottomPlayer.active.clone()
        : getBenchPositions(this.bottomPlayer.bench.length, PlayerType.BOTTOM_PLAYER)[
            slotTarget.index
          ].clone();
    const endScale = slotTarget.slot === SlotType.ACTIVE ? 1.5 : 1.0;
    const endRotationY = 0;
    // Prefer drag landing when it matches the reserved slot type; otherwise use slot position
    // (rapid Active-phase clicks must not both fly to Active).
    const flightMatchesSlot =
      !!flight &&
      ((slotTarget.slot === SlotType.ACTIVE && flight.dropZoneType === DropZoneType.ACTIVE) ||
        (slotTarget.slot === SlotType.BENCH && flight.dropZoneType === DropZoneType.BENCH));
    const targetWorld = (flightMatchesSlot ? flight!.targetWorld : position).clone();
    targetWorld.y = Math.max(targetWorld.y, 0.08);
    const animEndScale = flightMatchesSlot ? (flight!.endScale ?? endScale) : endScale;
    const animEndRotationY = flightMatchesSlot
      ? (flight!.endRotationY ?? endRotationY)
      : endRotationY;

    const cardTarget: CardTarget = {
      player: slotTarget.player,
      slot: slotTarget.slot,
      index: slotTarget.index,
    };

    let board3dCard = flight?.board3dCard ?? null;
    if (!board3dCard) {
      board3dCard = this.handService.liftHandCardForSetupAnimation(
        handIndex,
        this.worldContentRoot,
      );
    }
    if (!board3dCard) {
      this.setupPlacementInFlight.delete(handIndex);
      this.releaseSetupHandSyncIfIdle();
      void this.syncSetupStartingPokemonPreview();
      this.updateHandSelectionVisuals(true);
      this.markDirty();
      return;
    }

    // Selection sync may have hidden this hand card before lift — restore for the flight.
    const group = board3dCard.getGroup();
    group.visible = true;
    board3dCard.setOutline(false);

    this.handService.repositionSetupHandVisuals();

    gsap.killTweensOf(group.position);
    gsap.killTweensOf(group.rotation);
    gsap.killTweensOf(group.scale);

    const sleevePath = (this.bottomPlayer?.deck as { sleeveImagePath?: string } | undefined)
      ?.sleeveImagePath;
    const sleeveUrl = sleevePath ? this.cardsAdapter.getSleeveUrl(sleevePath) : undefined;
    const texturesPromise = Promise.all([
      sleeveUrl ? this.assetLoader.loadSleeveTexture(sleeveUrl) : this.assetLoader.loadCardBack(),
      this.assetLoader.loadCardMaskTexture(),
    ]);

    void this.animationService
      .playHandCardDropOnBoard(group, targetWorld, {
        endScale: animEndScale,
        endRotationY: animEndRotationY,
        // Flip face-down while flying to the slot (click and drag both use this path).
        flipFaceDownDuringTravel: {
          onHideFace: () => {
            void texturesPromise.then(([cardBack, mask]) => {
              board3dCard!.updateTexture(cardBack, cardBack, mask);
              board3dCard!.setHolo(null);
              group.userData.isFaceDown = true;
            });
          },
        },
      })
      .then(async () => {
        const [cardBack, mask] = await texturesPromise;
        board3dCard!.updateTexture(cardBack, cardBack, mask);
        board3dCard!.setHolo(null);
        group.userData.isFaceDown = true;
        group.rotation.z = 0;

        this.setupPlacementInFlight.delete(handIndex);
        this.stateSync.adoptSetupPreviewCard(
          board3dCard!,
          meshId,
          handIndex,
          card,
          cardTarget,
          {
            position: targetWorld.clone(),
            rotationY: animEndRotationY,
            scale: animEndScale,
          },
        );
        this.releaseSetupHandSyncIfIdle();
        this.updateSelectionVisuals();
        this.stateSync.publishSceneModel(this.handService.getHandSlotSnapshots());
        this.interactionService.updateInteractiveObjects(this.scene);
        this.markDirty();
      });

    this.updateHandSelectionVisuals(true);
    this.markDirty();
  }

  private executeLegendAssemblyPlay(
    playHandIndex: number,
    playTarget: CardTarget,
    existingFlight?: PlayCardFlightPayload,
  ): void {
    const handCards = this.bottomPlayerHand.cards;
    const triggered = handCards[playHandIndex];
    if (!triggered || !cardCanAssembleLegendFromHand(triggered, handCards)) {
      void this.gameActions
        .playCardAction(this.gameState.gameId, this.serverHandIndex(playHandIndex), playTarget)
        .catch(() => this.forceHandResyncAfterFailedPlay());
      return;
    }

    const partnerIndex = findLegendAssemblyPartnerHandIndex(handCards, playHandIndex);
    if (partnerIndex === null) {
      void this.gameActions
        .playCardAction(this.gameState.gameId, this.serverHandIndex(playHandIndex), playTarget)
        .catch(() => this.forceHandResyncAfterFailedPlay());
      return;
    }

    const halfIndices = resolveLegendAssemblyHalfHandIndices(
      handCards,
      playHandIndex,
      partnerIndex,
    );
    if (!halfIndices) {
      void this.gameActions
        .playCardAction(this.gameState.gameId, this.serverHandIndex(playHandIndex), playTarget)
        .catch(() => this.forceHandResyncAfterFailedPlay());
      return;
    }

    const flownCard = existingFlight?.board3dCard ?? null;
    let topHalf: Board3dCard | null =
      flownCard && playHandIndex === halfIndices.topIndex ? flownCard : null;
    let bottomHalf: Board3dCard | null =
      flownCard && playHandIndex === halfIndices.bottomIndex ? flownCard : null;

    const detachAt = (index: number): Board3dCard | null =>
      this.handService.detachCardForBoardPlay(index, this.worldContentRoot);

    if (!topHalf && !bottomHalf) {
      for (const index of [halfIndices.topIndex, halfIndices.bottomIndex].sort((a, b) => b - a)) {
        const detached = detachAt(index);
        if (index === halfIndices.topIndex) {
          topHalf = detached;
        }
        if (index === halfIndices.bottomIndex) {
          bottomHalf = detached;
        }
      }
    } else {
      if (!topHalf) {
        topHalf = detachAt(halfIndices.topIndex);
      }
      if (!bottomHalf) {
        bottomHalf = detachAt(halfIndices.bottomIndex);
      }
    }

    if (!topHalf || !bottomHalf) {
      topHalf?.getGroup().removeFromParent();
      topHalf?.dispose();
      bottomHalf?.getGroup().removeFromParent();
      bottomHalf?.dispose();
      void this.gameActions
        .playCardAction(this.gameState.gameId, this.serverHandIndex(playHandIndex), playTarget)
        .catch(() => this.forceHandResyncAfterFailedPlay());
      this.forceHandResyncAfterFailedPlay();
      return;
    }

    topHalf.setOutline(false);
    bottomHalf.setOutline(false);

    const aspect = this.canvasEl.clientWidth / Math.max(this.canvasEl.clientHeight, 1);
    const stageCenter = getDrawFlightStageCenterWorld(aspect, this.isUpsideDown);
    const benchPositions = getBenchPositions(
      this.bottomPlayer.bench.length,
      PlayerType.BOTTOM_PLAYER,
      aspect,
    );
    const targetWorld = benchPositions[playTarget.index]?.clone() ?? new Vector3();
    targetWorld.y = Math.max(targetWorld.y, 0.08);
    const endRotationY = 0;

    const hiddenMeshId = board3dMeshIdForPlayTarget(
      playTarget,
      DropZoneType.BENCH,
      this.bottomPlayer,
      this.topPlayer,
    );
    if (hiddenMeshId) {
      this.beginHandPlayFlightHiddenMeshes([hiddenMeshId]);
    }

    const topGroup = topHalf.getGroup();
    const bottomGroup = bottomHalf.getGroup();
    let disposed = false;
    const disposeHalves = (): void => {
      if (disposed) {
        return;
      }
      disposed = true;
      if (hiddenMeshId) {
        this.endHandPlayFlightHiddenMeshes([hiddenMeshId]);
      }
      topHalf!.dispose();
      bottomHalf!.dispose();
      this.interactionService.updateInteractiveObjects(this.scene);
      this.syncGameState();
      this.markDirty();
    };

    void this.gameActions
      .playCardAction(this.gameState.gameId, this.serverHandIndex(playHandIndex), playTarget)
      .catch(() => {
        gsap.killTweensOf(topGroup.position);
        gsap.killTweensOf(bottomGroup.position);
        gsap.killTweensOf(topGroup.rotation);
        gsap.killTweensOf(bottomGroup.rotation);
        gsap.killTweensOf(topGroup.scale);
        gsap.killTweensOf(bottomGroup.scale);
        disposeHalves();
        this.forceHandResyncAfterFailedPlay();
      });

    void this.animationService
      .playLegendAssemblyAnimation(
        this.worldContentRoot,
        topGroup,
        bottomGroup,
        stageCenter,
        targetWorld,
        endRotationY,
      )
      .then(() => disposeHalves());
  }

  private executeHandPlayCard(result: DropResult): void {
    if (result.handIndex === undefined || !result.zone) {
      return;
    }

    const playedHandCard = this.droppedHandCard(result);
    const serverIndex = this.serverHandIndex(result.handIndex, playedHandCard);

    if (
      playedHandCard &&
      cardCanAssembleLegendFromHand(playedHandCard, this.bottomPlayerHand.cards) &&
      result.zone.slot === SlotType.BENCH
    ) {
      this.executeLegendAssemblyPlay(result.handIndex, result.zone, result.playCardFlight);
      return;
    }

    if (
      !this.gameState.replay &&
      playedHandCard?.superType === SuperType.TRAINER &&
      !cardIsFossilLikeTrainer(playedHandCard)
    ) {
      this.boardInteractionService.beginTrainerPlayEffectPromptDelay();
    }
    const stadiumHandPlay = cardIsStadium(playedHandCard);
    // Stadiums never use the Item/Supporter play-zone adopt path (CardsInfo can omit the getter).
    const trainerBoardHandPlay = !stadiumHandPlay && cardIsTrainerBoardHandPlay(playedHandCard);
    const playTarget: CardTarget = trainerBoardHandPlay
      ? {
          player: result.zone.player,
          slot: SlotType.BOARD,
          index: result.zone.index,
        }
      : result.zone;

    const flight = result.playCardFlight;
    if (flight) {
      if (flight.energyAttach) {
        this.executeEnergyAttachFlight(result.handIndex, playTarget, flight);
        return;
      }

      if (flight.holdForAttach) {
        this.trackHandPlayFlightCard(flight.board3dCard);
        void this.gameActions
          .playCardAction(this.gameState.gameId, serverIndex, playTarget)
          .then(() => {
            this.clearHandPlayFlightCard(flight.board3dCard);
            const g = flight.board3dCard.getGroup();
            gsap.killTweensOf(g.position);
            gsap.killTweensOf(g.rotation);
            gsap.killTweensOf(g.scale);
            g.removeFromParent();
            flight.board3dCard.dispose();
            this.interactionService.updateInteractiveObjects(this.scene);
            this.markDirty();
          })
          .catch(() => {
            void this.returnFailedPlayCardToHand(flight.board3dCard, result.handIndex!);
          });
        return;
      }

      const group = flight.board3dCard.getGroup();
      let flightDisposed = false;
      const resolvedTrainerType = resolveTrainerType(playedHandCard) ?? flight.trainerType;

      const supporterSlotMeshId = trainerBoardHandPlay
        ? board3dMeshIdForPlayTarget(
            playTarget,
            DropZoneType.SUPPORTER,
            this.bottomPlayer,
            this.topPlayer,
            resolvedTrainerType,
          )
        : null;

      const flightHiddenMeshIds: string[] = [];
      if (stadiumHandPlay) {
        flightHiddenMeshIds.push(...SHARED_STADIUM_MESH_IDS);
        const stadiumLanding = ZONE_POSITIONS.stadium.clone();
        stadiumLanding.y = Math.max(stadiumLanding.y, 0.08);
        flight.targetWorld.copy(stadiumLanding);
        flight.endScale = 1.0;
        flight.endRotationY = 0;
        flight.dropZoneType = DropZoneType.STADIUM;
      } else if (cardIsSupporter(playedHandCard)) {
        if (supporterSlotMeshId) {
          flightHiddenMeshIds.push(supporterSlotMeshId);
        }
      } else if (trainerBoardHandPlay) {
        if (supporterSlotMeshId) {
          flightHiddenMeshIds.push(supporterSlotMeshId);
        }
      } else {
        const singleHidden = board3dMeshIdForPlayTarget(
          playTarget,
          flight.dropZoneType,
          this.bottomPlayer,
          this.topPlayer,
          resolvedTrainerType,
        );
        if (singleHidden) {
          flightHiddenMeshIds.push(singleHidden);
        }
      }

      const hiddenForThisFlight = flightHiddenMeshIds;
      this.beginHandPlayFlightHiddenMeshes(hiddenForThisFlight);

      if (!stadiumHandPlay) {
        const trainerBoardLanding =
          supporterSlotMeshId && worldPositionForSupporterMeshId(supporterSlotMeshId);
        if (trainerBoardLanding && supporterSlotMeshId) {
          flight.targetWorld.copy(trainerBoardLanding);
          flight.endScale = 1.0;
          flight.endRotationY = supporterSlotMeshId.startsWith('topPlayer_') ? Math.PI : 0;
        }
      }

      const disposeFlight = (): void => {
        if (flightDisposed) {
          return;
        }
        flightDisposed = true;
        this.clearHandPlayFlightCard(flight.board3dCard);
        this.endHandPlayFlightHiddenMeshes(hiddenForThisFlight);
        flight.board3dCard.dispose();
        this.interactionService.updateInteractiveObjects(this.scene);
        this.syncGameState();
        this.markDirty();
      };

      // Items/Supporters stay on the play zone until the transition queue resolves them.
      // Stadiums dispose on land so sync owns the shared stadium mesh (never adopt to supporter).
      const trainerCardId =
        !stadiumHandPlay && trainerBoardHandPlay && supporterSlotMeshId
          ? playedHandCard?.id
          : undefined;
      let markLanded: () => void = () => {};
      if (trainerCardId != null) {
        const landed = new Promise<void>((resolve) => {
          markLanded = resolve;
        });
        this.localTrainerFlights.set(trainerCardId, {
          playerId: this.bottomPlayer.id,
          board3dCard: flight.board3dCard,
          landed,
          endHiding: () => {
            this.clearHandPlayFlightCard(flight.board3dCard);
            this.endHandPlayFlightHiddenMeshes(hiddenForThisFlight);
          },
          dispose: () => {
            if (flightDisposed) {
              return;
            }
            flightDisposed = true;
            const g = flight.board3dCard.getGroup();
            gsap.killTweensOf(g.position);
            gsap.killTweensOf(g.rotation);
            gsap.killTweensOf(g.scale);
            g.removeFromParent();
            flight.board3dCard.dispose();
            this.interactionService.updateInteractiveObjects(this.scene);
            this.markDirty();
          },
        });
      }

      const abortFlightToHand = (): void => {
        if (flightDisposed) {
          return;
        }
        flightDisposed = true;
        if (trainerCardId != null) {
          this.localTrainerFlights.delete(trainerCardId);
        }
        this.endHandPlayFlightHiddenMeshes(hiddenForThisFlight);
        this.interactionService.updateInteractiveObjects(this.scene);
        void this.returnFailedPlayCardToHand(flight.board3dCard, result.handIndex!);
        this.markDirty();
      };

      this.trackHandPlayFlightCard(flight.board3dCard);

      let playSucceeded: boolean | null = null;
      let dropAnimDone = false;
      const maybeComplete = (): void => {
        if (flightDisposed || playSucceeded === null) {
          return;
        }
        if (playSucceeded === false) {
          abortFlightToHand();
          return;
        }
        if (dropAnimDone && trainerCardId == null) {
          disposeFlight();
        }
      };

      void this.gameActions
        .playCardAction(this.gameState.gameId, serverIndex, playTarget)
        .then(() => {
          playSucceeded = true;
          maybeComplete();
        })
        .catch(() => {
          playSucceeded = false;
          maybeComplete();
        });

      void this.animationService
        .playHandCardDropOnBoard(group, flight.targetWorld, {
          endScale: flight.endScale,
          endRotationY: flight.endRotationY,
        })
        .then(() => {
          dropAnimDone = true;
          markLanded();
          maybeComplete();
        });
    } else {
      void this.gameActions
        .playCardAction(this.gameState.gameId, serverIndex, playTarget)
        .catch(() => this.forceHandResyncAfterFailedPlay());
    }
  }

  private onMouseLeave = (): void => {
    this.interactionService.cancelDrag();
    this.currentHoveredCard = null;
    this.markDirty();
  };

  /** Right-click (or Ctrl+click on macOS) opens the card info pane. */
  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    const canvas = this.canvasEl;
    const card = this.interactionService.onMouseMove(event, this.camera, this.scene, canvas);
    if (card) {
      this.showCardInfoPane(card);
    }
  };

  /**
   * Update selection visuals for all cards based on BoardInteractionService state
   */
  private updateSelectionVisuals(): void {
    const isSelectionMode = this.boardInteractionService.isSelectionActive();

    // Update board cards via stateSync
    this.stateSync.updateSelectionState(isSelectionMode, this.boardInteractionService);

    // Update hand cards
    this.updateHandSelectionVisuals(isSelectionMode);

    this.refreshSetupStartingPokemonDragState();
    void this.syncSetupStartingPokemonPreview();

    this.markDirty();
  }

  private async syncSetupStartingPokemonPreview(): Promise<void> {
    const gen = ++this.setupPreviewSyncGeneration;
    const startingSetup = this.boardInteractionService.isChooseStartingPokemonsSelectionActive();

    if (!startingSetup || !this.bottomPlayer) {
      this.stateSync.clearSetupStartingPokemonPreview();
      if (gen === this.setupPreviewSyncGeneration) {
        this.stateSync.publishSceneModel(this.handService.getHandSlotSnapshots());
        this.interactionService.updateInteractiveObjects(this.scene);
      }
      return;
    }

    const prompt = this.boardInteractionService.getChooseCardsPrompt();
    if (!prompt) {
      this.stateSync.clearSetupStartingPokemonPreview();
      return;
    }

    const handIndices = this.boardInteractionService.getChooseHandCardSelectionHandIndices();
    await this.stateSync.updateSetupStartingPokemonPreview(
      this.bottomPlayer,
      prompt,
      handIndices,
      this.setupPlacementInFlight,
    );

    if (gen !== this.setupPreviewSyncGeneration) {
      return;
    }

    this.stateSync.publishSceneModel(this.handService.getHandSlotSnapshots());
    this.interactionService.updateInteractiveObjects(this.scene);
    this.markDirty();
  }

  private refreshPutDamagePlacementOverlays(): void {
    this.stateSync.refreshPutDamagePlacementOverlays(this.boardInteractionService);
    this.markDirty();
  }

  /**
   * Update selection visuals for hand cards
   */
  private updateHandSelectionVisuals(isSelectionMode: boolean): void {
    const chooseHandCards = this.boardInteractionService.isChooseHandCardsSelectionActive();
    const startingSetup = this.boardInteractionService.isChooseStartingPokemonsSelectionActive();
    const selectedHandIndices = startingSetup
      ? new Set([
          ...this.boardInteractionService.getChooseHandCardSelectionHandIndices(),
          ...this.setupPlacementInFlight,
        ])
      : null;

    for (const [mapIndex, card3d] of this.handService.getHandCardEntries()) {
      const cardGroup = card3d.getGroup();
      const cardData = cardGroup.userData.cardData;
      if (!cardData) continue;

      const handIndex = (cardGroup.userData.handIndex as number | undefined) ?? mapIndex;
      const group = card3d.getGroup();

      if (startingSetup && selectedHandIndices?.has(handIndex)) {
        group.visible = false;
        card3d.setOutline(false);
        continue;
      }

      group.visible = true;

      // Create target for this hand card
      const target: CardTarget = {
        player: PlayerType.BOTTOM_PLAYER,
        slot: SlotType.HAND,
        index: handIndex,
      };

      if (isSelectionMode) {
        const isEligible = this.boardInteractionService.isTargetEligible(target);
        const isSelected = this.boardInteractionService.isTargetSelected(target);

        if (isSelected && !startingSetup) {
          card3d.setOutline(true, 0x4ade80); // Green for selected
        } else if (isEligible) {
          card3d.setOutline(true, 0xffffff); // White for selectable
        } else {
          card3d.setOutline(false);
        }
      } else if (!chooseHandCards) {
        const isPlayable = this.bottomPlayer?.playableCardIds?.includes(cardData.id);
        if (isPlayable) {
          card3d.setOutline(true, 0x4ade80);
        } else {
          card3d.setOutline(false);
        }
      } else {
        card3d.setOutline(false);
      }
    }
  }

  /**
   * Open the card info pane (used for right-click and in-game inspection).
   */
  private showCardInfoPane(cardObject: Object3D): void {
    const cardData = cardObject.userData.cardData as Card;
    if (!cardData) {
      return;
    }

    const cardList = cardObject.userData.cardList;
    const cardTarget = cardObject.userData.cardTarget as CardTarget;
    const isHandCard = cardObject.userData.isHandCard;
    const isSetupPreview = cardObject.userData.isSetupPreview === true;

    if (isHandCard || isSetupPreview) {
      void this.openCardInfo(cardObject, {
        card: cardData,
        cardList: cardList ?? this.bottomPlayerHand,
        players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
      });
      return;
    }

    if (cardTarget?.slot === SlotType.ACTIVE || cardTarget?.slot === SlotType.BENCH) {
      void this.openCardInfo(cardObject, {
        card: cardData,
        cardList,
        players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
      });
      return;
    }

    this.onCardClicked(cardObject);
  }

  /**
   * Handle card click to show info pane with clickable abilities/attacks
   */
  private onCardClicked(cardObject: Object3D): void {
    const cardData = cardObject.userData.cardData as Card;
    const cardList = cardObject.userData.cardList;
    const cardTarget = cardObject.userData.cardTarget as CardTarget;
    const isHandCard = cardObject.userData.isHandCard;
    const isDiscard = cardObject.userData.isDiscard;
    const isLostZone = cardObject.userData.isLostZone;
    const isDeck = cardObject.userData.isDeck;
    const isPrize = cardObject.userData.isPrize;
    const isEnergyIcon = cardObject.userData.isEnergyIcon;
    const isToolCard = cardObject.userData.isToolCard;

    // Handle energy icon click (show energy card info)
    if (isEnergyIcon && cardData && cardList) {
      if (this.boardInteractionService.isSelectionActive()) {
        const hostTarget = this.resolveBoardPokemonCardTargetFromObject(cardObject);
        if (hostTarget !== null && this.boardInteractionService.isTargetEligible(hostTarget)) {
          this.boardInteractionService.toggleTarget(hostTarget);
          return;
        }
      }
      this.cardsAdapter.showCardInfo({
        card: cardData,
        cardList,
        players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
      });
      return;
    }

    // Handle legend half click (show that half's card info; host target for prompts)
    if (cardObject.userData.isLegendHalf && cardData && cardList) {
      if (this.boardInteractionService.isSelectionActive()) {
        const hostTarget =
          (cardTarget as CardTarget | undefined) ??
          this.resolveBoardPokemonCardTargetFromObject(cardObject);
        if (hostTarget !== null && this.boardInteractionService.isTargetEligible(hostTarget)) {
          this.boardInteractionService.toggleTarget(hostTarget);
          return;
        }
      }
    }

    // Handle tool card click (show tool card info)
    if (isToolCard && cardData && cardList) {
      if (this.boardInteractionService.isSelectionActive()) {
        const hostTarget = this.resolveBoardPokemonCardTargetFromObject(cardObject);
        if (hostTarget !== null && this.boardInteractionService.isTargetEligible(hostTarget)) {
          this.boardInteractionService.toggleTarget(hostTarget);
          return;
        }
      }
      this.cardsAdapter.showCardInfo({
        card: cardData,
        cardList,
        players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
      });
      return;
    }

    // Handle Lost Zone click
    if (isLostZone && cardList) {
      // Determine which player's Lost Zone this is
      const isBottomLostZone = this.bottomPlayer && this.bottomPlayer.lostzone === cardList;
      const isTopLostZone = this.topPlayer && this.topPlayer.lostzone === cardList;
      const player = isBottomLostZone
        ? PlayerType.BOTTOM_PLAYER
        : isTopLostZone
          ? PlayerType.TOP_PLAYER
          : PlayerType.BOTTOM_PLAYER;
      const isOwner =
        (isBottomLostZone && this.bottomPlayer && this.bottomPlayer.id === this.clientId) ||
        (isTopLostZone && this.topPlayer && this.topPlayer.id === this.clientId);
      const isDeleted = this.gameState.deleted;

      if (isDeleted || !isOwner) {
        // Show card list without ability options
        this.cardsAdapter.showCardInfoList({
          card: cardData,
          cardList: cardList,
          players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
        });
        return;
      }

      const slot = SlotType.LOSTZONE;
      const options = { enableAbility: { useFromDiscard: false }, enableAttack: false };

      this.cardsAdapter
        .showCardInfoList({
          card: cardData,
          cardList: cardList,
          options,
          players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
        })
        .then((result) => {
          if (!result) {
            return;
          }
          const gameId = this.gameState.gameId;
          const index = cardList.cards.indexOf(result.card);
          const target: CardTarget = { player, slot, index };
          // Note: Lost Zone cards typically don't have abilities that can be used from Lost Zone
          // but we handle the result in case future cards need this functionality
        });
      return;
    }

    // Handle discard pile click
    if (isDiscard && cardList) {
      // Determine which player's discard this is by checking cardList reference
      const isBottomDiscard = this.bottomPlayer && this.bottomPlayer.discard === cardList;
      const isTopDiscard = this.topPlayer && this.topPlayer.discard === cardList;
      const player = isBottomDiscard
        ? PlayerType.BOTTOM_PLAYER
        : isTopDiscard
          ? PlayerType.TOP_PLAYER
          : PlayerType.BOTTOM_PLAYER;
      const isOwner =
        (isBottomDiscard && this.bottomPlayer && this.bottomPlayer.id === this.clientId) ||
        (isTopDiscard && this.topPlayer && this.topPlayer.id === this.clientId);
      const isDeleted = this.gameState.deleted;

      if (!isOwner || isDeleted) {
        // Show card list without ability options
        this.cardsAdapter.showCardInfoList({
          card: cardData,
          cardList: cardList,
          players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
        });
        return;
      }

      const slot = SlotType.DISCARD;
      const options = { enableAbility: { useFromDiscard: true }, enableAttack: false };

      this.cardsAdapter
        .showCardInfoList({
          card: cardData,
          cardList: cardList,
          options,
          players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
        })
        .then((result) => {
          if (!result) {
            return;
          }
          const gameId = this.gameState.gameId;
          const index = cardList.cards.indexOf(result.card);
          const target: CardTarget = { player, slot, index };

          // Use ability from the card
          if (result.ability) {
            if (result.card.superType === SuperType.TRAINER) {
              this.gameActions.trainerAbility(gameId, result.ability, target);
            } else if (result.card.superType === SuperType.ENERGY) {
              this.gameActions.energyAbility(gameId, result.ability, target);
            } else {
              this.gameActions.ability(gameId, result.ability, target);
            }
          }
        });
      return;
    }

    // Handle deck click
    if (isDeck && cardList) {
      // Use the full deck CardList from userData (set by updateDeckStack)
      // Determine which player's deck this is by checking cardList reference
      const isBottomDeck = this.bottomPlayer && this.bottomPlayer.deck === cardList;
      const isTopDeck = this.topPlayer && this.topPlayer.deck === cardList;

      if (cardList) {
        const sandboxMode = this.gameState.state.gameSettings?.sandboxMode === true;
        const facedown = !sandboxMode;
        const allowReveal = !sandboxMode && !!this.gameState.replay;
        this.cardsAdapter.showCardInfoList({
          card: cardData,
          cardList: cardList, // Use full deck CardList from userData
          allowReveal,
          facedown,
          players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
        });
      }
      return;
    }

    // Handle prize click
    if (isPrize && cardList) {
      const owner =
        (this.bottomPlayer && this.bottomPlayer.id === this.clientId) ||
        (this.topPlayer && this.topPlayer.id === this.clientId);
      if (cardList.cards.length === 0) {
        return;
      }
      const card = cardList.cards[0];
      const facedown = this.canRevealPrizesToViewer()
        ? false
        : cardList.isSecret || (!cardList.isPublic && !owner);
      const allowReveal = facedown && (!!this.gameState.replay || this.canRevealPrizesToViewer());
      void this.openCardInfo(cardObject, {
        card,
        allowReveal,
        facedown,
        players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
      });
      return;
    }

    // Handle Stadium click
    const isStadium =
      cardObject.userData.isStadium === true || isSharedStadiumMeshId(cardObject.userData.cardId);
    if (isStadium && cardList) {
      const isBottomOwner = this.bottomPlayer && this.bottomPlayer.id === this.clientId;
      const isDeleted = this.gameState.deleted;

      if (!isBottomOwner || isDeleted) {
        // Show normal card info without trainer options
        void this.openCardInfo(cardObject, {
          card: cardData,
          cardList: cardList,
          players: [this.topPlayer, this.bottomPlayer].filter((p) => p),
        });
        return;
      }

      // Owner can activate stadium effect
      const options = { enableTrainer: true };
      void this.openCardInfo(cardObject, {
        card: cardData,
        cardList: cardList,
        options,
        players: [this.topPlayer, this.bottomPlayer].filter(p => p)
      }).then(result => {
        if (!result) {
          return;
        }

          // Use stadium card effect
          if (result.trainer) {
            this.gameActions.stadium(this.gameState.gameId);
          }
        });
      return;
    }

    if (!cardData) return;

    // Setup preview cards are locked once placed — no return to hand.
    if (cardObject.userData.isSetupPreview === true) {
      return;
    }

    if (
      isHandCard &&
      !this.boardInteractionService.isSelectionActive() &&
      this.bottomPlayer?.id === this.clientId &&
      !this.gameState.deleted
    ) {
      const handIndex = (cardObject.userData.handIndex as number | undefined) ?? 0;
      const handCard = this.bottomPlayerHand?.cards?.[handIndex];
      if (cardCanAssembleLegendFromHand(handCard, this.bottomPlayerHand?.cards ?? [])) {
        this.handleLegendAssemblyHandClick(handIndex);
        return;
      }
    }

    // Check if we're in selection mode (for ChoosePokemonPrompt etc.)
    if (this.boardInteractionService.isSelectionActive()) {
      if (this.boardInteractionService.isChooseStartingPokemonsSelectionActive() && isHandCard) {
        const handIndex = (cardObject.userData.handIndex as number | undefined) ?? 0;
        const target: CardTarget = {
          player: PlayerType.BOTTOM_PLAYER,
          slot: SlotType.HAND,
          index: handIndex,
        };
        if (
          !this.boardInteractionService.isTargetSelected(target) &&
          this.boardInteractionService.isTargetEligible(target)
        ) {
          void this.executeSetupHandCardPlacement(handIndex);
        }
        return;
      }

      // Build target for selection
      const target: CardTarget = cardTarget || {
        player: PlayerType.BOTTOM_PLAYER,
        slot: isHandCard ? SlotType.HAND : SlotType.ACTIVE,
        index: isHandCard ? (cardObject.userData.handIndex ?? 0) : 0,
      };

      // Toggle selection if target is eligible
      if (this.boardInteractionService.isTargetEligible(target)) {
        this.boardInteractionService.toggleTarget(target);
        if (isHandCard) {
          this.updateSelectionVisuals();
        }
      }
      return; // Don't show info pane in selection mode
    }

    // Normal click behavior - show info pane
    // Determine options based on card location
    let options: CardInfoPaneOptions = {};
    let canRetreat = false;

    if (isHandCard) {
      // Hand cards: enable useFromHand abilities only when still playable (ability lock clears this).
      const handPlayable =
        !!cardData?.id && !!this.bottomPlayer?.playableCardIds?.includes(cardData.id);
      options = {
        enableAbility: handPlayable ? { useFromHand: true } : undefined,
        enableAttack: false,
      };
    } else if (cardTarget) {
      if (cardTarget.slot === SlotType.ACTIVE) {
        // Active Pokemon: enable abilities (useWhenInPlay), attacks, and retreat (if not already retreated this turn)
        canRetreat = !!(
          this.bottomPlayer &&
          this.gameState?.state &&
          this.bottomPlayer.retreatedTurn !== this.gameState.state.turn
        );
        options = {
          enableAbility: { useWhenInPlay: true },
          enableAttack: true,
          enableRetreat: canRetreat,
        };
      } else if (cardTarget.slot === SlotType.BENCH) {
        // Bench Pokemon: enable abilities (useWhenInPlay), no attacks
        options = { enableAbility: { useWhenInPlay: true }, enableAttack: false };
      }
    }

    // Get players for targeting
    const players = [this.topPlayer, this.bottomPlayer].filter((p) => p);

    this.openCardInfo(cardObject, {
      card: cardData,
      cardList: cardList,
      options,
      players
    }).then(result => {
      if (!result) return;
      const gameId = this.gameState.gameId;

        // For hand cards, use HAND slot with the card's hand index
        const target = cardTarget || {
          player: PlayerType.BOTTOM_PLAYER,
          slot: isHandCard ? SlotType.HAND : SlotType.ACTIVE,
          index: isHandCard ? (cardObject.userData.handIndex ?? 0) : 0,
        };

        if (result.ability) {
          if (cardData.superType === SuperType.TRAINER) {
            this.gameActions.trainerAbility(gameId, result.ability, target);
          } else {
            this.gameActions.ability(gameId, result.ability, target);
          }
        } else if (result.attack) {
          this.gameActions.attack(gameId, result.attack);
        } else if (result.retreat) {
          if (!canRetreat) return;
          this.gameActions.retreatStart(gameId);
        }
      });
  }
}
