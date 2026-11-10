import type { CubeDefinition, CubeDraftRoom, CubeDraftSeat } from './types';
import {
  CUBE_MAX_PLAYERS,
  CUBE_MIN_PLAYERS,
  CUBE_PACK_SIZE,
  CUBE_PACKS_PER_PLAYER,
  CUBE_SEAT_STALE_MS,
} from './types';

export type DraftActionResult =
  | { ok: true; room: CubeDraftRoom }
  | { ok: false; error: string };

function ok(room: CubeDraftRoom): DraftActionResult {
  return { ok: true, room };
}

function err(error: string): DraftActionResult {
  return { ok: false, error };
}

/** Small deterministic PRNG so a room's packs can be reproduced from its seed. */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleSeeded<T>(items: T[], seed: string): T[] {
  const next = items.slice();
  const random = mulberry32(hashSeed(seed));
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function draftCardsRequired(players: number): number {
  return players * CUBE_PACK_SIZE * CUBE_PACKS_PER_PLAYER;
}

export function draftPicksPerPlayer(): number {
  return CUBE_PACK_SIZE * CUBE_PACKS_PER_PLAYER;
}

export function createCubeDraftRoom(params: {
  code: string;
  cube: CubeDefinition;
  hostClientId: string;
  hostName: string;
  hostUserId: number | null;
  now?: number;
}): CubeDraftRoom {
  const now = params.now ?? Date.now();
  const host: CubeDraftSeat = {
    clientId: params.hostClientId,
    name: params.hostName,
    userId: params.hostUserId,
    ready: false,
    connected: true,
    lastSeen: now,
    picks: [],
  };
  return {
    id: params.code,
    cubeId: params.cube.id,
    cubeName: params.cube.name,
    startingCards: [...(params.cube.startingCards ?? [])],
    mutantEvolution: Boolean(params.cube.mutantEvolution),
    hostId: params.hostClientId,
    hostHeartbeat: now,
    phase: 'lobby',
    seats: [host],
    packs: [],
    packsBySeat: {},
    round: 0,
    pickInRound: 0,
    pickedThisPass: {},
    log: [],
    cardCount: params.cube.cards.length,
    createdAt: now,
    updatedAt: now,
  };
}

export function joinCubeDraft(
  room: CubeDraftRoom,
  player: { clientId: string; name: string; userId: number | null },
  now: number = Date.now(),
): DraftActionResult {
  const existing = room.seats.find((seat) => seat.clientId === player.clientId);
  if (existing) {
    return ok({
      ...room,
      seats: room.seats.map((seat) =>
        seat.clientId === player.clientId
          ? {
              ...seat,
              name: player.name,
              userId: player.userId,
              connected: true,
              lastSeen: now,
            }
          : seat,
      ),
      updatedAt: now,
    });
  }

  if (room.phase !== 'lobby') {
    return err('This draft has already started.');
  }
  if (room.seats.length >= CUBE_MAX_PLAYERS) {
    return err('This draft room is full.');
  }

  return ok({
    ...room,
    seats: [
      ...room.seats,
      {
        clientId: player.clientId,
        name: player.name,
        userId: player.userId,
        ready: false,
        connected: true,
        lastSeen: now,
        picks: [],
      },
    ],
    updatedAt: now,
  });
}

export function setCubeDraftReady(
  room: CubeDraftRoom,
  clientId: string,
  ready: boolean,
  now: number = Date.now(),
): DraftActionResult {
  if (room.phase !== 'lobby') {
    return err('The draft has already started.');
  }
  if (!room.seats.some((seat) => seat.clientId === clientId)) {
    return err('You are not seated in this draft.');
  }
  return ok({
    ...room,
    seats: room.seats.map((seat) =>
      seat.clientId === clientId ? { ...seat, ready, lastSeen: now, connected: true } : seat,
    ),
    updatedAt: now,
  });
}

export function touchCubeDraftSeat(
  room: CubeDraftRoom,
  clientId: string,
  now: number = Date.now(),
): CubeDraftRoom {
  if (!room.seats.some((seat) => seat.clientId === clientId)) {
    return room;
  }
  return {
    ...room,
    seats: room.seats.map((seat) =>
      seat.clientId === clientId ? { ...seat, connected: true, lastSeen: now } : seat,
    ),
    updatedAt: now,
  };
}

export function refreshDraftConnections(
  room: CubeDraftRoom,
  now: number = Date.now(),
): CubeDraftRoom {
  return {
    ...room,
    seats: room.seats.map((seat) => ({
      ...seat,
      connected: now - seat.lastSeen < CUBE_SEAT_STALE_MS,
    })),
  };
}

export function leaveCubeDraft(
  room: CubeDraftRoom,
  clientId: string,
  now: number = Date.now(),
): DraftActionResult {
  const seat = room.seats.find((s) => s.clientId === clientId);
  if (!seat) {
    return ok(room);
  }

  if (room.phase === 'lobby') {
    return ok({
      ...room,
      seats: room.seats.filter((s) => s.clientId !== clientId),
      updatedAt: now,
    });
  }

  return ok({
    ...room,
    seats: room.seats.map((s) =>
      s.clientId === clientId ? { ...s, connected: false, lastSeen: 0 } : s,
    ),
    updatedAt: now,
  });
}

export function transferDraftHost(
  room: CubeDraftRoom,
  clientId: string,
  now: number = Date.now(),
): CubeDraftRoom {
  return {
    ...room,
    hostId: clientId,
    hostHeartbeat: now,
    updatedAt: now,
    seats: room.seats.map((seat) =>
      seat.clientId === clientId ? { ...seat, connected: true, lastSeen: now } : seat,
    ),
  };
}

export function nextDraftHost(room: CubeDraftRoom, leavingClientId: string): string | null {
  const candidates = room.seats.filter((seat) => seat.clientId !== leavingClientId);
  const connected = candidates.find((seat) => seat.connected);
  return (connected ?? candidates[0])?.clientId ?? null;
}

export function checkDraftCanStart(room: CubeDraftRoom, cubeCardCount: number): string | null {
  if (room.phase !== 'lobby') {
    return 'The draft has already started.';
  }
  if (room.seats.length < CUBE_MIN_PLAYERS) {
    return `At least ${CUBE_MIN_PLAYERS} players are needed.`;
  }
  if (!room.seats.every((seat) => seat.ready)) {
    return 'Every player must be ready.';
  }
  const needed = draftCardsRequired(room.seats.length);
  if (cubeCardCount < needed) {
    return `This cube needs ${needed} cards for ${room.seats.length} players, but only has ${cubeCardCount}.`;
  }
  return null;
}

function dealPacks(cards: string[], playerCount: number, seed: string): string[][] {
  // Preserve duplicates so multi-copy cubes can put several of the same printing in play.
  const poolCards = cards.filter(Boolean);
  const packCount = playerCount * CUBE_PACKS_PER_PLAYER;
  const pool = shuffleSeeded(poolCards, seed).slice(0, packCount * CUBE_PACK_SIZE);
  const packs: string[][] = [];
  for (let i = 0; i < packCount; i++) {
    packs.push(pool.slice(i * CUBE_PACK_SIZE, (i + 1) * CUBE_PACK_SIZE));
  }
  return packs;
}

function dealRound(room: CubeDraftRoom, round: number): Record<string, string[]> {
  const playerCount = room.seats.length;
  const bySeat: Record<string, string[]> = {};
  room.seats.forEach((seat, index) => {
    bySeat[seat.clientId] = room.packs[(round - 1) * playerCount + index] ?? [];
  });
  return bySeat;
}

function resetPassFlags(room: CubeDraftRoom): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const seat of room.seats) {
    flags[seat.clientId] = false;
  }
  return flags;
}

/**
 * Called once every seat has picked a card from its current pack. Packs rotate in
 * alternating directions (rounds 1 and 3 pass left, round 2 passes right).
 */
function advancePass(room: CubeDraftRoom, now: number): CubeDraftRoom {
  const seats = room.seats;
  const anyCardsLeft = seats.some(
    (seat) => (room.packsBySeat[seat.clientId]?.length ?? 0) > 0,
  );

  if (!anyCardsLeft) {
    if (room.round >= CUBE_PACKS_PER_PLAYER) {
      return {
        ...room,
        phase: 'complete',
        pickInRound: CUBE_PACK_SIZE,
        pickedThisPass: resetPassFlags(room),
        completedAt: now,
        updatedAt: now,
      };
    }
    const round = room.round + 1;
    return {
      ...room,
      round,
      pickInRound: 0,
      pickedThisPass: resetPassFlags(room),
      packsBySeat: dealRound(room, round),
      updatedAt: now,
    };
  }

  const direction = room.round % 2 === 1 ? 1 : -1;
  const playerCount = seats.length;
  const rotated: Record<string, string[]> = {};
  seats.forEach((seat, index) => {
    const source = seats[(index - direction + playerCount) % playerCount];
    rotated[seat.clientId] = room.packsBySeat[source.clientId] ?? [];
  });

  return {
    ...room,
    pickInRound: Math.min(CUBE_PACK_SIZE, room.pickInRound + 1),
    pickedThisPass: resetPassFlags(room),
    packsBySeat: rotated,
    updatedAt: now,
  };
}

export function startCubeDraft(
  room: CubeDraftRoom,
  cards: string[],
  now: number = Date.now(),
): DraftActionResult {
  if (room.phase !== 'lobby') {
    return err('The draft has already started.');
  }

  const seats = room.seats.filter((seat) => seat.connected);
  if (seats.length < CUBE_MIN_PLAYERS) {
    return err(`At least ${CUBE_MIN_PLAYERS} connected players are needed.`);
  }
  if (!seats.every((seat) => seat.ready)) {
    return err('Every player must be ready.');
  }

  const needed = draftCardsRequired(seats.length);
  const poolCards = cards.filter(Boolean);
  if (poolCards.length < needed) {
    return err(
      `This cube needs ${needed} cards for ${seats.length} players, but only has ${poolCards.length}.`,
    );
  }

  const base: CubeDraftRoom = {
    ...room,
    seats,
    phase: 'drafting',
    packs: [],
    packsBySeat: {},
    round: 1,
    pickInRound: 0,
    pickedThisPass: resetPassFlags({ ...room, seats }),
    log: [],
    completedAt: undefined,
    updatedAt: now,
  };
  const packs = dealPacks(poolCards, seats.length, `${room.id}:${now}`);
  const started: CubeDraftRoom = { ...base, packs };
  return ok({
    ...started,
    packsBySeat: dealRound(started, 1),
  });
}

export function pickCubeDraftCard(
  room: CubeDraftRoom,
  clientId: string,
  cardFullName: string,
  now: number = Date.now(),
): DraftActionResult {
  if (room.phase !== 'drafting') {
    return err('The draft is not in progress.');
  }
  const seat = room.seats.find((s) => s.clientId === clientId);
  if (!seat) {
    return err('You are not seated in this draft.');
  }
  if (room.pickedThisPass[clientId]) {
    return err('Wait for the other players to pick before choosing again.');
  }

  const pack = room.packsBySeat[clientId] ?? [];
  const cardIndex = pack.indexOf(cardFullName);
  if (cardIndex === -1) {
    return err('That card is not in your pack.');
  }

  const nextPack = pack.slice(0, cardIndex).concat(pack.slice(cardIndex + 1));
  const pickNumber = seat.picks.length + 1;

  const picked: CubeDraftRoom = {
    ...room,
    seats: room.seats.map((s) =>
      s.clientId === clientId ? { ...s, picks: [...s.picks, cardFullName] } : s,
    ),
    packsBySeat: {
      ...room.packsBySeat,
      [clientId]: nextPack,
    },
    pickedThisPass: {
      ...room.pickedThisPass,
      [clientId]: true,
    },
    log: [
      ...room.log,
      {
        round: room.round,
        pick: pickNumber,
        clientId,
        playerName: seat.name,
        cardFullName,
        at: now,
      },
    ],
    updatedAt: now,
  };

  const everyonePicked = picked.seats.every((s) => picked.pickedThisPass[s.clientId]);
  return ok(everyonePicked ? advancePass(picked, now) : picked);
}

export function seatById(room: CubeDraftRoom, clientId: string): CubeDraftSeat | undefined {
  return room.seats.find((seat) => seat.clientId === clientId);
}

export function isPickOpen(room: CubeDraftRoom, clientId: string): boolean {
  return room.phase === 'drafting' && !room.pickedThisPass[clientId];
}

export function roomNeedsCards(room: CubeDraftRoom, cubeCardCount: number): boolean {
  return cubeCardCount < draftCardsRequired(room.seats.length);
}
