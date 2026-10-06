import {
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  CanvasTexture,
  Group,
  DoubleSide,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from 'three';
import gsap from 'gsap';
import { BOARD_DAMAGE_COUNTER_SIZE, paintBoardDamageCounter } from './board-damage-counter-paint';
import {
  DAMAGE_COUNTER_REST_X,
  DAMAGE_COUNTER_REST_Y,
  DAMAGE_COUNTER_REST_Z,
} from './board-3d-overlay-layout';
import { isUnderInspectingCard } from './board3dInspectingCard';

const COUNTER_SIZE = 0.96; // Twice as large: 0.48 * 2 = 0.96 units

/** Brief beat after damage changes before the counter moves in (reads clearer than instant swap). */
const DAMAGE_COUNTER_APPEAR_DELAY_SEC = 0.08;
/**
 * Pre-rest pose in overlay-anchor space. Primary “comes down onto the card” read is
 * {@link DAMAGE_COUNTER_PLACE_START_SCALE} → 1 (counter lowers as it shrinks into place).
 */
const DAMAGE_COUNTER_PLACE_OFFSET_X = 0.04;
const DAMAGE_COUNTER_PLACE_OFFSET_Y = -0.06;
const DAMAGE_COUNTER_PLACE_OFFSET_Z = 0.28;
const DAMAGE_COUNTER_PLACE_DURATION_SEC = 0.48;
/** Starts oversized so scaling down reads as lowering onto the card surface. */
const DAMAGE_COUNTER_PLACE_START_SCALE = 1.42;
const DAMAGE_COUNTER_POP_OUT_DURATION_SEC = 0.16;
const DAMAGE_COUNTER_POP_OUT_SCALE = 0.82;

export type Board3dDamageCounterUpdateOptions = {
  /** When true, build at the pre-place offset but run the place tween only after the card becomes visible. */
  deferAppearAnimation?: boolean;
};

export class Board3dDamageCounter {
  private group: Group;
  private mesh: Mesh | null = null;
  private currentDamage: number = 0;
  private damageAnim: gsap.core.Timeline | null = null;
  private appearAnimationDeferred = false;
  private attachedParent: Object3D | null = null;
  private static readonly _qParent = new Quaternion();
  private static readonly _qCam = new Quaternion();
  private static readonly _qFlip = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);

  constructor() {
    this.group = new Group();
  }

  /** Parent to the card mesh so the counter follows in-plane condition rotation. */
  attachTo(parent: Object3D): void {
    if (this.attachedParent === parent) {
      return;
    }
    this.attachedParent?.remove(this.group);
    this.attachedParent = parent;
    parent.add(this.group);
  }

  private killDamageAnim(): void {
    if (this.damageAnim) {
      this.damageAnim.kill();
      this.damageAnim = null;
    }
  }

  private applyPrePlacePosition(mesh: Mesh): void {
    mesh.position.set(
      DAMAGE_COUNTER_REST_X + DAMAGE_COUNTER_PLACE_OFFSET_X,
      DAMAGE_COUNTER_REST_Y + DAMAGE_COUNTER_PLACE_OFFSET_Y,
      DAMAGE_COUNTER_REST_Z + DAMAGE_COUNTER_PLACE_OFFSET_Z,
    );
  }

  private playAppearAnimation(): void {
    if (!this.mesh) {
      return;
    }
    this.killDamageAnim();
    this.damageAnim = gsap.timeline({
      onComplete: () => {
        this.damageAnim = null;
      },
    });
    const s0 = DAMAGE_COUNTER_PLACE_START_SCALE;
    this.mesh.scale.setScalar(s0);
    this.damageAnim
      .to({}, { duration: DAMAGE_COUNTER_APPEAR_DELAY_SEC })
      .to(this.mesh.position, {
        x: DAMAGE_COUNTER_REST_X,
        y: DAMAGE_COUNTER_REST_Y,
        z: DAMAGE_COUNTER_REST_Z,
        duration: DAMAGE_COUNTER_PLACE_DURATION_SEC,
        ease: 'power2.out',
      })
      .to(
        this.mesh.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: DAMAGE_COUNTER_PLACE_DURATION_SEC,
          // Faster shrink early, eases into rest — reads as lowering into the slot
          ease: 'expo.out',
        },
        `<`,
      );
  }

  /**
   * Update the damage counter display
   */
  updateDamage(damage: number, options?: Board3dDamageCounterUpdateOptions): void {
    const deferAppear = options?.deferAppearAnimation ?? false;

    if (damage === this.currentDamage && this.mesh) {
      if (this.appearAnimationDeferred && !deferAppear) {
        this.playAppearAnimation();
        this.appearAnimationDeferred = false;
      }
      return;
    }

    this.killDamageAnim();

    if (damage <= 0) {
      this.appearAnimationDeferred = false;
      if (!this.mesh) {
        this.currentDamage = 0;
        return;
      }
      const mesh = this.mesh;
      this.damageAnim = gsap.timeline({
        onComplete: () => {
          this.damageAnim = null;
          this.currentDamage = 0;
          this.disposeMeshOnly();
        },
      });
      this.damageAnim
        .to(
          mesh.position,
          {
            x: DAMAGE_COUNTER_REST_X + DAMAGE_COUNTER_PLACE_OFFSET_X * 0.85,
            y: DAMAGE_COUNTER_REST_Y + DAMAGE_COUNTER_PLACE_OFFSET_Y * 0.85,
            z: DAMAGE_COUNTER_REST_Z + DAMAGE_COUNTER_PLACE_OFFSET_Z * 0.85,
            duration: DAMAGE_COUNTER_POP_OUT_DURATION_SEC,
            ease: 'power2.in',
          },
        )
        .to(
          mesh.scale,
          {
            x: DAMAGE_COUNTER_POP_OUT_SCALE,
            y: DAMAGE_COUNTER_POP_OUT_SCALE,
            z: DAMAGE_COUNTER_POP_OUT_SCALE,
            duration: DAMAGE_COUNTER_POP_OUT_DURATION_SEC,
            ease: 'power2.in',
          },
          '<',
        );
      return;
    }

    this.currentDamage = damage;
    this.disposeMeshOnly();

    // Create canvas texture with damage number
    const texture = this.createDamageTexture(damage);

    const geometry = new PlaneGeometry(COUNTER_SIZE, COUNTER_SIZE);
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: DoubleSide,
      alphaTest: 0.1,
      depthWrite: false,
      // Respect depth so hand / flight cards occlude the counter (depthTest:false painted over everything).
      // Slight polygon offset keeps the billboarded disc from depth-fighting the host card edge.
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      color: 0xd0d0d0, // Darkened to prevent bloom (luminance ~0.815, below 0.85 threshold)
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.renderOrder = 20;
    this.mesh.frustumCulled = false;

    // Top-right on card; intro starts offset (placed motion), ends at rest.
    this.applyPrePlacePosition(this.mesh);
    this.mesh.scale.setScalar(DAMAGE_COUNTER_PLACE_START_SCALE);

    this.group.add(this.mesh);

    if (deferAppear) {
      this.appearAnimationDeferred = true;
      return;
    }

    this.appearAnimationDeferred = false;
    this.playAppearAnimation();
  }

  /**
   * Create a canvas texture with the damage number
   */
  private createDamageTexture(damage: number): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = BOARD_DAMAGE_COUNTER_SIZE;
    canvas.height = BOARD_DAMAGE_COUNTER_SIZE;
    const ctx = canvas.getContext('2d')!;
    paintBoardDamageCounter(ctx, damage);

    const texture = new CanvasTexture(canvas);
    // Compensate for billboard Y-flip (same as energy icons).
    texture.repeat.x = -1;
    texture.offset.x = 1;
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Remove and dispose the mesh without touching {@link currentDamage} or in-flight pop-out state.
   */
  private disposeMeshOnly(): void {
    if (this.mesh) {
      this.group.remove(this.mesh);
      (this.mesh.material as MeshBasicMaterial).map?.dispose();
      (this.mesh.material as MeshBasicMaterial).dispose();
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
  }

  /**
   * Clear the damage counter
   */
  clear(): void {
    this.killDamageAnim();
    this.appearAnimationDeferred = false;
    this.disposeMeshOnly();
  }

  /** Face the camera each frame (same pattern as energy icons / status markers). */
  updateBillboards(camera: PerspectiveCamera): void {
    if (!this.mesh) {
      return;
    }
    if (isUnderInspectingCard(this.mesh)) {
      this.mesh.quaternion.identity();
      return;
    }
    camera.getWorldQuaternion(Board3dDamageCounter._qCam);
    const parent = this.mesh.parent;
    if (!parent) {
      this.mesh.quaternion.copy(Board3dDamageCounter._qCam).multiply(Board3dDamageCounter._qFlip);
      return;
    }
    parent.getWorldQuaternion(Board3dDamageCounter._qParent);
    this.mesh.quaternion
      .copy(Board3dDamageCounter._qParent)
      .invert()
      .multiply(Board3dDamageCounter._qCam)
      .multiply(Board3dDamageCounter._qFlip);
  }

  /**
   * Get the group to add to a parent
   */
  getGroup(): Group {
    return this.group;
  }

  /**
   * Get current damage value
   */
  getDamage(): number {
    return this.currentDamage;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.killDamageAnim();
    this.appearAnimationDeferred = false;
    this.disposeMeshOnly();
    this.currentDamage = 0;
    this.attachedParent?.remove(this.group);
    this.attachedParent = null;
  }
}
