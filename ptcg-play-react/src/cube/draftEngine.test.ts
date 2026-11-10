import { describe, expect, it } from 'vitest';
import type { CubeDefinition } from './types';
import { CUBE_PACK_SIZE, CUBE_PACKS_PER_PLAYER, type CubeDraftRoom } from './types';
import {
  checkDraftCanStart,
  createCubeDraftRoom,
  draftCardsRequired,
  joinCubeDraft,
  pickCubeDraftCard,
  setCubeDraftReady,
  startCubeDraft,
} from './draftEngine';

function makeCube(cardCount = 400, extras: Partial<CubeDefinition> = {}): CubeDefinition {
  return {
    id: 'cube-1',
    name: 'Test Cube',
    cards: Array.from({ length: cardCount }, (_, i) => `Card ${i} TEST ${i + 1}`),
    targetSize: 360,
    startingCards: [],
    mutantEvolution: false,
    ownerUserId: 1,
    ownerName: 'Host',
    createdAt: 1,
    updatedAt: 1,
    ...extras,
  };
}

function readyLobby(playerCount: number, cards = 400): CubeDraftRoom {
  let room = createCubeDraftRoom({
    code: 'ABC123',
    cube: makeCube(cards),
    hostClientId: 'p0',
    hostName: 'P0',
    hostUserId: 1,
    now: 1000,
  });
  for (let i = 1; i < playerCount; i++) {
    const joined = joinCubeDraft(room, {
      clientId: `p${i}`,
      name: `P${i}`,
      userId: i + 1,
    });
    expect(joined.ok).toBe(true);
    if (joined.ok) {
      room = joined.room;
    }
  }
  for (const seat of room.seats) {
    const result = setCubeDraftReady(room, seat.clientId, true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      room = result.room;
    }
  }
  return room;
}

function startedRoom(playerCount: number, cards = 400): CubeDraftRoom {
  const lobby = readyLobby(playerCount, cards);
  const started = startCubeDraft(lobby, makeCube(cards).cards, 5000);
  expect(started.ok).toBe(true);
  if (!started.ok) {
    throw new Error(started.error);
  }
  return started.room;
}

function pickFirst(room: CubeDraftRoom, clientId: string): CubeDraftRoom {
  const pack = room.packsBySeat[clientId] ?? [];
  const result = pickCubeDraftCard(room, clientId, pack[0], 6000);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.room;
}

function draftUntilComplete(room: CubeDraftRoom): CubeDraftRoom {
  let current = room;
  let guard = 0;
  while (current.phase === 'drafting' && guard < 2000) {
    guard++;
    for (const seat of current.seats) {
      if (current.phase !== 'drafting') {
        break;
      }
      if (current.pickedThisPass[seat.clientId]) {
        continue;
      }
      const pack = current.packsBySeat[seat.clientId] ?? [];
      if (pack.length === 0) {
        continue;
      }
      current = pickFirst(current, seat.clientId);
    }
  }
  return current;
}

describe('cube draft engine', () => {
  it('creates a lobby with the host seated', () => {
    const room = createCubeDraftRoom({
      code: 'ABC123',
      cube: makeCube(400, {
        startingCards: ['Lillie\'s Determination TEF 176'],
        mutantEvolution: true,
      }),
      hostClientId: 'host',
      hostName: 'Host',
      hostUserId: 9,
      now: 100,
    });
    expect(room.id).toBe('ABC123');
    expect(room.phase).toBe('lobby');
    expect(room.seats).toHaveLength(1);
    expect(room.seats[0].clientId).toBe('host');
    expect(room.startingCards).toEqual(['Lillie\'s Determination TEF 176']);
    expect(room.mutantEvolution).toBe(true);
  });

  it('keeps duplicate printings in the draft pool', () => {
    const duplicates = Array.from({ length: 90 }, () => 'Same Card TST 1');
    const lobby = readyLobby(2, 90);
    const started = startCubeDraft(lobby, duplicates, 5000);
    expect(started.ok).toBe(true);
    if (!started.ok) {
      throw new Error(started.error);
    }
    const dealt = started.room.packs.flat();
    expect(dealt).toHaveLength(90);
    expect(dealt.every((name) => name === 'Same Card TST 1')).toBe(true);
  });

  it('requires at least two ready players and enough cards', () => {
    const solo = readyLobby(1);
    expect(checkDraftCanStart(solo, 400)).not.toBeNull();
    expect(startCubeDraft(solo, makeCube().cards).ok).toBe(false);

    const notReady = readyLobby(2);
    const unready = setCubeDraftReady(notReady, 'p1', false);
    expect(unready.ok).toBe(true);
    if (unready.ok) {
      expect(startCubeDraft(unready.room, makeCube().cards).ok).toBe(false);
    }

    const smallCube = readyLobby(2, draftCardsRequired(2) - 1);
    const tooSmall = startCubeDraft(smallCube, makeCube(draftCardsRequired(2) - 1).cards);
    expect(tooSmall.ok).toBe(false);
  });

  it('deals one 15-card pack per player for each round', () => {
    const room = startedRoom(2);
    expect(room.phase).toBe('drafting');
    expect(room.round).toBe(1);
    expect(room.packs).toHaveLength(2 * CUBE_PACKS_PER_PLAYER);
    expect(room.packs.every((pack) => pack.length === CUBE_PACK_SIZE)).toBe(true);
    expect(room.packsBySeat['p0']).toHaveLength(CUBE_PACK_SIZE);
    expect(room.packsBySeat['p1']).toHaveLength(CUBE_PACK_SIZE);
  });

  it('rejects cards that are not in the pack and second picks in the same pass', () => {
    let room = startedRoom(2);
    const missing = pickCubeDraftCard(room, 'p0', 'Not a card');
    expect(missing.ok).toBe(false);

    room = pickFirst(room, 'p0');
    const again = pickCubeDraftCard(room, 'p0', room.packsBySeat['p0'][0]);
    expect(again.ok).toBe(false);

    // Still waiting on p1, so the same pack stays in front of p0.
    expect(room.pickedThisPass['p0']).toBe(true);
    expect(room.pickInRound).toBe(0);
  });

  it('passes left in round 1 after every seat has picked', () => {
    let room = startedRoom(3);
    const before = room.packsBySeat;
    for (const seat of room.seats) {
      room = pickFirst(room, seat.clientId);
    }
    expect(room.round).toBe(1);
    expect(room.pickInRound).toBe(1);
    expect(room.packsBySeat['p0']).toEqual(before['p2'].slice(1));
    expect(room.packsBySeat['p1']).toEqual(before['p0'].slice(1));
    expect(room.pickedThisPass).toEqual({ p0: false, p1: false, p2: false });
  });

  it('passes right in round 2', () => {
    let room = startedRoom(3);
    while (room.phase === 'drafting' && room.round < 2) {
      for (const seat of room.seats) {
        if (room.round >= 2) {
          break;
        }
        if (!room.pickedThisPass[seat.clientId]) {
          room = pickFirst(room, seat.clientId);
        }
      }
    }
    expect(room.round).toBe(2);
    expect(room.pickInRound).toBe(0);

    const before = room.packsBySeat;
    for (const seat of room.seats) {
      room = pickFirst(room, seat.clientId);
    }
    expect(room.round).toBe(2);
    expect(room.packsBySeat['p0']).toEqual(before['p1'].slice(1));
    expect(room.packsBySeat['p2']).toEqual(before['p0'].slice(1));
  });

  it('completes after 45 picks per player', () => {
    const room = draftUntilComplete(startedRoom(3));
    expect(room.phase).toBe('complete');
    expect(room.round).toBe(CUBE_PACKS_PER_PLAYER);
    expect(room.seats.every((seat) => seat.picks.length === 45)).toBe(true);
    expect(room.log).toHaveLength(135);
    expect(room.seats.flatMap((seat) => seat.picks)).toHaveLength(135);
  });

  it('lets an existing seat reconnect during the draft', () => {
    let room = startedRoom(2);
    room = pickFirst(room, 'p0');
    const rejoin = joinCubeDraft(room, { clientId: 'p0', name: 'P0 renamed', userId: 1 });
    expect(rejoin.ok).toBe(true);
    if (rejoin.ok) {
      expect(rejoin.room.seats.find((seat) => seat.clientId === 'p0')?.picks).toHaveLength(1);
      expect(rejoin.room.seats.find((seat) => seat.clientId === 'p0')?.name).toBe('P0 renamed');
    }

    const lateJoin = joinCubeDraft(room, { clientId: 'p9', name: 'Late', userId: 9 });
    expect(lateJoin.ok).toBe(false);
  });
});
