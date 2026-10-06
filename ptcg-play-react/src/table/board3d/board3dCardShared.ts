import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Shape,
  Vector2,
} from 'three';
import type { Texture } from 'three';

/** Card face size — matches overlay layout / historical BoxGeometry. */
export const BOARD3D_CARD_WIDTH = 2.5;
export const BOARD3D_CARD_HEIGHT = 3.5;
export const BOARD3D_CARD_DEPTH = 0.02;

/**
 * Corner radius matching `assets/3d-card-mask.png` (~37px on 734px width).
 * Kept in sync so geometric silhouette aligns with the alpha mask.
 */
export const BOARD3D_CARD_CORNER_RADIUS = BOARD3D_CARD_WIDTH * (37 / 734);

const CARD_CURVE_SEGMENTS = 12;
const OUTLINE_THICKNESS = 0.15;
const OUTLINE_DEPTH = 0.01;

/** Shared cache key for face materials (matches {@link Board3dCard} history). */
export function board3dCardMaterialKey(texture: Texture, maskTexture?: Texture): string {
  const textureId =
    (texture as { uuid?: string; image?: { src?: string } }).uuid || texture.image?.src || 'unknown';
  const maskId = maskTexture
    ? (maskTexture as { uuid?: string; image?: { src?: string } }).uuid ||
      maskTexture.image?.src ||
      'unknown'
    : 'no-mask';
  return `${textureId}|${maskId}`;
}

let cardGeometry: BufferGeometry | undefined;
let outlineGeometry: BufferGeometry | undefined;

/** Fallback when a texture has no readable pixels (matches prior hard-coded edge). */
export const BOARD3D_DEFAULT_CARD_EDGE_COLOR = 0x2a2a2a;

/** Face/back materials keyed by {@link board3dCardMaterialKey} (shared across JSX + imperative cards). */
export const board3dCardFaceMaterialCache = new Map<string, MeshStandardMaterial>();

/** Outline materials keyed by color+mask (shared). */
export const board3dCardOutlineMaterialCache = new Map<string, MeshBasicMaterial>();

/** Edge materials keyed by hex color (shared across cards with the same sleeve border). */
export const board3dCardEdgeMaterialCache = new Map<number, MeshStandardMaterial>();

export function getBoard3dCardFaceMaterialCacheSize(): number {
  return board3dCardFaceMaterialCache.size;
}

/**
 * Dispose face materials whose cache key references the given texture UUID.
 * Used when the asset loader evicts a texture from its LRU cache.
 */
export function evictBoard3dCardFaceMaterialsForTexture(texture: Texture): void {
  const uuid = texture.uuid;
  for (const [key, material] of [...board3dCardFaceMaterialCache.entries()]) {
    if (!key.startsWith(`${uuid}|`)) {
      continue;
    }
    material.dispose();
    board3dCardFaceMaterialCache.delete(key);
  }
}

/** Avoid re-sampling the same texture image for every card in a stack. */
const textureBorderColorCache = new WeakMap<object, number>();

function createRoundedRectShape(width: number, height: number, radius: number): Shape {
  const r = Math.min(radius, width / 2, height / 2);
  const x = -width / 2;
  const y = -height / 2;
  const shape = new Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - r);
  shape.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + height);
  shape.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

function cardFaceUVGenerator(width: number, height: number) {
  return {
    generateTopUV(
      _geometry: BufferGeometry,
      vertices: number[],
      indexA: number,
      indexB: number,
      indexC: number,
    ): Vector2[] {
      const toUV = (i: number) =>
        new Vector2(
          (vertices[i * 3]! + width / 2) / width,
          (vertices[i * 3 + 1]! + height / 2) / height,
        );
      return [toUV(indexA), toUV(indexB), toUV(indexC)];
    },
    generateSideWallUV(
      _geometry: BufferGeometry,
      _vertices: number[],
      _indexA: number,
      _indexB: number,
      _indexC: number,
      _indexD: number,
    ): Vector2[] {
      return [new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1)];
    },
  };
}

/**
 * Rounded-rect extrude with material groups:
 * 0 = edge (sides), 1 = front (+Z), 2 = back (-Z).
 * Back-face U is flipped so cardbacks aren't mirrored.
 */
function buildRoundedCardGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  curveSegments: number = CARD_CURVE_SEGMENTS,
): BufferGeometry {
  const shape = createRoundedRectShape(width, height, radius);
  const extruded = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments,
    UVGenerator: cardFaceUVGenerator(width, height),
  });
  extruded.translate(0, 0, -depth / 2);
  extruded.computeVertexNormals();

  const pos = extruded.attributes.position!;
  const nrm = extruded.attributes.normal!;
  const uv = extruded.attributes.uv!;

  const front: number[] = [];
  const back: number[] = [];
  const sides: number[] = [];

  for (let i = 0; i < pos.count; i += 3) {
    const nz = (nrm.getZ(i) + nrm.getZ(i + 1) + nrm.getZ(i + 2)) / 3;
    const bucket = nz > 0.5 ? front : nz < -0.5 ? back : sides;
    bucket.push(i, i + 1, i + 2);
  }

  // Flip U on back face so cardback orientation matches the old BoxGeometry -Z face.
  for (const i of back) {
    uv.setX(i, 1 - uv.getX(i));
  }

  const order = [...sides, ...front, ...back];
  const newPos: number[] = [];
  const newNrm: number[] = [];
  const newUv: number[] = [];
  for (const i of order) {
    newPos.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    newNrm.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
    newUv.push(uv.getX(i), uv.getY(i));
  }

  extruded.dispose();

  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(newPos, 3));
  out.setAttribute('normal', new Float32BufferAttribute(newNrm, 3));
  out.setAttribute('uv', new Float32BufferAttribute(newUv, 2));
  out.clearGroups();
  out.addGroup(0, sides.length, 0);
  out.addGroup(sides.length, front.length, 1);
  out.addGroup(sides.length + front.length, back.length, 2);
  return out;
}

/** Shared rounded card mesh (edge / front / back material groups). */
export function getBoard3dCardGeometry(): BufferGeometry {
  if (!cardGeometry) {
    cardGeometry = buildRoundedCardGeometry(
      BOARD3D_CARD_WIDTH,
      BOARD3D_CARD_HEIGHT,
      BOARD3D_CARD_DEPTH,
      BOARD3D_CARD_CORNER_RADIUS,
    );
  }
  return cardGeometry;
}

/** @deprecated Prefer {@link getBoard3dCardGeometry} — same shared rounded mesh. */
export function getBoard3dCardBoxGeometry(): BufferGeometry {
  return getBoard3dCardGeometry();
}

/** Inflated rounded outline (parallel curve: radius + thickness). */
export function getBoard3dCardOutlineGeometry(): BufferGeometry {
  if (!outlineGeometry) {
    outlineGeometry = buildRoundedCardGeometry(
      BOARD3D_CARD_WIDTH + OUTLINE_THICKNESS * 2,
      BOARD3D_CARD_HEIGHT + OUTLINE_THICKNESS * 2,
      OUTLINE_DEPTH,
      BOARD3D_CARD_CORNER_RADIUS + OUTLINE_THICKNESS,
    );
  }
  return outlineGeometry;
}

/**
 * Average opaque pixels in a thin band around the texture border (sleeve rim / cardback edge).
 * Used so extruded card sides match the visible sleeve colour instead of a flat grey.
 */
export function sampleTextureBorderColor(texture: Texture): number {
  const image = texture.image as
    | HTMLImageElement
    | ImageBitmap
    | HTMLCanvasElement
    | OffscreenCanvas
    | ImageData
    | { width: number; height: number; data?: ArrayLike<number> }
    | undefined
    | null;

  if (!image) {
    return BOARD3D_DEFAULT_CARD_EDGE_COLOR;
  }

  const cached = textureBorderColorCache.get(image);
  if (cached !== undefined) {
    return cached;
  }

  const cacheAndReturn = (color: number) => {
    textureBorderColorCache.set(image, color);
    return color;
  };

  const w = 'width' in image ? Number(image.width) : 0;
  const h = 'height' in image ? Number(image.height) : 0;
  if (!w || !h) {
    return cacheAndReturn(BOARD3D_DEFAULT_CARD_EDGE_COLOR);
  }

  let data: ArrayLike<number> | null = null;
  if (typeof ImageData !== 'undefined' && image instanceof ImageData) {
    data = image.data;
  } else if ('data' in image && image.data && (image.data as ArrayLike<number>).length >= w * h * 4) {
    data = image.data as ArrayLike<number>;
  } else if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return cacheAndReturn(BOARD3D_DEFAULT_CARD_EDGE_COLOR);
      }
      ctx.drawImage(image as CanvasImageSource, 0, 0);
      data = ctx.getImageData(0, 0, w, h).data;
    } catch {
      // Tainted canvas (CORS) — keep the neutral fallback.
      return cacheAndReturn(BOARD3D_DEFAULT_CARD_EDGE_COLOR);
    }
  }

  if (!data) {
    return cacheAndReturn(BOARD3D_DEFAULT_CARD_EDGE_COLOR);
  }

  const inset = Math.max(1, Math.floor(Math.min(w, h) / 80));
  const band = Math.max(2, Math.floor(Math.min(w, h) / 40));
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    const a = data![i + 3] ?? 255;
    if (a < 200) return;
    rSum += data![i]!;
    gSum += data![i + 1]!;
    bSum += data![i + 2]!;
    count += 1;
  };

  for (let x = inset; x < w - inset; x++) {
    for (let y = inset; y < inset + band && y < h - inset; y++) sample(x, y);
    for (let y = Math.max(inset, h - inset - band); y < h - inset; y++) sample(x, y);
  }
  for (let y = inset + band; y < h - inset - band; y++) {
    for (let x = inset; x < inset + band && x < w - inset; x++) sample(x, y);
    for (let x = Math.max(inset, w - inset - band); x < w - inset; x++) sample(x, y);
  }

  const color =
    count > 0
      ? ((Math.round(rSum / count) & 0xff) << 16) |
        ((Math.round(gSum / count) & 0xff) << 8) |
        (Math.round(bSum / count) & 0xff)
      : BOARD3D_DEFAULT_CARD_EDGE_COLOR;

  return cacheAndReturn(color);
}

export function getBoard3dCardEdgeMaterial(
  color: number = BOARD3D_DEFAULT_CARD_EDGE_COLOR,
): MeshStandardMaterial {
  let material = board3dCardEdgeMaterialCache.get(color);
  if (!material) {
    material = new MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
    });
    board3dCardEdgeMaterialCache.set(color, material);
  }
  return material;
}

/** Edge colour sampled from a sleeve / cardback texture (cached per image). */
export function getBoard3dCardEdgeMaterialForTexture(texture: Texture): MeshStandardMaterial {
  return getBoard3dCardEdgeMaterial(sampleTextureBorderColor(texture));
}

export function disposeBoard3dCardSharedResources(): void {
  if (cardGeometry) {
    cardGeometry.dispose();
    cardGeometry = undefined;
  }
  if (outlineGeometry) {
    outlineGeometry.dispose();
    outlineGeometry = undefined;
  }
  board3dCardEdgeMaterialCache.forEach((m) => m.dispose());
  board3dCardEdgeMaterialCache.clear();
  board3dCardFaceMaterialCache.forEach((m) => m.dispose());
  board3dCardFaceMaterialCache.clear();
  board3dCardOutlineMaterialCache.forEach((m) => m.dispose());
  board3dCardOutlineMaterialCache.clear();
}
