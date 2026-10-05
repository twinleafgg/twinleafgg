import {
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  Group,
  DoubleSide,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from 'three';
import { PokemonCardList, SpecialCondition } from 'ptcg-server';
import { Board3dAssetLoaderService } from './services/board-3d-asset-loader.service';
import { MARKER_SIZE, markerOverlayPosition, markerStackIndexForFile, resolveMarkerStack } from './board-3d-overlay-layout';
import { isUnderInspectingCard } from './board3dInspectingCard';

/** Map SpecialCondition to marker image filenames in assets/status-conditions/. */
export const STATUS_CONDITION_MARKER_FILES: { [key: number]: string } = {
  [SpecialCondition.POISONED]: 'poison-marker',
  [SpecialCondition.PARALYZED]: 'paralyzed-marker',
  [SpecialCondition.CONFUSED]: 'confused-marker',
  [SpecialCondition.ASLEEP]: 'asleep-marker',
  [SpecialCondition.BURNED]: 'burned-marker',
};

export const IMPRISON_MARKER_NAME = 'IMPRISON_MARKER';
export const IMPRISON_MARKER_FILE = 'imprison-marker';
export const SHOCKWAVE_MARKER_FILE = 'shockwave-marker';

/** DOM order in Angular board-card (stacking / overlap rules). */
const MARKER_DISPLAY_ORDER: readonly string[] = [
  STATUS_CONDITION_MARKER_FILES[SpecialCondition.POISONED],
  STATUS_CONDITION_MARKER_FILES[SpecialCondition.PARALYZED],
  STATUS_CONDITION_MARKER_FILES[SpecialCondition.CONFUSED],
  STATUS_CONDITION_MARKER_FILES[SpecialCondition.ASLEEP],
  STATUS_CONDITION_MARKER_FILES[SpecialCondition.BURNED],
  IMPRISON_MARKER_FILE,
  SHOCKWAVE_MARKER_FILE,
];

/** Only one card tilt applies at a time; asleep > confused > paralyzed (matches Angular). */
function primaryOrientationCondition(conditions: SpecialCondition[]): SpecialCondition | undefined {
  if (hasSpecialCondition(conditions, SpecialCondition.ASLEEP)) {
    return SpecialCondition.ASLEEP;
  }
  if (hasSpecialCondition(conditions, SpecialCondition.CONFUSED)) {
    return SpecialCondition.CONFUSED;
  }
  if (hasSpecialCondition(conditions, SpecialCondition.PARALYZED)) {
    return SpecialCondition.PARALYZED;
  }
  return undefined;
}

function hasSpecialCondition(conditions: SpecialCondition[], condition: SpecialCondition): boolean {
  return conditions.some((value) => {
    if (value === condition || Number(value) === condition) {
      return true;
    }
    if (typeof value === 'string') {
      return SpecialCondition[value as keyof typeof SpecialCondition] === condition;
    }
    return false;
  });
}

function addConditionMarker(active: Set<string>, conditions: SpecialCondition[], condition: SpecialCondition): void {
  if (hasSpecialCondition(conditions, condition)) {
    active.add(STATUS_CONDITION_MARKER_FILES[condition]);
  }
}

/** Collect marker image filenames for a Pokémon (status conditions + custom markers). */
export function collectPokemonMarkerFiles(cardList: PokemonCardList): string[] {
  const active = new Set<string>();
  const { specialConditions } = cardList;

  addConditionMarker(active, specialConditions, SpecialCondition.POISONED);
  addConditionMarker(active, specialConditions, SpecialCondition.PARALYZED);
  addConditionMarker(active, specialConditions, SpecialCondition.CONFUSED);
  addConditionMarker(active, specialConditions, SpecialCondition.ASLEEP);
  addConditionMarker(active, specialConditions, SpecialCondition.BURNED);

  if (cardList.marker.hasMarker(IMPRISON_MARKER_NAME)) {
    active.add(IMPRISON_MARKER_FILE);
  }

  return MARKER_DISPLAY_ORDER.filter((file) => active.has(file));
}

/** Card in-plane rotation for asleep / confused / paralyzed (matches Angular board-card). */
export function getSpecialConditionRotationZ(conditions: SpecialCondition[]): number {
  const orientation = primaryOrientationCondition(conditions);
  if (orientation === SpecialCondition.ASLEEP) {
    return -Math.PI / 2;
  }
  if (orientation === SpecialCondition.CONFUSED) {
    return Math.PI;
  }
  if (orientation === SpecialCondition.PARALYZED) {
    return Math.PI / 2;
  }
  return 0;
}

export class Board3dMarker {
  private group: Group;
  private markerMeshes: Mesh[] = [];
  private lastMarkerSignature = '';
  private static geometry?: PlaneGeometry;
  private static readonly _qParent = new Quaternion();
  private static readonly _qCam = new Quaternion();
  private static readonly _qFlip = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
  private assetLoader: Board3dAssetLoaderService;
  private updateGeneration = 0;
  private attachedParent: Object3D | null = null;

  constructor(assetLoader: Board3dAssetLoaderService) {
    this.group = new Group();
    this.assetLoader = assetLoader;

    if (!Board3dMarker.geometry) {
      Board3dMarker.geometry = new PlaneGeometry(MARKER_SIZE, MARKER_SIZE);
    }
  }

  /** Parent to the card mesh so markers rotate with asleep/confused/paralyzed tilts. */
  attachTo(parent: Object3D): void {
    if (this.attachedParent === parent) {
      return;
    }
    this.attachedParent?.remove(this.group);
    this.attachedParent = parent;
    parent.add(this.group);
  }

  /**
   * Update markers from image filenames (without path/extension).
   */
  async updateMarkerFiles(markerFiles: string[]): Promise<void> {
    const stack = resolveMarkerStack(markerFiles);
    const signature = stack.join('|');
    if (signature === this.lastMarkerSignature) {
      return;
    }

    const generation = ++this.updateGeneration;
    this.clearMeshes();

    if (stack.length === 0) {
      this.lastMarkerSignature = signature;
      return;
    }

    const activeFiles = new Set(stack);

    const textures = await Promise.all(
      stack.map((file) => this.assetLoader.loadMarkerTexture(file)),
    );

    if (generation !== this.updateGeneration) {
      return;
    }

    this.lastMarkerSignature = signature;

    for (let i = 0; i < stack.length; i++) {
      const file = stack[i];
      const texture = textures[i];
      const stackIndex = markerStackIndexForFile(file, activeFiles);
      const { x, y, z } = markerOverlayPosition(stackIndex);

      const material = new MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: DoubleSide,
        alphaTest: 0.1,
        depthWrite: false,
        // Respect depth so hand / flight cards occlude markers (depthTest:false painted over everything).
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });

      const mesh = new Mesh(Board3dMarker.geometry, material);
      mesh.renderOrder = 20 + stackIndex;
      mesh.frustumCulled = false;
      mesh.position.set(x, y, z);
      mesh.userData.isStatusMarker = true;
      mesh.userData.markerFile = file;
      mesh.userData.stackIndex = stackIndex;

      this.group.add(mesh);
      this.markerMeshes.push(mesh);
    }
  }

  /** Refresh markers from a Pokémon card list (preferred entry point). */
  async updateForCard(cardList: PokemonCardList): Promise<void> {
    await this.updateMarkerFiles(collectPokemonMarkerFiles(cardList));
  }

  /** Face the camera each frame (same pattern as {@link Board3dEnergySprite}). */
  updateBillboards(camera: PerspectiveCamera): void {
    for (const mesh of this.markerMeshes) {
      if (isUnderInspectingCard(mesh)) {
        mesh.quaternion.identity();
        continue;
      }
      camera.getWorldQuaternion(Board3dMarker._qCam);
      const parent = mesh.parent;
      if (!parent) {
        mesh.quaternion.copy(Board3dMarker._qCam).multiply(Board3dMarker._qFlip);
        continue;
      }
      parent.getWorldQuaternion(Board3dMarker._qParent);
      mesh.quaternion
        .copy(Board3dMarker._qParent)
        .invert()
        .multiply(Board3dMarker._qCam)
        .multiply(Board3dMarker._qFlip);
    }
  }

  /** @deprecated Prefer updateForCard(cardList). */
  async updateConditions(conditions: SpecialCondition[]): Promise<void> {
    const active = new Set<string>();
    for (const condition of conditions) {
      const file = STATUS_CONDITION_MARKER_FILES[condition];
      if (file !== undefined) {
        active.add(file);
      }
    }
    await this.updateMarkerFiles(MARKER_DISPLAY_ORDER.filter((file) => active.has(file)));
  }

  private clearMeshes(): void {
    for (const mesh of this.markerMeshes) {
      this.group.remove(mesh);
      (mesh.material as MeshBasicMaterial).dispose();
    }
    this.markerMeshes = [];
  }

  clear(): void {
    this.lastMarkerSignature = '';
    this.clearMeshes();
  }

  getGroup(): Group {
    return this.group;
  }

  dispose(): void {
    this.updateGeneration++;
    this.clear();
    this.attachedParent?.remove(this.group);
    this.attachedParent = null;
  }

  static disposeSharedResources(): void {
    if (Board3dMarker.geometry) {
      Board3dMarker.geometry.dispose();
      Board3dMarker.geometry = undefined;
    }
  }
}
