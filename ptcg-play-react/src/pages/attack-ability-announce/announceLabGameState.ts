import {
  CardManager,
  CardList,
  GamePhase,
  GameSettings,
  Player,
  PokemonCard,
  PokemonCardList,
  State,
  SuperType,
  type Card,
  type CardsInfo,
} from 'ptcg-server';
import { applyCardsInfoToGameEngine } from '../../table/gameEngineCards';
import type { LocalGameState } from '../../table/types/localGameState';

export const ANNOUNCE_LAB_CLIENT_ID = 1;
export const ANNOUNCE_LAB_OPPONENT_ID = 2;
export const ANNOUNCE_LAB_KANGASKHAN_FULL_NAME = 'Mega Kangaskhan ex M1S';
export const ANNOUNCE_LAB_DRAKLOAK_FULL_NAME = 'Drakloak TWM';
export const ANNOUNCE_LAB_FEZ_FULL_NAME = 'Fezandipiti ex SFA';

export type AnnounceLabSlot = 'active' | { benchIndex: number };

export type AnnounceLabPokemonTarget = {
  id: string;
  label: string;
  fullName: string;
  slot: AnnounceLabSlot;
  abilityName: string;
  attackName: string;
  attackEnergy: Array<'C' | 'R' | 'W' | 'G' | 'L' | 'P' | 'F' | 'D' | 'M' | 'Y' | 'N'>;
};

/** Selectable announce sources for the lab sidebar. */
export const ANNOUNCE_LAB_TARGETS: AnnounceLabPokemonTarget[] = [
  {
    id: 'active-kang',
    label: 'Active · Mega Kangaskhan ex',
    fullName: ANNOUNCE_LAB_KANGASKHAN_FULL_NAME,
    slot: 'active',
    abilityName: 'Run Errand',
    attackName: 'Rapid-Fire Combo',
    attackEnergy: ['C', 'C', 'C'],
  },
  {
    id: 'bench-drak-0',
    label: 'Bench 1 · Drakloak',
    fullName: ANNOUNCE_LAB_DRAKLOAK_FULL_NAME,
    slot: { benchIndex: 0 },
    abilityName: 'Recon Directive',
    attackName: 'Dragon Headbutt',
    attackEnergy: ['R', 'P'],
  },
  {
    id: 'bench-drak-1',
    label: 'Bench 2 · Drakloak',
    fullName: ANNOUNCE_LAB_DRAKLOAK_FULL_NAME,
    slot: { benchIndex: 1 },
    abilityName: 'Recon Directive',
    attackName: 'Dragon Headbutt',
    attackEnergy: ['R', 'P'],
  },
  {
    id: 'bench-drak-2',
    label: 'Bench 3 · Drakloak',
    fullName: ANNOUNCE_LAB_DRAKLOAK_FULL_NAME,
    slot: { benchIndex: 2 },
    abilityName: 'Recon Directive',
    attackName: 'Dragon Headbutt',
    attackEnergy: ['R', 'P'],
  },
  {
    id: 'bench-fez',
    label: 'Bench 4 · Fezandipiti ex',
    fullName: ANNOUNCE_LAB_FEZ_FULL_NAME,
    slot: { benchIndex: 3 },
    abilityName: 'Flip the Script',
    attackName: 'Cruel Arrow',
    attackEnergy: ['C', 'C', 'C'],
  },
];

let nextCardId = 9000;

function emptyPlayer(id: number, name: string): Player {
  const player = new Player();
  player.id = id;
  player.name = name;
  player.bench = [];
  for (let i = 0; i < 5; i++) {
    const bench = new PokemonCardList();
    bench.isPublic = true;
    player.bench.push(bench);
  }
  player.prizes = [];
  for (let i = 0; i < 6; i++) {
    const prize = new CardList();
    prize.isSecret = true;
    player.prizes.push(prize);
  }
  player.active.isPublic = true;
  player.discard.isPublic = true;
  player.lostzone.isPublic = true;
  player.stadium.isPublic = true;
  player.supporter.isPublic = true;
  return player;
}

function instantiateCard(fullName: string, fallback?: Card): Card | null {
  const cm = CardManager.getInstance();
  const card = cm.getCardByName(fullName) ?? (fallback ? cm.getCardByName(fallback.fullName) : undefined);
  if (!card) {
    return null;
  }
  card.id = nextCardId++;
  return card;
}

function placePokemon(slot: PokemonCardList, fullName: string, fallback?: Card): boolean {
  const instance = instantiateCard(fullName, fallback);
  if (!instance) {
    return false;
  }
  slot.cards = [instance];
  if (instance instanceof PokemonCard) {
    slot.hp = instance.hp;
  }
  slot.damage = 0;
  slot.isPublic = true;
  return true;
}

function fillSecretPiles(player: Player, filler: Card | undefined): void {
  if (!filler) {
    return;
  }
  for (const prize of player.prizes) {
    const card = CardManager.getInstance().getCardByName(filler.fullName) ?? filler;
    card.id = nextCardId++;
    prize.cards = [card];
    prize.isSecret = true;
  }
  for (let i = 0; i < 8; i++) {
    const card = CardManager.getInstance().getCardByName(filler.fullName) ?? filler;
    card.id = nextCardId++;
    player.deck.cards.push(card);
  }
}

/** Same Active + bench layout for both seats. */
function populateMirroredBoard(
  player: Player,
  cards: { kangaskhan: Card; drakloak: Card; fez: Card },
): void {
  placePokemon(player.active, ANNOUNCE_LAB_KANGASKHAN_FULL_NAME, cards.kangaskhan);
  placePokemon(player.bench[0]!, ANNOUNCE_LAB_DRAKLOAK_FULL_NAME, cards.drakloak);
  placePokemon(player.bench[1]!, ANNOUNCE_LAB_DRAKLOAK_FULL_NAME, cards.drakloak);
  placePokemon(player.bench[2]!, ANNOUNCE_LAB_DRAKLOAK_FULL_NAME, cards.drakloak);
  placePokemon(player.bench[3]!, ANNOUNCE_LAB_FEZ_FULL_NAME, cards.fez);
}

/**
 * Builds a static LocalGameState for the announce-bar lab: mirrored boards with
 * Mega Kangaskhan Active, 3× Drakloak TWM + Fezandipiti ex SFA on the bench.
 */
export function buildAnnounceLabLocalGame(
  cards: { kangaskhan: Card; drakloak: Card; fez: Card },
  filler?: Card,
): LocalGameState {
  const bottom = emptyPlayer(ANNOUNCE_LAB_CLIENT_ID, 'You');
  const top = emptyPlayer(ANNOUNCE_LAB_OPPONENT_ID, 'Opponent');

  populateMirroredBoard(bottom, cards);
  populateMirroredBoard(top, cards);
  fillSecretPiles(bottom, filler);
  fillSecretPiles(top, filler);

  const state = new State();
  state.phase = GamePhase.PLAYER_TURN;
  state.turn = 3;
  state.activePlayer = 0;
  state.players = [bottom, top];
  state.gameSettings = new GameSettings();
  state.gameSettings.sandboxMode = true;

  return {
    gameId: -1,
    stateData: '',
    clientIds: [ANNOUNCE_LAB_CLIENT_ID, ANNOUNCE_LAB_OPPONENT_ID],
    timeLimit: 0,
    recordingEnabled: false,
    playerStats: [],
    localId: 1,
    deleted: false,
    gameOver: false,
    switchSide: false,
    promptMinimized: false,
    state,
    logs: [],
    replayPosition: 0,
  };
}

function resolveByFullName(catalog: Card[], fullName: string, set?: string, setNumber?: string): Card | null {
  const cm = CardManager.getInstance();
  const fromManager = cm.getCardByName(fullName);
  if (fromManager) {
    return fromManager;
  }
  const fromCatalog =
    catalog.find((c) => c.fullName === fullName) ??
    (set && setNumber
      ? catalog.find((c) => c.set === set && c.setNumber === setNumber)
      : undefined);
  return fromCatalog ? cm.getCardByName(fromCatalog.fullName) ?? fromCatalog : null;
}

export function resolveAnnounceLabKangaskhan(catalog: Card[]): Card | null {
  return resolveByFullName(catalog, ANNOUNCE_LAB_KANGASKHAN_FULL_NAME, 'MEG', '104');
}

export function resolveAnnounceLabDrakloak(catalog: Card[]): Card | null {
  return resolveByFullName(catalog, ANNOUNCE_LAB_DRAKLOAK_FULL_NAME, 'TWM', '129');
}

export function resolveAnnounceLabFez(catalog: Card[]): Card | null {
  return resolveByFullName(catalog, ANNOUNCE_LAB_FEZ_FULL_NAME, 'SFA', '38');
}

export function resolveAnnounceLabFiller(catalog: Card[]): Card | undefined {
  const cm = CardManager.getInstance();
  const names = [
    'Basic Colorless Energy',
    'Basic Fighting Energy',
    'Grass Energy',
    'Colorless Energy',
  ];
  for (const name of names) {
    const card = cm.getCardByName(name);
    if (card) {
      return card;
    }
  }
  return catalog.find((c) => c.superType === SuperType.ENERGY) ?? catalog[0];
}

/** Load card definitions into the game engine CardManager (idempotent). */
export function ensureAnnounceLabCards(cardsInfo: CardsInfo): void {
  applyCardsInfoToGameEngine(cardsInfo);
}
