import type { Card } from 'ptcg-server';
import type { BoardCardLocation, BoardSnapshot, PlayerSnapshot } from './boardSnapshot';

export type PileZone = 'discard' | 'lostzone';

export type PileOrigin =
  | { kind: 'hand' }
  | { kind: 'deck' }
  | { kind: 'board'; loc: BoardCardLocation }
  | { kind: 'stadium' };

export type DrawSource = { kind: 'deck' } | { kind: 'prize'; grid: number };

export interface DrawCard {
  /** Real card id, or null when the hand is hidden from the viewer. */
  cardId: number | null;
  /** Index in the next state's hand. */
  handIndex: number;
  source: DrawSource;
}

export type TransitionStep =
  | { kind: 'trainerToPlayZone'; playerId: number; cardId: number; preFlown: boolean }
  | {
      kind: 'toPile';
      playerId: number;
      zone: PileZone;
      /** In pile order, so the pile grows exactly as the server ordered it. */
      cards: { cardId: number; origin: PileOrigin }[];
    }
  | {
      kind: 'boardGhostToPile';
      playerId: number;
      zone: PileZone;
      loc: BoardCardLocation;
      cardIds: number[];
    }
  | { kind: 'handToDeck'; playerId: number; cardIds: number[] | null; count: number }
  | {
      kind: 'draw';
      playerId: number;
      cards: DrawCard[];
      turnBegin: boolean;
      /** Opening deal / mulligan redraw during GamePhase.SETUP. */
      setupDeal?: boolean;
      /**
       * ShowCardsPrompt faces to reveal during this draw (upgrade opponent/hidden draws
       * to the full stage-flip path).
       */
      revealCardIds?: number[];
    }
  | {
      kind: 'setupReveal';
      /** Active first, then bench indices ascending; both seats flip each wave together. */
      waves: { slot: 'active' | 'bench'; index: number }[];
    }
  | { kind: 'trainerToDiscard'; playerId: number; cardId: number; zone: PileZone }
  | {
      kind: 'pokemonToBoard';
      playerId: number;
      cardId: number;
      loc: BoardCardLocation;
      source: 'hand' | 'deck';
      /** Setup placement: land face-down (revealed later by setupReveal). */
      setupFaceDown?: boolean;
    }
  | {
      kind: 'energyAttach';
      playerId: number;
      cardId: number;
      /** Host Pokémon slot (same slot/index as the attached energy). */
      loc: BoardCardLocation;
      source: 'hand' | 'deck';
    }
  | {
      kind: 'attack';
      playerId: number;
      /** Damage added to the opponent's Active this tick (0 if none / self-target). */
      damageDealt: number;
    }
  | {
      kind: 'coinFlip';
      playerId: number;
      heads: boolean;
    }
  | {
      kind: 'showCards';
      /** Card ids not already covered by a reveal draw this frame. */
      cardIds: number[];
      /**
       * When cards have not relocated yet (show-before-move) or sit in a secret zone,
       * prefer this destination for the stage→dest flight.
       */
      destinationHint?: 'deck' | 'hand';
    };

export interface PlayerTransition {
  playerId: number;
  /** Both snapshots carry real hand ids for this player. */
  realHand: boolean;
  /** Hand cards that leave without a flight (played to board, etc.); real-hand mode. */
  handPreTrimIds: number[];
  /** Same as {@link handPreTrimIds} for hidden hands (taken from the end of the row). */
  handPreTrimCount: number;
}

export interface TransitionPlan {
  steps: TransitionStep[];
  players: Map<number, PlayerTransition>;
  /** Union of ShowCardsPrompt card ids for this frame (may be empty). */
  showCardsRevealIds?: ReadonlySet<number>;
  /** Card objects from ShowCardsPrompt(s) for scan textures during reveal flights. */
  showCardsById?: ReadonlyMap<number, Card>;
  /** Owner of each revealed card (whose deck/hand the 3D flight should use). */
  showCardsSourcePlayerById?: ReadonlyMap<number, number>;
}

export interface PlanContext {
  /** Cards the local player already flew onto the play zone by dragging. */
  preFlownCardIds?: ReadonlySet<number>;
  /**
   * Cards that left a player's deck with no tracked destination (e.g. ChooseCardsPrompt
   * temp lists). Mutable across frames so the resolve tick can still emit a draw.
   */
  deckLimboByPlayer?: Map<number, number>;
  /** Card ids from unresolved ShowCardsPrompt(s) the local client must reveal. */
  showCardsRevealIds?: readonly number[];
  /**
   * Hint when ShowCards fires before the move lands in state (or cards go to a secret
   * zone). Derived from a resolved ChooseCardsPrompt message when available.
   */
  showCardsDestinationHint?: 'deck' | 'hand';
  /**
   * Emit hand/deck → board Pokémon entrance flights.
   * Live games use socket entrance events instead; enable for replays.
   */
  animatePokemonEntrances?: boolean;
}

type ZoneName = 'hand' | 'discard' | 'lostzone' | 'supporter' | 'stadium' | 'board' | 'prize';

interface CardLocation {
  playerId: number;
  zone: ZoneName;
  loc?: BoardCardLocation;
  grid?: number;
}

const STEP_ORDER: TransitionStep['kind'][] = [
  'trainerToPlayZone',
  'toPile',
  'boardGhostToPile',
  'handToDeck',
  'setupReveal',
  'draw',
  'trainerToDiscard',
  'pokemonToBoard',
  'energyAttach',
  // attack / coinFlip are appended in log order after per-player steps
  'showCards',
];

function indexLocations(snapshot: BoardSnapshot): Map<number, CardLocation> {
  const out = new Map<number, CardLocation>();
  for (const p of snapshot.players.values()) {
    const put = (id: number, loc: CardLocation) => {
      if (!out.has(id)) {
        out.set(id, loc);
      }
    };
    for (const [id, loc] of p.boardCards) {
      put(id, { playerId: p.playerId, zone: 'board', loc });
    }
    p.supporterIds.forEach((id) => put(id, { playerId: p.playerId, zone: 'supporter' }));
    p.stadiumIds.forEach((id) => put(id, { playerId: p.playerId, zone: 'stadium' }));
    p.discardIds.forEach((id) => put(id, { playerId: p.playerId, zone: 'discard' }));
    p.lostzoneIds.forEach((id) => put(id, { playerId: p.playerId, zone: 'lostzone' }));
    p.handIds?.forEach((id) => put(id, { playerId: p.playerId, zone: 'hand' }));
    p.prizeIds.forEach((id, grid) => {
      if (id != null) {
        put(id, { playerId: p.playerId, zone: 'prize', grid });
      }
    });
  }
  return out;
}

function boardLocKey(loc: BoardCardLocation): string {
  return `${loc.slot}:${loc.index}`;
}

function slotHadTopPokemon(player: PlayerSnapshot, loc: BoardCardLocation): boolean {
  for (const existing of player.boardCards.values()) {
    if (existing.isTopPokemon && boardLocKey(existing) === boardLocKey(loc)) {
      return true;
    }
  }
  return false;
}

function emptiedPrizeSlots(prev: PlayerSnapshot, next: PlayerSnapshot): number[] {
  const out: number[] = [];
  for (let g = 0; g < prev.prizeOccupied.length; g++) {
    if (prev.prizeOccupied[g] && !next.prizeOccupied[g]) {
      out.push(g);
    }
  }
  return out;
}

interface PlayerPlanResult {
  steps: TransitionStep[];
  transition: PlayerTransition;
}

/**
 * Multiset diff of play-log trainer names. Snapshots may carry the full untrimmed
 * log history; only names that appear more often in `next` than `prev` are new plays.
 */
function newPlayedTrainerNames(prev: string[], next: string[]): string[] {
  const left = new Map<string, number>();
  for (const n of prev) {
    left.set(n, (left.get(n) ?? 0) + 1);
  }
  const out: string[] = [];
  for (const n of next) {
    const c = left.get(n) ?? 0;
    if (c > 0) {
      left.set(n, c - 1);
    } else {
      out.push(n);
    }
  }
  return out;
}

function planPlayer(
  prevSnap: BoardSnapshot,
  nextSnap: BoardSnapshot,
  prevLocs: Map<number, CardLocation>,
  nextLocs: Map<number, CardLocation>,
  P: PlayerSnapshot,
  N: PlayerSnapshot,
  ctx: PlanContext,
): PlayerPlanResult {
  const playerId = N.playerId;
  const realHand = P.handIds != null && N.handIds != null;
  const transition: PlayerTransition = {
    playerId,
    realHand,
    handPreTrimIds: [],
    handPreTrimCount: 0,
  };
  const steps: TransitionStep[] = [];

  /** Setup→turn handoff snaps board/trainer churn; setup itself still deals/mulligans. */
  const leavingSetup = prevSnap.isSetup && !nextSnap.isSetup;
  const inSetup = nextSnap.isSetup;
  /** During setup, only hand↔deck flights matter (no trainer/pile/board ghosts). */
  const suppressBoardSteps = leavingSetup || inSetup;

  const prevHandSet = new Set(P.handIds ?? []);
  const nextHandSet = new Set(N.handIds ?? []);
  const preFlown = ctx.preFlownCardIds ?? new Set<number>();
  const limboMap = ctx.deckLimboByPlayer;
  const limboIn = limboMap?.get(playerId) ?? 0;

  /** Where a card was before, from the perspective of "did it come out of a hidden zone". */
  const prevOrigin = (id: number): CardLocation | undefined => prevLocs.get(id);
  const cameFromHiddenOrHand = (id: number): boolean => {
    const loc = prevOrigin(id);
    return loc == null || (loc.zone === 'hand' && loc.playerId === playerId);
  };

  // --- Played trainers -------------------------------------------------------
  const playedToZone = new Set<number>();
  const trainerToDiscard: { cardId: number; zone: PileZone }[] = [];
  const prevSupporter = new Set(P.supporterIds);
  const nextSupporter = new Set(N.supporterIds);
  const prevStadium = new Set(P.stadiumIds);

  for (const id of N.supporterIds) {
    if (!prevSupporter.has(id) && cameFromHiddenOrHand(id)) {
      playedToZone.add(id);
    }
  }

  // Stadiums land in player.stadium, never the Item/Supporter play zone.
  const stadiumArrivals: number[] = [];
  for (const id of N.stadiumIds) {
    if (!prevStadium.has(id) && cameFromHiddenOrHand(id)) {
      stadiumArrivals.push(id);
    }
  }

  const names = newPlayedTrainerNames(P.playedTrainerNames, N.playedTrainerNames);
  const consumeName = (id: number): boolean => {
    const name = nextSnap.cardNames.get(id);
    const i = name != null ? names.indexOf(name) : -1;
    if (i < 0) {
      return false;
    }
    names.splice(i, 1);
    return true;
  };
  for (const id of playedToZone) {
    consumeName(id);
  }
  // Consume stadium play logs so they cannot match a later discard as an Item play.
  for (const id of stadiumArrivals) {
    consumeName(id);
  }

  const pileArrivals = (zone: PileZone): number[] => {
    const prevIds = new Set(zone === 'discard' ? P.discardIds : P.lostzoneIds);
    const nextIds = zone === 'discard' ? N.discardIds : N.lostzoneIds;
    return nextIds.filter((id) => !prevIds.has(id));
  };
  const arrivalsByZone: Record<PileZone, number[]> = {
    discard: pileArrivals('discard'),
    lostzone: pileArrivals('lostzone'),
  };

  // Trainers that resolved within a single server tick never appear on the play zone.
  for (const zone of ['discard', 'lostzone'] as const) {
    const candidates = arrivalsByZone[zone].filter(
      (id) => nextSnap.trainerIds.has(id) && cameFromHiddenOrHand(id),
    );
    for (let i = candidates.length - 1; i >= 0; i--) {
      const id = candidates[i];
      if (preFlown.has(id) || consumeName(id)) {
        playedToZone.add(id);
        trainerToDiscard.push({ cardId: id, zone });
      }
    }
  }

  for (const id of P.supporterIds) {
    if (nextSupporter.has(id)) {
      continue;
    }
    const loc = nextLocs.get(id);
    if (loc?.playerId === playerId && (loc.zone === 'discard' || loc.zone === 'lostzone')) {
      trainerToDiscard.push({ cardId: id, zone: loc.zone });
    }
  }
  const trainerToDiscardIds = new Set(trainerToDiscard.map((t) => t.cardId));

  // --- Pile arrivals ---------------------------------------------------------
  type PileCard = { cardId: number; origin: PileOrigin | 'hidden' | null; zone: PileZone };
  const pileCards: PileCard[] = [];
  const ghostGroups = new Map<string, { loc: BoardCardLocation; zone: PileZone; cardIds: number[] }>();

  for (const zone of ['discard', 'lostzone'] as const) {
    for (const id of arrivalsByZone[zone]) {
      if (trainerToDiscardIds.has(id)) {
        continue;
      }
      const loc = prevOrigin(id);
      if (loc == null) {
        pileCards.push({ cardId: id, origin: 'hidden', zone });
      } else if (loc.zone === 'hand' && loc.playerId === playerId) {
        pileCards.push({ cardId: id, origin: { kind: 'hand' }, zone });
      } else if (loc.zone === 'board' && loc.loc) {
        const prevPlayer = prevSnap.players.get(loc.playerId);
        let topId: number | undefined;
        for (const [cid, l] of prevPlayer?.boardCards ?? []) {
          if (l.isTopPokemon && boardLocKey(l) === boardLocKey(loc.loc)) {
            topId = cid;
          }
        }
        const topZone = topId != null ? nextLocs.get(topId)?.zone : undefined;
        // Only a Pokémon that itself went to a pile (Knock Out) flies as a whole ghost.
        if ((topZone === 'discard' || topZone === 'lostzone') && loc.playerId === playerId) {
          const key = boardLocKey(loc.loc);
          const groupZone: PileZone = topZone;
          if (groupZone === zone) {
            const group = ghostGroups.get(key) ?? { loc: loc.loc, zone, cardIds: [] };
            group.cardIds.push(id);
            ghostGroups.set(key, group);
            continue;
          }
        }
        pileCards.push({ cardId: id, origin: { kind: 'board', loc: loc.loc }, zone });
      } else if (loc.zone === 'stadium') {
        pileCards.push({ cardId: id, origin: { kind: 'stadium' }, zone });
      } else {
        pileCards.push({ cardId: id, origin: null, zone });
      }
    }
  }

  // --- Pokémon board entrances (replay) --------------------------------------
  // Live games animate these via socket events; replays only have snapshot diffs.
  // Setup placements are included (face-down); leave-setup uses setupReveal instead.
  const pokemonToBoard: Extract<TransitionStep, { kind: 'pokemonToBoard' }>[] = [];
  const pokemonToBoardIds = new Set<number>();
  const energyAttach: Extract<TransitionStep, { kind: 'energyAttach' }>[] = [];
  const energyAttachIds = new Set<number>();
  if (ctx.animatePokemonEntrances && !leavingSetup) {
    for (const [id, loc] of N.boardCards) {
      if (!loc.isTopPokemon || P.boardCards.has(id) || slotHadTopPokemon(P, loc)) {
        continue;
      }
      const prev = prevOrigin(id);
      let source: 'hand' | 'deck' | null = null;
      if (prev?.zone === 'hand' && prev.playerId === playerId) {
        source = 'hand';
      } else if (prev == null) {
        // Deck cards are not indexed in snapshots; Nest Ball / similar land as unknown→board.
        source = 'deck';
      }
      if (source == null) {
        continue;
      }
      pokemonToBoard.push({
        kind: 'pokemonToBoard',
        playerId,
        cardId: id,
        loc,
        source,
        ...(inSetup ? { setupFaceDown: true as const } : {}),
      });
      pokemonToBoardIds.add(id);
    }

    // Energy attachments (mid-game only — setup has no energy plays).
    if (!inSetup) {
      for (const [id, loc] of N.boardCards) {
        if (P.boardCards.has(id) || pokemonToBoardIds.has(id)) {
          continue;
        }
        if (!nextSnap.energyIds.has(id)) {
          continue;
        }
        const prev = prevOrigin(id);
        let source: 'hand' | 'deck' | null = null;
        if (prev?.zone === 'hand' && prev.playerId === playerId) {
          source = 'hand';
        } else if (prev == null) {
          source = 'deck';
        }
        if (source == null) {
          continue;
        }
        energyAttach.push({ kind: 'energyAttach', playerId, cardId: id, loc, source });
        energyAttachIds.add(id);
      }
    }
  }
  const deckToBoardCount =
    pokemonToBoard.filter((p) => p.source === 'deck').length +
    energyAttach.filter((e) => e.source === 'deck').length;

  // --- Hand bookkeeping ------------------------------------------------------
  const emptied = emptiedPrizeSlots(P, N);
  const handToDeckIds: number[] = [];
  let handToDeckCount = 0;
  const draws: DrawCard[] = [];
  let deckToPileCount = 0;

  if (realHand) {
    for (const pc of pileCards) {
      if (pc.origin === 'hidden') {
        pc.origin = { kind: 'deck' };
        deckToPileCount++;
      }
    }

    const removed = P.handIds!.filter((id) => !nextHandSet.has(id));
    const flownFromHand = new Set<number>([
      ...[...playedToZone].filter((id) => prevHandSet.has(id)),
      ...stadiumArrivals.filter((id) => prevHandSet.has(id)),
      ...pileCards
        .filter((pc) => pc.origin && pc.origin !== 'hidden' && pc.origin.kind === 'hand')
        .map((pc) => pc.cardId),
      ...[...pokemonToBoardIds].filter((id) => prevHandSet.has(id)),
      ...[...energyAttachIds].filter((id) => prevHandSet.has(id)),
    ]);
    for (const id of removed) {
      if (flownFromHand.has(id)) {
        // Stadiums are trimmed from the hand row; syncSharedStadium owns the board mesh.
        if (stadiumArrivals.includes(id)) {
          transition.handPreTrimIds.push(id);
        }
        continue;
      }
      if (!nextLocs.has(id)) {
        handToDeckIds.push(id);
      } else {
        transition.handPreTrimIds.push(id);
      }
    }
    handToDeckCount = handToDeckIds.length;

    const usedGrids = new Set<number>();
    const unknown: { cardId: number; handIndex: number }[] = [];
    N.handIds!.forEach((id, handIndex) => {
      if (prevHandSet.has(id)) {
        return;
      }
      const loc = prevOrigin(id);
      if (loc?.zone === 'prize' && loc.playerId === playerId && loc.grid != null) {
        usedGrids.add(loc.grid);
        draws.push({ cardId: id, handIndex, source: { kind: 'prize', grid: loc.grid } });
      } else if (loc == null) {
        unknown.push({ cardId: id, handIndex });
      }
    });
    const freeGrids = emptied.filter((g) => !usedGrids.has(g));
    const rawDeck = P.deckCount + handToDeckCount - N.deckCount - deckToPileCount - deckToBoardCount;
    let deckBudget = Math.max(0, rawDeck + limboIn);
    let drawnFromDeck = 0;
    for (const u of unknown) {
      if (freeGrids.length > 0) {
        draws.push({ ...u, source: { kind: 'prize', grid: freeGrids.shift()! } });
      } else if (deckBudget > 0) {
        deckBudget--;
        drawnFromDeck++;
        draws.push({ ...u, source: { kind: 'deck' } });
      }
    }
    if (limboMap) {
      limboMap.set(playerId, Math.max(0, limboIn + rawDeck - drawnFromDeck));
    }
  } else {
    // Hidden hand on at least one side: solve with counts only.
    const isHandOrigin = (pc: PileCard) =>
      pc.origin !== null && pc.origin !== 'hidden' && pc.origin.kind === 'hand';
    const trainersFromHand = playedToZone.size;
    const hiddenPile = pileCards.filter((pc) => pc.origin === 'hidden' || isHandOrigin(pc));
    // Board Pokémon entrances are animated separately when enabled; still count for budgets.
    const hiddenBoard = [...N.boardCards.keys()].filter(
      (id) => cameFromHiddenOrHand(id) && !pokemonToBoardIds.has(id),
    ).length;
    const hiddenStadium = N.stadiumIds.filter(
      (id) => !P.stadiumIds.includes(id) && cameFromHiddenOrHand(id),
    ).length;
    const pokemonFromHand = pokemonToBoard.filter((p) => p.source === 'hand').length;
    const energyFromHand = energyAttach.filter((e) => e.source === 'hand').length;
    const arrivals =
      trainersFromHand +
      hiddenPile.length +
      hiddenBoard +
      hiddenStadium +
      pokemonFromHand +
      energyFromHand +
      deckToBoardCount;

    const g = N.handCount - P.handCount - emptied.length;
    // Prefer trainers, pile cards, and hand→board Pokémon from hand; rest from the deck.
    const x = Math.min(
      arrivals,
      P.handCount,
      Math.max(trainersFromHand + hiddenPile.length + pokemonFromHand + energyFromHand, -g),
    );
    let d = 0;
    let t = 0;
    if (g + x >= 0) {
      d = g + x;
    } else {
      t = -(g + x);
    }
    const deckToVisible = arrivals - x;
    const deckDelta = N.deckCount - P.deckCount;
    t = Math.min(t, Math.max(0, deckDelta + deckToVisible));
    const rawDeckLoss = P.deckCount - N.deckCount + t - deckToVisible;
    const deckLoss = Math.max(0, rawDeckLoss + limboIn);
    d = Math.min(d, deckLoss);
    const drawnFromDeck = Math.max(0, d);
    if (limboMap) {
      limboMap.set(playerId, Math.max(0, limboIn + rawDeckLoss - drawnFromDeck));
    }

    // Pile cards beyond what the hand can supply come from the deck.
    let handPileBudget = Math.max(0, x - trainersFromHand - pokemonFromHand - energyFromHand);
    for (const pc of hiddenPile) {
      if (handPileBudget > 0) {
        pc.origin = { kind: 'hand' };
        handPileBudget--;
      } else {
        pc.origin = { kind: 'deck' };
      }
    }
    handToDeckCount = t;

    const handPileFlown = hiddenPile.filter(isHandOrigin).length;
    const rowBeforeDraw = N.handCount - d - emptied.length;
    transition.handPreTrimCount = Math.max(
      0,
      P.handCount -
        trainersFromHand -
        handPileFlown -
        pokemonFromHand -
        energyFromHand -
        t -
        rowBeforeDraw,
    );

    const drawTotal = emptied.length + d;
    const firstIndex = Math.max(0, N.handCount - drawTotal);
    for (let i = 0; i < drawTotal; i++) {
      const handIndex = firstIndex + i;
      if (handIndex >= N.handCount) {
        break;
      }
      const source: DrawSource =
        i < emptied.length ? { kind: 'prize', grid: emptied[i] } : { kind: 'deck' };
      draws.push({ cardId: N.handIds?.[handIndex] ?? null, handIndex, source });
    }
  }

  // --- Assemble steps --------------------------------------------------------
  if (!suppressBoardSteps) {
    for (const id of playedToZone) {
      steps.push({ kind: 'trainerToPlayZone', playerId, cardId: id, preFlown: preFlown.has(id) });
    }

    for (const zone of ['discard', 'lostzone'] as const) {
      const cards = pileCards
        .filter((pc) => pc.zone === zone && pc.origin !== null && pc.origin !== 'hidden')
        .map((pc) => ({ cardId: pc.cardId, origin: pc.origin as PileOrigin }));
      if (cards.length > 0) {
        steps.push({ kind: 'toPile', playerId, zone, cards });
      }
    }

    for (const group of ghostGroups.values()) {
      steps.push({ kind: 'boardGhostToPile', playerId, zone: group.zone, loc: group.loc, cardIds: group.cardIds });
    }
  }

  // Pokémon entrances run in setup (face-down) and mid-game; leave-setup uses setupReveal.
  if (!leavingSetup) {
    for (const step of pokemonToBoard) {
      steps.push(step);
    }
  }

  if (!suppressBoardSteps) {
    for (const step of energyAttach) {
      steps.push(step);
    }
  }

  // Mulligan return during setup; leave-setup hand churn snaps into place.
  if (leavingSetup) {
    if (realHand) {
      transition.handPreTrimIds.push(...handToDeckIds);
    }
  } else if (handToDeckCount > 0) {
    steps.push({
      kind: 'handToDeck',
      playerId,
      cardIds: handToDeckIds.length === handToDeckCount ? handToDeckIds : null,
      count: handToDeckCount,
    });
  }

  if (draws.length > 0) {
    const turnBegin =
      !inSetup &&
      nextSnap.isPlayerTurn &&
      nextSnap.activePlayerId === playerId &&
      prevSnap.activePlayerId !== playerId;
    const ordered = [...draws].sort((a, b) => a.handIndex - b.handIndex);
    const deckDraws = ordered.filter((c) => c.source.kind === 'deck');

    // Setup: only animate clear deal/redraws (empty hand or full mulligan return → N from deck).
    if (inSetup) {
      const emptiedHand = P.handCount === 0 || handToDeckCount === P.handCount;
      const looksLikeDeal =
        emptiedHand &&
        deckDraws.length === ordered.length &&
        deckDraws.length > 0 &&
        N.handCount === deckDraws.length &&
        P.deckCount + handToDeckCount - N.deckCount >= deckDraws.length;
      if (looksLikeDeal) {
        steps.push({
          kind: 'draw',
          playerId,
          cards: ordered,
          turnBegin: false,
          setupDeal: true,
        });
      }
    } else if (leavingSetup) {
      // Opening turn draw after board reveal (active player may already match prev).
      const firstTurnDraw =
        nextSnap.isPlayerTurn &&
        nextSnap.activePlayerId === playerId &&
        ordered.length === 1 &&
        ordered[0].source.kind === 'deck';
      if (firstTurnDraw) {
        steps.push({ kind: 'draw', playerId, cards: ordered, turnBegin: true });
      }
    } else if (turnBegin && ordered.length >= 2) {
      const lastDeck = [...ordered].reverse().find((c) => c.source.kind === 'deck');
      const rest = ordered.filter((c) => c !== lastDeck);
      if (rest.length > 0) {
        steps.push({ kind: 'draw', playerId, cards: rest, turnBegin: false });
      }
      if (lastDeck) {
        steps.push({ kind: 'draw', playerId, cards: [lastDeck], turnBegin: true });
      }
    } else {
      steps.push({ kind: 'draw', playerId, cards: ordered, turnBegin });
    }
  }

  if (!suppressBoardSteps) {
    for (const t of trainerToDiscard) {
      steps.push({ kind: 'trainerToDiscard', playerId, cardId: t.cardId, zone: t.zone });
    }
  }

  return { steps, transition };
}

/**
 * Diff two board snapshots into ordered animation steps.
 * Never reads ids from secret lists (deck, hidden hands, secret prizes): the server sends
 * placeholder ids there that collide with real card ids.
 */
export function planTransition(
  prev: BoardSnapshot | null,
  next: BoardSnapshot,
  ctx: PlanContext = {},
): TransitionPlan {
  const plan: TransitionPlan = { steps: [], players: new Map() };
  if (!prev) {
    return plan;
  }

  const prevLocs = indexLocations(prev);
  const nextLocs = indexLocations(next);

  const playerOrder = [...next.players.keys()].sort((a, b) => {
    if (a === next.activePlayerId) return -1;
    if (b === next.activePlayerId) return 1;
    return 0;
  });

  const perPlayer: TransitionStep[][] = [];
  for (const playerId of playerOrder) {
    const P = prev.players.get(playerId);
    const N = next.players.get(playerId);
    if (!P || !N) {
      continue;
    }
    const result = planPlayer(prev, next, prevLocs, nextLocs, P, N, ctx);
    plan.players.set(playerId, result.transition);
    perPlayer.push(result.steps);
  }

  for (const kind of STEP_ORDER) {
    for (const steps of perPlayer) {
      plan.steps.push(...steps.filter((s) => s.kind === kind));
    }
  }

  // Shared leave-setup reveal: one step for both boards, before draws in STEP_ORDER.
  if (prev.isSetup && !next.isSetup) {
    const waves = buildSetupRevealWaves(next);
    if (waves.length > 0) {
      const reveal: TransitionStep = { kind: 'setupReveal', waves };
      const drawIdx = plan.steps.findIndex((s) => s.kind === 'draw');
      if (drawIdx >= 0) {
        plan.steps.splice(drawIdx, 0, reveal);
      } else {
        plan.steps.push(reveal);
      }
    }
  }

  // Replay-only: attack / coin flips from GameLog (ordered, interleaved).
  if (ctx.animatePokemonEntrances && !next.isSetup) {
    appendReplayCombatSteps(plan, prev, next);
  }

  annotateShowCardsReveals(plan, prev, next, ctx.showCardsRevealIds ?? [], ctx.showCardsDestinationHint);

  return plan;
}

/** Map player name → id for log-driven replay steps. */
function playerIdByName(snapshot: BoardSnapshot, name: string): number | undefined {
  for (const p of snapshot.players.values()) {
    if (p.playerName === name) {
      return p.playerId;
    }
  }
  return undefined;
}

/**
 * Append attack / coinFlip steps from new GameLog entries, preserving log order.
 * Inserted after energyAttach (or pokemonToBoard / trainerToDiscard) and before showCards.
 */
function appendReplayCombatSteps(
  plan: TransitionPlan,
  prev: BoardSnapshot,
  next: BoardSnapshot,
): void {
  const prevLen = prev.animEvents?.length ?? 0;
  const events = (next.animEvents ?? []).slice(prevLen);
  if (events.length === 0) {
    return;
  }

  const combatSteps: TransitionStep[] = [];
  for (const ev of events) {
    const playerId = playerIdByName(next, ev.playerName);
    if (playerId == null) {
      continue;
    }
    if (ev.kind === 'coinFlip') {
      combatSteps.push({ kind: 'coinFlip', playerId, heads: ev.heads });
      continue;
    }
    // Damage dealt this tick to the opponent Active (best-effort from snapshot delta).
    let damageDealt = 0;
    for (const [id, N] of next.players) {
      if (id === playerId) {
        continue;
      }
      const P = prev.players.get(id);
      if (P) {
        damageDealt = Math.max(0, (N.activeDamage ?? 0) - (P.activeDamage ?? 0));
      }
      break;
    }
    combatSteps.push({ kind: 'attack', playerId, damageDealt });
  }
  if (combatSteps.length === 0) {
    return;
  }

  const showIdx = plan.steps.findIndex((s) => s.kind === 'showCards');
  if (showIdx >= 0) {
    plan.steps.splice(showIdx, 0, ...combatSteps);
  } else {
    plan.steps.push(...combatSteps);
  }
}

/**
 * Attach ShowCards faces to overlapping draw steps (stage-reveal merge) and emit a
 * dedicated {@link TransitionStep} for any remaining ids.
 */
function annotateShowCardsReveals(
  plan: TransitionPlan,
  prev: BoardSnapshot,
  next: BoardSnapshot,
  revealIdList: readonly number[],
  destinationHint?: 'deck' | 'hand',
): void {
  if (revealIdList.length === 0) {
    return;
  }
  const revealIds = new Set(revealIdList);
  plan.showCardsRevealIds = revealIds;
  const nextLocs = indexLocations(next);
  const covered = new Set<number>();

  for (const step of plan.steps) {
    if (step.kind !== 'draw') {
      continue;
    }
    const N = next.players.get(step.playerId);
    const P = prev.players.get(step.playerId);
    const revealForStep: number[] = [];

    if (N?.handIds) {
      for (const c of step.cards) {
        if (c.cardId != null && revealIds.has(c.cardId) && !covered.has(c.cardId)) {
          revealForStep.push(c.cardId);
          covered.add(c.cardId);
        }
      }
      for (const id of revealIds) {
        if (covered.has(id)) {
          continue;
        }
        if (N.handIds.includes(id) && !(P?.handIds?.includes(id) ?? false)) {
          revealForStep.push(id);
          covered.add(id);
        }
      }
    } else {
      for (const id of revealIds) {
        if (covered.has(id) || revealForStep.length >= step.cards.length) {
          continue;
        }
        const loc = nextLocs.get(id);
        if (loc && (loc.zone !== 'hand' || loc.playerId !== step.playerId)) {
          continue;
        }
        revealForStep.push(id);
        covered.add(id);
      }
    }

    if (revealForStep.length > 0) {
      step.revealCardIds = revealForStep;
    }
  }

  const prevLocs = indexLocations(prev);
  // Skip reveals that are already sitting in hand on both sides (lingering ShowCards
  // prompts in replays). Re-flying those is a duplicate of the earlier draw/entrance.
  const uncovered = [...revealIds].filter((id) => {
    if (covered.has(id)) {
      return false;
    }
    const prevLoc = prevLocs.get(id);
    const nextLoc = nextLocs.get(id);
    if (
      prevLoc?.zone === 'hand' &&
      nextLoc?.zone === 'hand' &&
      prevLoc.playerId === nextLoc.playerId
    ) {
      return false;
    }
    return true;
  });
  if (uncovered.length > 0) {
    plan.steps.push({
      kind: 'showCards',
      cardIds: uncovered,
      destinationHint,
    });
  }
}

/** Occupied Active then Bench indices across both players (union). */
function buildSetupRevealWaves(
  next: BoardSnapshot,
): { slot: 'active' | 'bench'; index: number }[] {
  let hasActive = false;
  const bench = new Set<number>();
  for (const p of next.players.values()) {
    for (const loc of p.boardCards.values()) {
      if (!loc.isTopPokemon) {
        continue;
      }
      if (loc.slot === 'active') {
        hasActive = true;
      } else {
        bench.add(loc.index);
      }
    }
  }
  const waves: { slot: 'active' | 'bench'; index: number }[] = [];
  if (hasActive) {
    waves.push({ slot: 'active', index: 0 });
  }
  for (const index of [...bench].sort((a, b) => a - b)) {
    waves.push({ slot: 'bench', index });
  }
  return waves;
}
