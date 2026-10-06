import { useEffect, useLayoutEffect, useMemo } from 'react';
import {
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Path,
  PlaneGeometry,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  type Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Select } from '@react-three/postprocessing';
import { useLoader, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { PlayerType } from 'ptcg-server';
import { getBoardConfig } from './board-3d-config';
import {
  BOARD3D_CARD_CORNER_RADIUS,
  BOARD3D_CARD_HEIGHT,
  BOARD3D_CARD_WIDTH,
} from './board3dCardShared';
import { BOARD_3D_CENTER_EMBLEM_SIZE, BOARD_3D_CENTER_EMBLEM_Y } from './board3d-constants';
import { getBenchPositions } from './board-3d-zone-positions';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

const BOARD_W = 70;
const BOARD_H = 50;
const BOARD_CENTER_Z = 12;
const SLOT_W = BOARD3D_CARD_WIDTH;
const SLOT_H = BOARD3D_CARD_HEIGHT;

type ZonePadProps = {
  position: [number, number, number];
  geometry: ShapeGeometry;
  material: MeshBasicMaterial;
};

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

function createRoundedRectFrame(
  width: number,
  height: number,
  radius: number,
  innerRadius: number,
  borderWidth: number,
): Shape {
  const shape = createRoundedRectShape(width, height, radius);
  const innerShape = createRoundedRectShape(
    width - borderWidth * 2,
    height - borderWidth * 2,
    innerRadius,
  );
  const hole = new Path();
  hole.setFromPoints(innerShape.getPoints(12).reverse());
  shape.holes.push(hole);
  return shape;
}

function ZonePad({ position, geometry, material }: ZonePadProps) {
  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={geometry}
      material={material}
      receiveShadow={false}
    />
  );
}

type SlotPad = {
  key: string;
  position: Vector3 | { x: number; y: number; z: number };
};

export type Board3dStaticSceneProps = {
  /** When true, emblem is wrapped in postprocessing {@link Select} for selective bloom. */
  bloomActive?: boolean;
  /** Live bench capacity for the near player (from `player.bench.length`). */
  bottomBenchSize?: number;
  /** Live bench capacity for the far player (from `player.bench.length`). */
  topBenchSize?: number;
};

export function Board3dStaticScene({
  bloomActive = false,
  bottomBenchSize = 5,
  topBenchSize = 5,
}: Board3dStaticSceneProps) {
  const emblemPath = publicAssetUrl('assets/twinleaf-board-center.png');
  const centerTex = useLoader(TextureLoader, emblemPath);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(size.height, 1);
  const { zonePositions } = getBoardConfig(aspect);

  useLayoutEffect(() => {
    // Premultiply transparent texels to prevent pale mipmap halos around the center art.
    // eslint-disable-next-line react-hooks/immutability -- configure the loaded Three.js texture before first render.
    centerTex.colorSpace = SRGBColorSpace;
    centerTex.premultiplyAlpha = true;
    centerTex.generateMipmaps = true;
    centerTex.minFilter = LinearMipmapLinearFilter;
    centerTex.magFilter = LinearFilter;
    centerTex.anisotropy = gl.capabilities.getMaxAnisotropy();
    centerTex.needsUpdate = true;
  }, [centerTex, gl]);

  const materials = useMemo(() => {
    return {
      trim: new MeshStandardMaterial({ color: 0x080f19, roughness: 0.4, metalness: 0.12 }),
      board: new MeshStandardMaterial({ color: 0x15253b, roughness: 0.94, metalness: 0.01 }),
      slotFrame: new MeshBasicMaterial({
        color: 0xf3e4ce,
        transparent: true,
        opacity: 0.15,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      }),
      emblem: new MeshBasicMaterial({
        map: centerTex,
        transparent: true,
        opacity: 1,
        depthTest: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
        alphaTest: 0.02,
      }),
      guide: new MeshBasicMaterial({
        color: 0xd6e8dc,
        transparent: true,
        opacity: 0.2,
        side: DoubleSide,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, [centerTex]);

  const geometries = useMemo(() => ({
    outer: new RoundedBoxGeometry(BOARD_W + 1.2, 0.82, BOARD_H + 1.2, 6, 0.38),
    board: new RoundedBoxGeometry(BOARD_W, 0.64, BOARD_H, 6, 0.3),
    slotFrame: new ShapeGeometry(
      createRoundedRectFrame(
        SLOT_W + 0.07,
        SLOT_H + 0.07,
        BOARD3D_CARD_CORNER_RADIUS + 0.035,
        BOARD3D_CARD_CORNER_RADIUS,
        0.035,
      ),
      12,
    ),
    emblem: new PlaneGeometry(BOARD_3D_CENTER_EMBLEM_SIZE, BOARD_3D_CENTER_EMBLEM_SIZE),
    divider: new PlaneGeometry(44, 0.045),
  }), []);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  const home = zonePositions.bottomPlayer;
  const away = zonePositions.topPlayer;
  const midX = (home.active.x + away.active.x) / 2;
  const midZ = (home.active.z + away.active.z) / 2;
  const bottomBench = getBenchPositions(bottomBenchSize, PlayerType.BOTTOM_PLAYER, aspect);
  const topBench = getBenchPositions(topBenchSize, PlayerType.TOP_PLAYER, aspect);
  const slotElements: SlotPad[] = [
    { key: 'bottom-active', position: home.active },
    ...bottomBench.map((position, index) => ({
      key: `bottom-bench-${index}`,
      position,
    })),
    { key: 'top-active', position: away.active },
    ...topBench.map((position, index) => ({
      key: `top-bench-${index}`,
      position,
    })),
    { key: 'bottom-supporter', position: home.supporter },
    { key: 'top-supporter', position: away.supporter },
    { key: 'stadium', position: zonePositions.stadium },
    { key: 'bottom-deck', position: home.deck },
    { key: 'bottom-discard', position: home.discard },
    { key: 'top-deck', position: away.deck },
    { key: 'top-discard', position: away.discard },
    ...[home, away].flatMap((player, playerIndex) => {
      const side = playerIndex === 0 ? 'bottom' : 'top';
      return Array.from({ length: 6 }, (_, index) => ({
        key: `${side}-prize-${index}`,
        position: {
          x: player.prizes.x + ((index % 2) - 0.5) * 3,
          y: player.prizes.y,
          z: player.prizes.z + (Math.floor(index / 2) - 1) * 4,
        },
      }));
    }),
  ];

  const emblemMesh = (
    <mesh
      geometry={geometries.emblem}
      material={materials.emblem}
      rotation={[-Math.PI / 2, 0, Math.PI * 2]}
      position={[midX, BOARD_3D_CENTER_EMBLEM_Y, midZ]}
      renderOrder={3}
      receiveShadow={false}
    />
  );

  return (
    <group>
      <mesh geometry={geometries.outer} material={materials.trim} position={[0, -0.42, BOARD_CENTER_Z]} receiveShadow={false} />
      <mesh geometry={geometries.board} material={materials.board} position={[0, -0.32, BOARD_CENTER_Z]} receiveShadow={false} />
      {slotElements.map(({ key, position }) => (
        <ZonePad
          key={key}
          position={[position.x, 0.052, position.z]}
          geometry={geometries.slotFrame}
          material={materials.slotFrame}
        />
      ))}
      {bloomActive ? <Select enabled>{emblemMesh}</Select> : emblemMesh}
    </group>
  );
}
