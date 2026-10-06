import {
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  Texture,
  Group,
  DoubleSide,
  PerspectiveCamera,
  Quaternion,
  Vector3,
  Object3D,
} from 'three';
import { Card, CardList } from 'ptcg-server';
import { getCustomEnergyIconPath } from './energy-icons.utils';
import { isUnderInspectingCard } from './board3dInspectingCard';

const MAX_VISIBLE_ENERGIES = 8;
const ENERGY_SPRITE_HEIGHT = 0.6;
const ENERGY_ICON_ASPECT = 749 / 1042;
const ENERGY_SPRITE_WIDTH = ENERGY_SPRITE_HEIGHT * ENERGY_ICON_ASPECT;
const ENERGY_SPACING = 0.3;
const CARD_HALF_WIDTH = 1.25;
const CARD_HALF_HEIGHT = 1.75;

/** Card-mesh local position (matches prior card-group layout at zero condition rotation). */
export function energyIconLocalPosition(index: number): { x: number; y: number; z: number } {
  const cardLeftEdge = -CARD_HALF_WIDTH;
  const startX = cardLeftEdge + 0.15;
  return {
    x: startX + index * ENERGY_SPACING,
    y: -CARD_HALF_HEIGHT,
    z: 0.1,
  };
}

export { ENERGY_SPRITE_HEIGHT, ENERGY_SPRITE_WIDTH };

export class Board3dEnergySprite {
  private group: Group;
  private energyMeshes: Mesh[] = [];
  private lastSignature = '';
  private static geometry?: PlaneGeometry;
  /** Shared horizontally-flipped clones keyed by source texture UUID (created once). */
  private static flippedTextureBySource = new Map<string, Texture>();
  private static readonly _qParent = new Quaternion();
  private static readonly _qCam = new Quaternion();
  private static readonly _qFlip = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
  private attachedParent: Object3D | null = null;

  constructor() {
    this.group = new Group();
    if (!Board3dEnergySprite.geometry) {
      Board3dEnergySprite.geometry = new PlaneGeometry(ENERGY_SPRITE_WIDTH, ENERGY_SPRITE_HEIGHT);
    }
  }

  /** Parent to the card mesh so icons follow in-plane condition rotation. */
  attachTo(parent: Object3D): void {
    if (this.attachedParent === parent) {
      return;
    }
    this.attachedParent?.remove(this.group);
    this.attachedParent = parent;
    parent.add(this.group);
  }

  static getEnergyIconPath(card: Card): string | null {
    return getCustomEnergyIconPath(card, true);
  }

  private static getFlippedTexture(source: Texture): Texture {
    const key = source.uuid;
    let flipped = Board3dEnergySprite.flippedTextureBySource.get(key);
    if (!flipped) {
      flipped = source.clone();
      flipped.repeat.x = -1;
      flipped.offset.x = 1;
      Board3dEnergySprite.flippedTextureBySource.set(key, flipped);
    }
    return flipped;
  }

  private buildSignature(
    energyCards: Card[],
    resolveTextureKey: (card: Card) => string | null,
    hideIndex: number,
  ): string {
    const visibleCount = Math.min(energyCards.length, MAX_VISIBLE_ENERGIES);
    const parts: string[] = [`h${hideIndex}`];
    for (let i = 0; i < visibleCount; i++) {
      if (i === hideIndex) {
        parts.push('x');
        continue;
      }
      const card = energyCards[i];
      parts.push(`${card.id}:${resolveTextureKey(card) ?? 'back'}`);
    }
    return parts.join('|');
  }

  updateEnergies(
    energyCards: Card[],
    energyCardList: CardList,
    textures: Map<string, Texture>,
    cardBackTexture: Texture,
    resolveTextureKey: (card: Card) => string | null = (c) => Board3dEnergySprite.getEnergyIconPath(c),
    hideIndex: number = -1,
  ): void {
    const signature = this.buildSignature(energyCards, resolveTextureKey, hideIndex);
    if (signature === this.lastSignature && this.energyMeshes.length > 0) {
      // Refresh cardList refs in case the list object identity changed.
      for (const mesh of this.energyMeshes) {
        mesh.userData.cardList = energyCardList;
      }
      return;
    }
    this.lastSignature = signature;
    this.clearMeshes();

    const visibleCount = Math.min(energyCards.length, MAX_VISIBLE_ENERGIES);

    for (let i = 0; i < visibleCount; i++) {
      if (i === hideIndex) {
        continue;
      }
      const card = energyCards[i];
      const iconPath = resolveTextureKey(card);
      let texture: Texture;
      if (iconPath && textures.has(iconPath)) {
        texture = textures.get(iconPath)!;
      } else {
        texture = cardBackTexture;
      }

      const textureToUse = Board3dEnergySprite.getFlippedTexture(texture);

      const material = new MeshBasicMaterial({
        map: textureToUse,
        transparent: true,
        side: DoubleSide,
        alphaTest: 0.1,
        depthWrite: false,
      });

      const mesh = new Mesh(Board3dEnergySprite.geometry, material);
      const { x, y, z } = energyIconLocalPosition(i);
      mesh.position.set(x, y, z);
      mesh.renderOrder = 12;

      mesh.userData.isEnergyIcon = true;
      mesh.userData.cardData = card;
      mesh.userData.cardList = energyCardList;

      this.group.add(mesh);
      this.energyMeshes.push(mesh);
    }
  }

  updateBillboards(camera: PerspectiveCamera): void {
    for (const mesh of this.energyMeshes) {
      if (isUnderInspectingCard(mesh)) {
        // Lie flat on the card face while inspecting (no camera billboard).
        mesh.quaternion.identity();
        continue;
      }
      camera.getWorldQuaternion(Board3dEnergySprite._qCam);
      const parent = mesh.parent;
      if (!parent) {
        mesh.quaternion.copy(Board3dEnergySprite._qCam).multiply(Board3dEnergySprite._qFlip);
        continue;
      }
      parent.getWorldQuaternion(Board3dEnergySprite._qParent);
      mesh.quaternion
        .copy(Board3dEnergySprite._qParent)
        .invert()
        .multiply(Board3dEnergySprite._qCam)
        .multiply(Board3dEnergySprite._qFlip);
    }
  }

  /** Remove meshes; do not dispose shared flipped textures. */
  private clearMeshes(): void {
    for (const mesh of this.energyMeshes) {
      this.group.remove(mesh);
      const material = mesh.material as MeshBasicMaterial;
      material.dispose();
    }
    this.energyMeshes = [];
  }

  clear(): void {
    this.lastSignature = '';
    this.clearMeshes();
  }

  getGroup(): Group {
    return this.group;
  }

  dispose(): void {
    this.clear();
    this.attachedParent?.remove(this.group);
    this.attachedParent = null;
  }

  static disposeSharedResources(): void {
    if (Board3dEnergySprite.geometry) {
      Board3dEnergySprite.geometry.dispose();
      Board3dEnergySprite.geometry = undefined;
    }
    Board3dEnergySprite.flippedTextureBySource.forEach((t) => t.dispose());
    Board3dEnergySprite.flippedTextureBySource.clear();
  }
}
