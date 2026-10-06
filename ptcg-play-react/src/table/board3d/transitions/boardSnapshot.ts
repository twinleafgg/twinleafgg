import { GamePhase, GameLog, SuperType } from 'ptcg-server';
import type { CardList, Player, PokemonCardList, State } from 'ptcg-server';

export type BoardSlotKind = 'active' | 'bench';

export interface BoardCardLocation {
  slot: BoardSlotKind;
  index: number;
  /** True when this card is the slot's displayed Pokémon (not an attachment). */
  isTopPokemon: boolean;
}

export interface PlayerSnapshot {
  playerId: number;
  /** Real hand ids in order, or null when the viewer only receives placeholders. */
  handIds: number[] | null;
  handCount: number;
  deckCount: number;
  discardIds: number[];
  lostzoneIds: number[];
  supporterIds: number[];
  stadiumIds: number[];
  prizeOccupied: boolean[];
  /** Real prize ids per grid slot; null when the slot is empty or secret. */
  prizeIds: (number | null)[];
  boardCards: Map<number, BoardCardLocation>;
  /** Trainer names this player logged as played in this state (new logs only). */
  playedTrainerNames: string[];
}

export interface BoardSnapshot {
  isSetup: boolean;
  isPlayerTurn: boolean;
  activePlayerId: number | undefined;
  turn: number;
  players: Map<number, PlayerSnapshot>;
  cardNames: Map<number, string>;
  trainerIds: Set<number>;
}

export interface CaptureSnapshotOptions {
  /** Whether this player's hand ids are real (not sanitizer placeholders). */
  handIdsReal: (player: Player) => boolean;
  /** Replays carry real ids for every zone. */
  omniscient: boolean;
}

const PLAYED_TRAINER_LOGS = new Set<string>([
  GameLog.LOG_PLAYER_PLAYS_SUPPORTER,
  GameLog.LOG_PLAYER_PLAYS_ITEM,
  GameLog.LOG_PLAYER_PLAYS_TOOL,
  GameLog.LOG_PLAYER_PLAYS_STADIUM,
]);

function ids(list: CardList | undefined): number[] {
  return list?.cards?.map((c) => c.id) ?? [];
}

function pokemonListIds(list: PokemonCardList | undefined): number[] {
  if (!list) {
    return [];
  }
  const out = new Set<number>();
  for (const c of list.cards ?? []) {
    out.add(c.id);
  }
  for (const c of list.energies?.cards ?? []) {
    out.add(c.id);
  }
  for (const c of list.tools ?? []) {
    out.add(c.id);
  }
  return [...out];
}

function recordBoardSlot(
  into: Map<number, BoardCardLocation>,
  list: PokemonCardList | undefined,
  slot: BoardSlotKind,
  index: number,
): void {
  if (!list || !list.cards?.length) {
    return;
  }
  const top = list.getPokemonCard?.() ?? list.cards[0];
  for (const id of pokemonListIds(list)) {
    into.set(id, { slot, index, isTopPokemon: id === top?.id });
  }
}

export function captureSnapshot(state: State, options: CaptureSnapshotOptions): BoardSnapshot {
  const players = new Map<number, PlayerSnapshot>();
  const cardNames = new Map<number, string>();
  const trainerIds = new Set<number>();

  const noteCards = (list: CardList | undefined) => {
    for (const c of list?.cards ?? []) {
      cardNames.set(c.id, c.name);
      if (c.superType === SuperType.TRAINER) {
        trainerIds.add(c.id);
      }
    }
  };

  for (const player of state.players) {
    const handReal = options.omniscient || options.handIdsReal(player);
    const boardCards = new Map<number, BoardCardLocation>();
    recordBoardSlot(boardCards, player.active, 'active', 0);
    player.bench.forEach((b, i) => recordBoardSlot(boardCards, b, 'bench', i));

    const prizeOccupied: boolean[] = [];
    const prizeIds: (number | null)[] = [];
    for (const prize of player.prizes) {
      const occupied = (prize?.cards?.length ?? 0) > 0;
      prizeOccupied.push(occupied);
      const real = occupied && (options.omniscient || (prize.isPublic && !prize.isSecret));
      prizeIds.push(real ? prize.cards[0].id : null);
    }

    if (handReal) {
      noteCards(player.hand);
    }
    noteCards(player.discard);
    noteCards(player.lostzone);
    noteCards(player.supporter);
    noteCards(player.stadium);

    const playedTrainerNames: string[] = [];
    for (const log of state.logs ?? []) {
      if (!PLAYED_TRAINER_LOGS.has(log.message)) {
        continue;
      }
      const params = (log.params ?? {}) as { name?: string; card?: string };
      if (params.name === player.name && params.card) {
        playedTrainerNames.push(String(params.card));
      }
    }

    players.set(player.id, {
      playerId: player.id,
      handIds: handReal ? ids(player.hand) : null,
      handCount: player.hand?.cards?.length ?? 0,
      deckCount: player.deck?.cards?.length ?? 0,
      discardIds: ids(player.discard),
      lostzoneIds: ids(player.lostzone),
      supporterIds: ids(player.supporter),
      stadiumIds: ids(player.stadium),
      prizeOccupied,
      prizeIds,
      boardCards,
      playedTrainerNames,
    });
  }

  return {
    isSetup: state.phase === GamePhase.SETUP || state.phase === GamePhase.WAITING_FOR_PLAYERS,
    isPlayerTurn: state.phase === GamePhase.PLAYER_TURN || state.phase === GamePhase.DRAW,
    activePlayerId: state.players[state.activePlayer]?.id,
    turn: state.turn,
    players,
    cardNames,
    trainerIds,
  };
}
