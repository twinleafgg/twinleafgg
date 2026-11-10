import {
  CUBE_TARGET_SIZE,
  normalizeCubeDefinition,
  type CubeDefinition,
  type CubeDraftRoom,
} from './types';

const CUBES_KEY = 'twinleaf.cubes.v1';
const DRAFTS_KEY = 'twinleaf.cubeDrafts.v1';
const CLIENT_ID_KEY = 'twinleaf.cube.clientId';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let cachedClientId: string | null = null;

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable or full; the UI remains usable for this tab */
  }
}

/** Stable per-tab id. Guests use it as their seat identity in a draft room. */
export function getCubeClientId(): string {
  try {
    // sessionStorage is per tab; read it every time so tests and multi-window
    // harnesses can seed distinct participant ids without a stale module cache.
    const existing = sessionStorage.getItem(CLIENT_ID_KEY);
    if (existing) {
      return existing;
    }
    const created = `c_${randomId()}`;
    sessionStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch {
    if (!cachedClientId) {
      cachedClientId = `c_${randomId()}`;
    }
    return cachedClientId;
  }
}

export function listCubes(): CubeDefinition[] {
  const cubes = readJson<Partial<CubeDefinition>[]>(CUBES_KEY, []);
  if (!Array.isArray(cubes)) {
    return [];
  }
  return cubes
    .filter((c): c is Partial<CubeDefinition> & { id: string } => !!c && typeof c.id === 'string')
    .map(normalizeCubeDefinition);
}

export function getCube(cubeId: string): CubeDefinition | null {
  return listCubes().find((c) => c.id === cubeId) ?? null;
}

export function createCubeDefinition(
  name: string,
  owner: { userId: number | null; name: string },
): CubeDefinition {
  const now = Date.now();
  return {
    id: randomId(),
    name: name.trim(),
    cards: [],
    targetSize: CUBE_TARGET_SIZE,
    startingCards: [],
    mutantEvolution: false,
    ownerUserId: owner.userId,
    ownerName: owner.name,
    createdAt: now,
    updatedAt: now,
  };
}

export function saveCube(cube: CubeDefinition): CubeDefinition {
  const next = normalizeCubeDefinition({ ...cube, updatedAt: Date.now() });
  const cubes = listCubes();
  const index = cubes.findIndex((c) => c.id === cube.id);
  if (index === -1) {
    cubes.push(next);
  } else {
    cubes[index] = next;
  }
  writeJson(CUBES_KEY, cubes);
  return next;
}

export function deleteCube(cubeId: string): void {
  writeJson(
    CUBES_KEY,
    listCubes().filter((c) => c.id !== cubeId),
  );
}

export function duplicateCube(cubeId: string, name: string): CubeDefinition | null {
  const source = getCube(cubeId);
  if (!source) {
    return null;
  }
  const now = Date.now();
  const copy: CubeDefinition = {
    ...source,
    id: randomId(),
    name: name.trim(),
    cards: [...source.cards],
    startingCards: [...source.startingCards],
    createdAt: now,
    updatedAt: now,
  };
  const cubes = listCubes();
  cubes.push(copy);
  writeJson(CUBES_KEY, cubes);
  return copy;
}

function generateDraftCode(existing: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!existing.has(code)) {
      return code;
    }
  }
  return `${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function normalizeDraftRoom(room: CubeDraftRoom): CubeDraftRoom {
  return {
    ...room,
    startingCards: Array.isArray(room.startingCards) ? room.startingCards : [],
    mutantEvolution: Boolean(room.mutantEvolution),
  };
}

export function listDraftRooms(): CubeDraftRoom[] {
  const rooms = readJson<Record<string, CubeDraftRoom>>(DRAFTS_KEY, {});
  if (!rooms || typeof rooms !== 'object') {
    return [];
  }
  return Object.values(rooms)
    .filter(
      (room): room is CubeDraftRoom =>
        !!room && typeof room.id === 'string' && Array.isArray(room.seats),
    )
    .map(normalizeDraftRoom);
}

export function getDraftRoom(code: string): CubeDraftRoom | null {
  const normalized = code.trim().toUpperCase();
  const rooms = readJson<Record<string, CubeDraftRoom>>(DRAFTS_KEY, {});
  const room = rooms?.[normalized];
  return room && typeof room.id === 'string' ? normalizeDraftRoom(room) : null;
}

export function newDraftRoomCode(): string {
  const existing = new Set(listDraftRooms().map((r) => r.id));
  return generateDraftCode(existing);
}

export function saveDraftRoom(room: CubeDraftRoom): void {
  const rooms = readJson<Record<string, CubeDraftRoom>>(DRAFTS_KEY, {});
  const next = { ...rooms, [room.id]: normalizeDraftRoom(room) };
  writeJson(DRAFTS_KEY, next);
}

export function deleteDraftRoom(code: string): void {
  const rooms = readJson<Record<string, CubeDraftRoom>>(DRAFTS_KEY, {});
  const normalized = code.trim().toUpperCase();
  if (!rooms[normalized]) {
    return;
  }
  const next = { ...rooms };
  delete next[normalized];
  writeJson(DRAFTS_KEY, next);
}

/** Notifies the current tab when another tab writes cubes or draft rooms. */
export function subscribeCubeStorage(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CUBES_KEY || event.key === DRAFTS_KEY) {
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
