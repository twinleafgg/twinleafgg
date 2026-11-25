import gsap from 'gsap';
import {
  CanvasTexture,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  Vector3,
} from 'three';
import { BOARD3D_CARD_HEIGHT, BOARD3D_CARD_WIDTH } from './board3dCardShared';

export const ANNOUNCE_BAR_ANGLE_DEG = 4;
export const ANNOUNCE_CARD_FLY_IN_SEC = 0.52;
export const ANNOUNCE_BAR_START_AFTER_CARD_FRAC = 0.38;

const TWINLEAF_GREEN = '#548c5c';
/** Camera-forward distance for the bar plane. */
const BAR_DEPTH = 16;
/** Unscaled local bar width — {@link Board3dAnnounceBar.syncToCamera} scales to the frustum. */
const BAR_WIDTH = 30;
const BODY_HEIGHT = 1.55;
const BOTTOM_RULE_H = 0.16;
const TOP_RULE_H = 0.045;
const STACK_H = BOTTOM_RULE_H + BODY_HEIGHT + TOP_RULE_H;
/** Card sits slightly toward camera of the bar plane. */
const CARD_FORWARD = 0.55;

const OPEN_BOTTOM = 0.3;
const OPEN_BODY = 0.22;
const OPEN_TOP = 0.14;
const OPEN_CONTENT = 0.34;

function frustumSizeAt(
  camera: PerspectiveCamera,
  distance: number,
): { width: number; height: number } {
  const vFovRad = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(vFovRad / 2) * distance;
  return { width: height * camera.aspect, height };
}

const energyImageCache = new Map<string, HTMLImageElement>();

function loadEnergyIcon(slug: string): Promise<HTMLImageElement> {
  const cached = energyImageCache.get(slug);
  if (cached?.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      energyImageCache.set(slug, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load energy icon ${slug}`));
    img.src = `/assets/energy-icons/${slug}.webp`;
  });
}

export type AnnounceBarPlayParams = {
  kind: 'attack' | 'ability';
  name: string;
  energySlugs?: string[];
  holdSec?: number;
  closeSpeed?: number;
};

/**
 * In-scene PTCGO-style announce bar (camera-facing). Same WebGL scene as board
 * cards so depth puts the flying Active card in front of the bar.
 */
export class Board3dAnnounceBar {
  readonly group = new Group();

  private readonly bottomRule: Mesh;
  private readonly body: Mesh;
  private readonly topRule: Mesh;
  private readonly textMesh: Mesh;
  private readonly textMaterial: MeshBasicMaterial;
  private readonly topRuleMaterial: MeshBasicMaterial;
  private readonly textCanvas: HTMLCanvasElement;
  private readonly textCtx: CanvasRenderingContext2D;
  private readonly textTexture: CanvasTexture;

  private attachedScene: Scene | null = null;
  private activeTimeline: gsap.core.Timeline | null = null;
  private playing = false;
  /** Uniform group scale from last {@link syncToCamera}. */
  private barScale = 1;

  private readonly scratchDir = new Vector3();
  private readonly scratchRight = new Vector3();
  private readonly scratchUp = new Vector3();
  private readonly scratchPos = new Vector3();
  private readonly basisX = new Vector3();
  private readonly basisY = new Vector3();
  private readonly basisZ = new Vector3();
  private readonly basisMatrix = new Matrix4();
  private readonly localRot = new Quaternion();

  constructor() {
    this.group.visible = false;
    this.group.name = 'Board3dAnnounceBar';
    this.group.renderOrder = 40;

    const greenMat = new MeshBasicMaterial({
      color: TWINLEAF_GREEN,
      depthTest: true,
      depthWrite: true,
    });
    this.topRuleMaterial = greenMat.clone();
    this.topRuleMaterial.transparent = true;
    this.topRuleMaterial.opacity = 0;

    const blackMat = new MeshBasicMaterial({
      color: 0x050505,
      depthTest: true,
      depthWrite: true,
    });

    // Body origin at bottom edge so scale.y expands upward.
    const bodyGeo = new PlaneGeometry(BAR_WIDTH, BODY_HEIGHT);
    bodyGeo.translate(0, BODY_HEIGHT / 2, 0);
    this.body = new Mesh(bodyGeo, blackMat);

    this.bottomRule = new Mesh(new PlaneGeometry(BAR_WIDTH, BOTTOM_RULE_H), greenMat);
    this.topRule = new Mesh(new PlaneGeometry(BAR_WIDTH, TOP_RULE_H), this.topRuleMaterial);

    // Stack: bottom rule, body growing up from it, top rule above body.
    this.bottomRule.position.set(0, 0, 0);
    this.body.position.set(0, BOTTOM_RULE_H / 2, 0);
    this.topRule.position.set(0, BOTTOM_RULE_H / 2 + BODY_HEIGHT + TOP_RULE_H / 2, 0.001);

    this.textCanvas = document.createElement('canvas');
    this.textCanvas.width = 2048;
    this.textCanvas.height = 256;
    const ctx = this.textCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Board3dAnnounceBar: 2d context unavailable');
    }
    this.textCtx = ctx;
    this.textTexture = new CanvasTexture(this.textCanvas);
    this.textTexture.needsUpdate = true;
    this.textMaterial = new MeshBasicMaterial({
      map: this.textTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      opacity: 0,
    });
    // Left ~58% of the bar — card bay owns the right side.
    this.textMesh = new Mesh(
      new PlaneGeometry(BAR_WIDTH * 0.58, BODY_HEIGHT * 0.82),
      this.textMaterial,
    );
    this.textMesh.position.set(
      -BAR_WIDTH * 0.18,
      BOTTOM_RULE_H / 2 + BODY_HEIGHT / 2,
      0.02,
    );

    // Center the whole stack vertically around local Y=0 for camera placement.
    const stackH = BOTTOM_RULE_H + BODY_HEIGHT + TOP_RULE_H;
    const yShift = -stackH / 2 + BOTTOM_RULE_H / 2;
    this.bottomRule.position.y += yShift;
    this.body.position.y += yShift;
    this.topRule.position.y += yShift;
    this.textMesh.position.y += yShift;

    this.body.renderOrder = 40;
    this.bottomRule.renderOrder = 40;
    this.topRule.renderOrder = 41;
    this.textMesh.renderOrder = 42;

    this.group.add(this.body, this.bottomRule, this.topRule, this.textMesh);
    this.resetPoseScales();
  }

  isPlaying(): boolean {
    return this.playing;
  }

  attach(scene: Scene): void {
    if (this.attachedScene === scene) {
      return;
    }
    this.detach();
    scene.add(this.group);
    this.attachedScene = scene;
  }

  detach(): void {
    this.killTimeline();
    this.group.removeFromParent();
    this.attachedScene = null;
    this.group.visible = false;
    this.playing = false;
  }

  dispose(): void {
    this.detach();
    this.bottomRule.geometry.dispose();
    this.body.geometry.dispose();
    this.topRule.geometry.dispose();
    this.textMesh.geometry.dispose();
    (this.bottomRule.material as MeshBasicMaterial).dispose();
    (this.body.material as MeshBasicMaterial).dispose();
    this.topRuleMaterial.dispose();
    this.textMaterial.dispose();
    this.textTexture.dispose();
  }

  /**
   * World pose for the announce card — viewport-fitted scale + on-screen bay.
   * Board card groups face along +Y with card-top along −Z (same as inspect).
   */
  getCardAnchorPose(
    camera: PerspectiveCamera,
    outPos: Vector3,
    outQuat: Quaternion,
  ): { scale: number } {
    camera.updateMatrixWorld(true);
    this.scratchRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    this.scratchUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

    // Provisional depth for scale (card sits CARD_FORWARD in front of bar).
    const cardDist = Math.max(0.5, BAR_DEPTH - CARD_FORWARD * this.barScale);
    const { width: fW, height: fH } = frustumSizeAt(camera, cardDist);

    // Fit card to the view: readable but always fully on-screen.
    const narrow = camera.aspect < 0.85;
    const preferH = narrow ? 0.28 : 0.34;
    const preferW = narrow ? 0.44 : 0.28;
    const scale = Math.min(
      (fH * preferH) / BOARD3D_CARD_HEIGHT,
      (fW * preferW) / BOARD3D_CARD_WIDTH,
    );

    // Bay: right of center, clamped so the full card (+ margin) stays in frame.
    const halfCardWLocal = (BOARD3D_CARD_WIDTH * scale * 0.5) / Math.max(this.barScale, 1e-6);
    const edgeMarginLocal = (fW * 0.045) / Math.max(this.barScale, 1e-6);
    const maxX = BAR_WIDTH / 2 - halfCardWLocal - edgeMarginLocal;
    const preferredX = BAR_WIDTH * (narrow ? 0.2 : 0.16);
    const cardLocalX = Math.max(-BAR_WIDTH * 0.05, Math.min(preferredX, maxX));

    this.group.updateWorldMatrix(true, false);
    outPos.set(cardLocalX, 0, CARD_FORWARD);
    this.group.localToWorld(outPos);

    // Camera-facing upright: +Y toward camera, −Z = screen up.
    this.basisY.copy(camera.position).sub(outPos).normalize();
    this.basisZ.copy(this.scratchUp).negate();
    this.basisX.crossVectors(this.basisY, this.basisZ).normalize();
    if (this.basisX.lengthSq() < 1e-6) {
      this.basisX.copy(this.scratchRight);
    }
    this.basisZ.crossVectors(this.basisX, this.basisY).normalize();
    this.basisMatrix.makeBasis(this.basisX, this.basisY, this.basisZ);
    outQuat.setFromRotationMatrix(this.basisMatrix);

    // Match Twinleaf bar roll so the card sits in the angled bay.
    const rollRad = (-ANNOUNCE_BAR_ANGLE_DEG * Math.PI) / 180;
    this.localRot.setFromAxisAngle(new Vector3(0, 1, 0), rollRad);
    outQuat.multiply(this.localRot);

    return { scale };
  }

  syncToCamera(camera: PerspectiveCamera): void {
    camera.updateMatrixWorld(true);
    camera.getWorldDirection(this.scratchDir);
    this.scratchRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    this.scratchUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

    const { width: frustumW, height: frustumH } = frustumSizeAt(camera, BAR_DEPTH);

    // Nearly full-bleed width; cap height so ultrawide doesn't make a huge strip.
    const scaleFromWidth = (frustumW * 0.94) / BAR_WIDTH;
    const scaleFromHeight = (frustumH * 0.12) / STACK_H;
    this.barScale = Math.min(scaleFromWidth, scaleFromHeight);
    this.group.scale.setScalar(this.barScale);

    // Slightly above center so the card clears bottom lab chrome on mobile.
    const upBias = camera.aspect < 0.9 ? frustumH * 0.05 : frustumH * 0.015;

    this.scratchPos
      .copy(camera.position)
      .addScaledVector(this.scratchDir, BAR_DEPTH)
      .addScaledVector(this.scratchUp, upBias);

    this.group.position.copy(this.scratchPos);

    // Local +Z toward camera.
    this.basisZ.copy(camera.position).sub(this.scratchPos).normalize();
    this.basisX.copy(this.scratchRight);
    this.basisY.crossVectors(this.basisZ, this.basisX).normalize();
    this.basisX.crossVectors(this.basisY, this.basisZ).normalize();
    this.basisMatrix.makeBasis(this.basisX, this.basisY, this.basisZ);
    this.group.quaternion.setFromRotationMatrix(this.basisMatrix);

    const rollRad = (-ANNOUNCE_BAR_ANGLE_DEG * Math.PI) / 180;
    this.localRot.setFromAxisAngle(new Vector3(0, 0, 1), rollRad);
    this.group.quaternion.multiply(this.localRot);
  }

  /**
   * Open → hold → close → (optional onAfterClose).
   * Card stays in the bay while the bar collapses, then the caller sends it home.
   */
  async play(
    camera: PerspectiveCamera,
    params: AnnounceBarPlayParams,
    hooks?: {
      onDirty?: () => void;
      /** After the bar is gone — e.g. lower the card back to its slot. */
      onAfterClose?: () => void | Promise<void>;
    },
  ): Promise<void> {
    this.killTimeline();
    this.playing = true;
    this.syncToCamera(camera);
    await this.paintText(params.kind, params.name, params.energySlugs ?? []);
    this.resetPoseScales();
    this.group.visible = true;
    hooks?.onDirty?.();

    const holdSec = params.holdSec ?? 1.1;
    const closeSpeed = Math.max(1.2, params.closeSpeed ?? 2.2);

    try {
      await this.runOpenHold(holdSec, hooks?.onDirty);
      await this.runClose(closeSpeed, hooks?.onDirty);
      this.group.visible = false;
      hooks?.onDirty?.();
      await hooks?.onAfterClose?.();
    } finally {
      this.group.visible = false;
      this.playing = false;
      hooks?.onDirty?.();
    }
  }

  private runOpenHold(holdSec: number, onDirty?: () => void): Promise<void> {
    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onUpdate: () => onDirty?.(),
        onComplete: () => {
          this.activeTimeline = null;
          resolve();
        },
      });
      this.activeTimeline = tl;

      tl.to(this.bottomRule.scale, { x: 1, duration: OPEN_BOTTOM, ease: 'power3.out' }, 0);
      tl.to(this.body.scale, { y: 1, duration: OPEN_BODY, ease: 'power2.out' }, OPEN_BOTTOM * 0.8);

      const topAt = OPEN_BOTTOM * 0.8 + OPEN_BODY * 0.65;
      tl.to(this.topRule.scale, { x: 1, duration: OPEN_TOP, ease: 'power2.out' }, topAt);
      tl.to(this.topRuleMaterial, { opacity: 1, duration: OPEN_TOP }, topAt);

      const midDone = OPEN_BOTTOM * 0.8 + OPEN_BODY;
      const contentAt = Math.max(midDone, topAt + OPEN_TOP * 0.2);
      tl.to(this.textMaterial, { opacity: 1, duration: OPEN_CONTENT, ease: 'power2.out' }, contentAt);

      const openEnd = contentAt + OPEN_CONTENT + 0.35;
      tl.to({}, { duration: holdSec }, openEnd);
    });
  }

  private runClose(closeSpeed: number, onDirty?: () => void): Promise<void> {
    const cBottom = OPEN_BOTTOM / closeSpeed;
    const cBody = OPEN_BODY / closeSpeed;
    const cTop = OPEN_TOP / closeSpeed;
    const cContent = OPEN_CONTENT / closeSpeed;

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onUpdate: () => onDirty?.(),
        onComplete: () => {
          this.activeTimeline = null;
          resolve();
        },
      });
      this.activeTimeline = tl;
      tl.to(this.textMaterial, { opacity: 0, duration: cContent, ease: 'power2.inOut' }, 0);
      const collapseAt = cContent * 0.45;
      tl.to(this.topRule.scale, { x: 0.001, duration: cTop, ease: 'power2.in' }, collapseAt);
      tl.to(this.topRuleMaterial, { opacity: 0, duration: cTop, ease: 'power2.in' }, collapseAt);
      tl.to(
        this.body.scale,
        { y: 0.001, duration: cBody, ease: 'power2.in' },
        collapseAt + cTop * 0.35,
      );
      tl.to(
        this.bottomRule.scale,
        { x: 0.001, duration: cBottom, ease: 'power2.in' },
        collapseAt + cTop * 0.35 + cBody * 0.5,
      );
    });
  }

  private resetPoseScales(): void {
    this.bottomRule.scale.set(0.001, 1, 1);
    this.body.scale.set(1, 0.001, 1);
    this.topRule.scale.set(0.001, 1, 1);
    this.topRuleMaterial.opacity = 0;
    this.textMaterial.opacity = 0;
  }

  private killTimeline(): void {
    this.activeTimeline?.kill();
    this.activeTimeline = null;
  }

  private async paintText(
    kind: 'attack' | 'ability',
    name: string,
    energySlugs: string[],
  ): Promise<void> {
    const ctx = this.textCtx;
    const w = this.textCanvas.width;
    const h = this.textCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const label = kind === 'attack' ? 'ATTACK' : 'ABILITY';
    const padL = w * 0.06;
    const maxNameW = w * 0.82;

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 42px Urbanist, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, padL, h * 0.32);

    ctx.fillStyle = '#ffffff';
    let nameSize = 110;
    ctx.font = `800 ${nameSize}px Urbanist, system-ui, sans-serif`;
    while (nameSize > 56 && ctx.measureText(name).width > maxNameW) {
      nameSize -= 4;
      ctx.font = `800 ${nameSize}px Urbanist, system-ui, sans-serif`;
    }
    ctx.fillText(name, padL, h * 0.62);

    if (energySlugs.length) {
      const icons = await Promise.all(
        energySlugs.map((s) => loadEnergyIcon(s).catch(() => null)),
      );
      const iconSize = Math.min(72, nameSize * 0.7);
      let x = padL + ctx.measureText(name).width + 24;
      const y = h * 0.62 - iconSize / 2;
      for (const img of icons) {
        if (!img) continue;
        if (x + iconSize > w - padL) break;
        ctx.drawImage(img, x, y, iconSize, iconSize);
        x += iconSize + 10;
      }
    }

    this.textTexture.needsUpdate = true;
  }
}
