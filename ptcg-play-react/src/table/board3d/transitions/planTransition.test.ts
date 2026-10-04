import { describe, expect, it } from 'vitest';
import type { BoardCardLocation, BoardSnapshot, PlayerSnapshot } from './boardSnapshot';
import { planTransition, type TransitionStep } from './planTransition';

const ME = 1;
const OPP = 2;

type PlayerInit = Partial<Omit<PlayerSnapshot, 'boardCards'>> & {
  board?: [number, BoardCardLocation][];
};

function player(playerId: number, init: PlayerInit = {}): PlayerSnapshot {
  const handIds = init.handIds === undefined ? [] : init.handIds;
  return {
    playerId,
    handIds,
    handCount: init.handCount ?? handIds?.length ?? 0,
    deckCount: init.deckCount ?? 40,
    discardIds: init.discardIds ?? [],
    lostzoneIds: init.lostzoneIds ?? [],
    supporterIds: init.supporterIds ?? [],
    stadiumIds: init.stadiumIds ?? [],
    prizeOccupied: init.prizeOccupied ?? [true, true, true, true, true, true],
    prizeIds: init.prizeIds ?? [null, null, null, null, null, null],
    boardCards: new Map(init.board ?? []),
    playedTrainerNames: init.playedTrainerNames ?? [],
  };
}

function snap(
  me: PlayerSnapshot,
  opp: PlayerSnapshot,
  extra: Partial<Omit<BoardSnapshot, 'players'>> = {},
): BoardSnapshot {
  return {
    isSetup: false,
    isPlayerTurn: true,
    activePlayerId: ME,
    turn: 3,
    players: new Map([
      [me.playerId, me],
      [opp.playerId, opp],
    ]),
    cardNames: new Map(),
    trainerIds: new Set(),
    ...extra,
  };
}

const kinds = (steps: TransitionStep[]) => steps.map((s) => `${s.kind}:${s.playerId}`);
const hiddenOpp = (init: PlayerInit = {}) =>
  player(OPP, { handIds: null, handCount: 7, ...init });

describe('planTransition', () => {
  it('returns no steps without a previous snapshot', () => {
    const next = snap(player(ME, { handIds: [1, 2] }), hiddenOpp());
    expect(planTransition(null, next).steps).toEqual([]);
  });

  it("Professor's Research in one tick: play, discard hand, draw 7, then trainer to discard last", () => {
    const research = 10;
    const hand = [11, 12, 13, 14, 15];
    const drawn = [21, 22, 23, 24, 25, 26, 27];
    const prev = snap(
      player(ME, { handIds: [...hand, research], deckCount: 30 }),
      hiddenOpp(),
    );
    const next = snap(
      player(ME, {
        handIds: drawn,
        deckCount: 23,
        discardIds: [...hand, research],
        playedTrainerNames: ["Professor's Research"],
      }),
      hiddenOpp(),
      {
        cardNames: new Map([[research, "Professor's Research"]]),
        trainerIds: new Set([research]),
      },
    );
    const plan = planTransition(prev, next);
    expect(kinds(plan.steps)).toEqual([
      'trainerToPlayZone:1',
      'toPile:1',
      'draw:1',
      'trainerToDiscard:1',
    ]);
    const pile = plan.steps[1] as Extract<TransitionStep, { kind: 'toPile' }>;
    expect(pile.cards.map((c) => c.cardId)).toEqual(hand);
    expect(pile.cards.every((c) => c.origin.kind === 'hand')).toBe(true);
    const draw = plan.steps[2] as Extract<TransitionStep, { kind: 'draw' }>;
    expect(draw.cards.map((c) => c.cardId)).toEqual(drawn);
    expect(draw.turnBegin).toBe(false);
  });

  it('local drag pre-flown trainer is detected without logs', () => {
    const prev = snap(player(ME, { handIds: [1, 2, 3], deckCount: 10 }), hiddenOpp());
    const next = snap(
      player(ME, { handIds: [1, 2, 31, 32], deckCount: 8, discardIds: [3] }),
      hiddenOpp(),
      { trainerIds: new Set([3]) },
    );
    const plan = planTransition(prev, next, { preFlownCardIds: new Set([3]) });
    expect(kinds(plan.steps)).toEqual(['trainerToPlayZone:1', 'draw:1', 'trainerToDiscard:1']);
    expect((plan.steps[0] as { preFlown: boolean }).preFlown).toBe(true);
  });

  it('Iono for both players: hand to deck then draw, active player first', () => {
    const prev = snap(
      player(ME, { handIds: [1, 2, 3], deckCount: 20, supporterIds: [9] }),
      hiddenOpp({ handCount: 5, deckCount: 20 }),
    );
    const afterMove = snap(
      player(ME, { handIds: [], deckCount: 23, supporterIds: [9] }),
      hiddenOpp({ handCount: 0, deckCount: 25 }),
    );
    const moved = planTransition(prev, afterMove);
    expect(kinds(moved.steps)).toEqual(['handToDeck:1', 'handToDeck:2']);
    expect((moved.steps[0] as { cardIds: number[] }).cardIds).toEqual([1, 2, 3]);
    expect((moved.steps[1] as { count: number }).count).toBe(5);

    const afterDraw = snap(
      player(ME, { handIds: [41, 42, 43, 44], discardIds: [9], deckCount: 19 }),
      hiddenOpp({ handCount: 4, deckCount: 21 }),
    );
    const drew = planTransition(afterMove, afterDraw);
    expect(kinds(drew.steps)).toEqual(['draw:1', 'draw:2', 'trainerToDiscard:1']);
    expect((drew.steps[1] as { cards: unknown[] }).cards).toHaveLength(4);
  });

  it('Cynthia/Lillie: hand to deck, then a separate empty-to-full draw', () => {
    const prev = snap(player(ME, { handIds: [1, 2], deckCount: 30, supporterIds: [5] }), hiddenOpp());
    const moved = snap(player(ME, { handIds: [], deckCount: 32, supporterIds: [5] }), hiddenOpp());
    expect(kinds(planTransition(prev, moved).steps)).toEqual(['handToDeck:1']);
    const drew = snap(
      player(ME, { handIds: [61, 62, 63, 64, 65, 66], deckCount: 26, discardIds: [5] }),
      hiddenOpp(),
    );
    const plan = planTransition(moved, drew);
    expect(kinds(plan.steps)).toEqual(['draw:1', 'trainerToDiscard:1']);
    expect((plan.steps[0] as { cards: unknown[] }).cards).toHaveLength(6);
  });

  it('Ultra Ball: discards from hand, search flies from deck, ball goes to discard last', () => {
    const ball = 7;
    const prev = snap(player(ME, { handIds: [1, 2, 3, ball], deckCount: 30 }), hiddenOpp());
    const next = snap(
      player(ME, { handIds: [3, 50], deckCount: 29, discardIds: [1, 2, ball] }),
      hiddenOpp(),
      { trainerIds: new Set([ball]), cardNames: new Map([[ball, 'Ultra Ball']]) },
    );
    next.players.get(ME)!.playedTrainerNames = ['Ultra Ball'];
    const plan = planTransition(prev, next);
    expect(kinds(plan.steps)).toEqual([
      'trainerToPlayZone:1',
      'toPile:1',
      'draw:1',
      'trainerToDiscard:1',
    ]);
    expect((plan.steps[1] as { cards: { cardId: number }[] }).cards.map((c) => c.cardId)).toEqual([1, 2]);
  });

  it('turn-start draw after the opponent turn is exactly one turnBegin draw', () => {
    const prev = snap(player(ME, { handIds: [1, 2, 3], deckCount: 20 }), hiddenOpp(), {
      activePlayerId: OPP,
    });
    const next = snap(player(ME, { handIds: [1, 2, 3, 4], deckCount: 19 }), hiddenOpp());
    const plan = planTransition(prev, next);
    expect(plan.steps).toEqual([
      {
        kind: 'draw',
        playerId: ME,
        turnBegin: true,
        cards: [{ cardId: 4, handIndex: 3, source: { kind: 'deck' } }],
      },
    ]);
  });

  it('opponent turn draw animates one hidden card', () => {
    const prev = snap(player(ME, { handIds: [1] }), hiddenOpp({ handCount: 6, deckCount: 30 }));
    const next = snap(player(ME, { handIds: [1] }), hiddenOpp({ handCount: 7, deckCount: 29 }), {
      activePlayerId: OPP,
    });
    const plan = planTransition(prev, next);
    expect(kinds(plan.steps)).toEqual(['draw:2']);
    const draw = plan.steps[0] as Extract<TransitionStep, { kind: 'draw' }>;
    expect(draw.turnBegin).toBe(true);
    expect(draw.cards).toEqual([{ cardId: null, handIndex: 6, source: { kind: 'deck' } }]);
  });

  it('self-play seat swap never re-draws the whole hand', () => {
    // Before: viewing as ME (opponent hand hidden). After: viewing as OPP, who just drew 1.
    const prev = snap(
      player(ME, { handIds: [1, 2, 3, 4, 5], deckCount: 20 }),
      hiddenOpp({ handCount: 6, deckCount: 30 }),
    );
    const next = snap(
      player(ME, { handIds: null, handCount: 5, deckCount: 20 }),
      player(OPP, { handIds: [80, 81, 82, 83, 84, 85, 86], deckCount: 29 }),
      { activePlayerId: OPP },
    );
    const plan = planTransition(prev, next);
    expect(kinds(plan.steps)).toEqual(['draw:2']);
    const draw = plan.steps[0] as Extract<TransitionStep, { kind: 'draw' }>;
    expect(draw.cards).toEqual([{ cardId: 86, handIndex: 6, source: { kind: 'deck' } }]);
  });

  it('Scoop Up: a Pokémon returning to hand does not fly from the deck', () => {
    const benchLoc: BoardCardLocation = { slot: 'bench', index: 0, isTopPokemon: true };
    const prev = snap(
      player(ME, { handIds: [1, 2], deckCount: 20, board: [[70, benchLoc]] }),
      hiddenOpp(),
    );
    const next = snap(player(ME, { handIds: [1, 70], deckCount: 20, discardIds: [2] }), hiddenOpp());
    const plan = planTransition(prev, next);
    expect(plan.steps.some((s) => s.kind === 'draw')).toBe(false);
    expect(kinds(plan.steps)).toEqual(['toPile:1']);
  });

  it('Scoop Up with energy: the energy flies from the slot, the Pokémon is not a KO ghost', () => {
    const top: BoardCardLocation = { slot: 'bench', index: 0, isTopPokemon: true };
    const energy: BoardCardLocation = { slot: 'bench', index: 0, isTopPokemon: false };
    const prev = snap(
      player(ME, { handIds: [1], deckCount: 20, board: [[70, top], [71, energy]] }),
      hiddenOpp(),
    );
    const next = snap(player(ME, { handIds: [1, 70], deckCount: 20, discardIds: [71] }), hiddenOpp());
    expect(planTransition(prev, next).steps).toEqual([
      {
        kind: 'toPile',
        playerId: ME,
        zone: 'discard',
        cards: [{ cardId: 71, origin: { kind: 'board', loc: energy } }],
      },
    ]);
  });

  it('cards appearing in hand without a deck decrease do not fly from the deck', () => {
    const prev = snap(player(ME, { handIds: [1], deckCount: 20 }), hiddenOpp());
    const next = snap(player(ME, { handIds: [1, 99], deckCount: 20 }), hiddenOpp());
    expect(planTransition(prev, next).steps).toEqual([]);
  });

  it('prize take flies from the emptied prize slot', () => {
    const prev = snap(player(ME, { handIds: [1], deckCount: 20 }), hiddenOpp());
    const next = snap(
      player(ME, {
        handIds: [1, 55],
        deckCount: 20,
        prizeOccupied: [true, true, false, true, true, true],
      }),
      hiddenOpp(),
    );
    const plan = planTransition(prev, next);
    expect(plan.steps).toEqual([
      {
        kind: 'draw',
        playerId: ME,
        turnBegin: false,
        cards: [{ cardId: 55, handIndex: 1, source: { kind: 'prize', grid: 2 } }],
      },
    ]);
  });

  it('colliding placeholder ids never make played cards look like hand-to-deck', () => {
    // Deck/opponent-hand placeholders reuse ids 0..n-1; the snapshot never records them,
    // so a card played to the bench is a pre-trim, not a deck flight.
    const benchLoc: BoardCardLocation = { slot: 'bench', index: 1, isTopPokemon: true };
    const prev = snap(player(ME, { handIds: [3, 4], deckCount: 40 }), hiddenOpp());
    const next = snap(
      player(ME, { handIds: [4], deckCount: 40, board: [[3, benchLoc]] }),
      hiddenOpp(),
    );
    const plan = planTransition(prev, next);
    expect(plan.steps).toEqual([]);
    expect(plan.players.get(ME)?.handPreTrimIds).toEqual([3]);
  });

  it('knock out sends the whole Pokémon as one ghost; a lone energy discard flies from its slot', () => {
    const active: BoardCardLocation = { slot: 'active', index: 0, isTopPokemon: true };
    const activeEnergy: BoardCardLocation = { slot: 'active', index: 0, isTopPokemon: false };
    const bench: BoardCardLocation = { slot: 'bench', index: 0, isTopPokemon: true };
    const benchEnergy: BoardCardLocation = { slot: 'bench', index: 0, isTopPokemon: false };
    const prev = snap(
      player(ME, { handIds: [], board: [[100, active], [101, activeEnergy], [200, bench], [201, benchEnergy]] }),
      hiddenOpp(),
    );
    const next = snap(
      player(ME, { handIds: [], board: [[200, bench]], discardIds: [201, 100, 101] }),
      hiddenOpp(),
    );
    const plan = planTransition(prev, next);
    expect(kinds(plan.steps)).toEqual(['toPile:1', 'boardGhostToPile:1']);
    expect((plan.steps[1] as { cardIds: number[] }).cardIds).toEqual([100, 101]);
  });

  it('opponent plays a supporter that stays on the play zone, then it resolves to discard', () => {
    const sup = 300;
    const prev = snap(player(ME, { handIds: [1] }), hiddenOpp({ handCount: 6, deckCount: 30 }), {
      activePlayerId: OPP,
    });
    const played = snap(
      player(ME, { handIds: [1] }),
      hiddenOpp({ handCount: 5, deckCount: 30, supporterIds: [sup] }),
      { activePlayerId: OPP, trainerIds: new Set([sup]) },
    );
    expect(kinds(planTransition(prev, played).steps)).toEqual(['trainerToPlayZone:2']);
    const resolved = snap(
      player(ME, { handIds: [1] }),
      hiddenOpp({ handCount: 8, deckCount: 27, discardIds: [sup] }),
      { activePlayerId: OPP, trainerIds: new Set([sup]) },
    );
    expect(kinds(planTransition(played, resolved).steps)).toEqual(['draw:2', 'trainerToDiscard:2']);
  });

  it('opponent Nest Ball: one hidden card leaves hand, the basic comes from the deck', () => {
    const ball = 400;
    const bench: BoardCardLocation = { slot: 'bench', index: 0, isTopPokemon: true };
    const prev = snap(player(ME, { handIds: [1] }), hiddenOpp({ handCount: 6, deckCount: 30 }), {
      activePlayerId: OPP,
    });
    const next = snap(
      player(ME, { handIds: [1] }),
      hiddenOpp({
        handCount: 5,
        deckCount: 29,
        discardIds: [ball],
        board: [[401, bench]],
        playedTrainerNames: ['Nest Ball'],
      }),
      { activePlayerId: OPP, trainerIds: new Set([ball]), cardNames: new Map([[ball, 'Nest Ball']]) },
    );
    const plan = planTransition(prev, next);
    expect(kinds(plan.steps)).toEqual(['trainerToPlayZone:2', 'trainerToDiscard:2']);
    expect(plan.players.get(OPP)?.handPreTrimCount).toBe(0);
  });

  it('setup opening deal animates 7 deck draws with setupDeal', () => {
    const dealt = [1, 2, 3, 4, 5, 6, 7];
    const prev = snap(
      player(ME, { handIds: [], deckCount: 60 }),
      hiddenOpp({ handCount: 0, deckCount: 60 }),
      { isSetup: true },
    );
    const next = snap(
      player(ME, { handIds: dealt, deckCount: 53 }),
      hiddenOpp({ handCount: 7, deckCount: 53 }),
      { isSetup: true },
    );
    const plan = planTransition(prev, next);
    expect(kinds(plan.steps)).toEqual(['draw:1', 'draw:2']);
    const myDraw = plan.steps[0] as Extract<TransitionStep, { kind: 'draw' }>;
    expect(myDraw.setupDeal).toBe(true);
    expect(myDraw.turnBegin).toBe(false);
    expect(myDraw.cards.map((c) => c.cardId)).toEqual(dealt);
    expect(myDraw.cards.every((c) => c.source.kind === 'deck')).toBe(true);
    const oppDraw = plan.steps[1] as Extract<TransitionStep, { kind: 'draw' }>;
    expect(oppDraw.setupDeal).toBe(true);
    expect(oppDraw.cards).toHaveLength(7);
  });

  it('setup mulligan: hand returns to deck then redraws 7', () => {
    const oldHand = [1, 2, 3, 4, 5, 6, 7];
    const newHand = [11, 12, 13, 14, 15, 16, 17];
    const prev = snap(
      player(ME, { handIds: oldHand, deckCount: 53 }),
      hiddenOpp(),
      { isSetup: true },
    );
    const next = snap(
      player(ME, { handIds: newHand, deckCount: 53 }),
      hiddenOpp(),
      { isSetup: true },
    );
    const plan = planTransition(prev, next);
    expect(kinds(plan.steps)).toEqual(['handToDeck:1', 'draw:1']);
    expect((plan.steps[0] as { cardIds: number[] }).cardIds).toEqual(oldHand);
    const draw = plan.steps[1] as Extract<TransitionStep, { kind: 'draw' }>;
    expect(draw.setupDeal).toBe(true);
    expect(draw.cards.map((c) => c.cardId)).toEqual(newHand);
  });

  it('leaving setup snaps non–turn-begin hand churn', () => {
    const prev = snap(
      player(ME, { handIds: [1, 2, 3], deckCount: 40 }),
      hiddenOpp(),
      { isSetup: true },
    );
    const next = snap(
      player(ME, { handIds: [1, 2, 3, 4], deckCount: 39 }),
      hiddenOpp(),
      { isSetup: false, isPlayerTurn: true, activePlayerId: OPP },
    );
    // Not our turn begin; leaving setup → draw is snapped away.
    expect(planTransition(prev, next).steps).toEqual([]);
  });

  it('deck limbo from a look-at prompt credits a draw when the card enters hand', () => {
    const limbo = new Map<number, number>();
    const beforePeek = snap(player(ME, { handIds: [1], deckCount: 40 }), hiddenOpp());
    // Mid-prompt: 2 cards left the deck into a temp list (hand unchanged).
    const mid = snap(player(ME, { handIds: [1], deckCount: 38 }), hiddenOpp());
    expect(planTransition(beforePeek, mid, { deckLimboByPlayer: limbo }).steps).toEqual([]);
    expect(limbo.get(ME)).toBe(2);

    const resolved = snap(player(ME, { handIds: [1, 99], deckCount: 39 }), hiddenOpp());
    const plan = planTransition(mid, resolved, { deckLimboByPlayer: limbo });
    expect(kinds(plan.steps)).toEqual(['draw:1']);
    expect((plan.steps[0] as Extract<TransitionStep, { kind: 'draw' }>).cards).toEqual([
      { cardId: 99, handIndex: 1, source: { kind: 'deck' } },
    ]);
    expect(limbo.get(ME)).toBe(0);
  });

  it('N=1 look: limboIn=1 with flat deck still draws into hand', () => {
    const limbo = new Map<number, number>([[ME, 1]]);
    const prev = snap(player(ME, { handIds: [1], deckCount: 39 }), hiddenOpp());
    const next = snap(player(ME, { handIds: [1, 50], deckCount: 39 }), hiddenOpp());
    const plan = planTransition(prev, next, { deckLimboByPlayer: limbo });
    expect(kinds(plan.steps)).toEqual(['draw:1']);
    expect(limbo.get(ME)).toBe(0);
  });

  it('playing a stadium does not emit trainerToPlayZone (no supporter slot flight)', () => {
    const stadium = 500;
    const prev = snap(player(ME, { handIds: [1, stadium], deckCount: 20 }), hiddenOpp());
    const next = snap(
      player(ME, {
        handIds: [1],
        deckCount: 20,
        stadiumIds: [stadium],
        playedTrainerNames: ['Artazon'],
      }),
      hiddenOpp(),
      {
        cardNames: new Map([[stadium, 'Artazon']]),
        trainerIds: new Set([stadium]),
      },
    );
    const plan = planTransition(prev, next);
    expect(plan.steps).toEqual([]);
    expect(plan.players.get(ME)?.handPreTrimIds).toEqual([stadium]);
  });

  it('replacing a stadium piles the old one from the stadium zone; new card stays off play zone', () => {
    const oldStadium = 501;
    const newStadium = 502;
    const prev = snap(
      player(ME, { handIds: [newStadium], deckCount: 20, stadiumIds: [oldStadium] }),
      hiddenOpp(),
    );
    const next = snap(
      player(ME, {
        handIds: [],
        deckCount: 20,
        stadiumIds: [newStadium],
        discardIds: [oldStadium],
        playedTrainerNames: ['Artazon'],
      }),
      hiddenOpp(),
      {
        cardNames: new Map([
          [oldStadium, 'Pokémon Center'],
          [newStadium, 'Artazon'],
        ]),
        trainerIds: new Set([oldStadium, newStadium]),
      },
    );
    const plan = planTransition(prev, next);
    expect(kinds(plan.steps)).toEqual(['toPile:1']);
    const pile = plan.steps[0] as Extract<TransitionStep, { kind: 'toPile' }>;
    expect(pile.cards).toEqual([{ cardId: oldStadium, origin: { kind: 'stadium' } }]);
    expect(plan.players.get(ME)?.handPreTrimIds).toEqual([newStadium]);
  });
});
