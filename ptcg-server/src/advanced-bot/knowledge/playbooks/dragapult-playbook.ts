import {
  Card, CardType, EnergyCard, Player, PlayerType, PokemonCard, State, StateUtils,
  TrainerCard, TrainerType, BoardEffect
} from '../../../game';

export type DragapultPhase = 'setup' | 'pressure' | 'close';

export interface DragapultBoardSnapshot {
  phase: DragapultPhase;
  prizesLeft: number;
  opponentPrizesLeft: number;
  dreepyCount: number;
  drakloakCount: number;
  dragapultCount: number;
  budewActive: boolean;
  dragapultActive: boolean;
  unusedReconCount: number;
  hasFireOnBoard: boolean;
  hasPsychicOnBoard: boolean;
  hasDarknessOnBoard: boolean;
  phantomDiveReady: boolean;
}

/**
 * Crushing Hammer Dragapult playbook derived from public Worlds 2026 coverage
 * (Hedrick list + Ultimate Guard analysis + archetype fundamentals).
 */
export class DragapultPlaybook {

  public getSnapshot(state: State, player: Player): DragapultBoardSnapshot {
    const opponent = StateUtils.getOpponent(state, player);
    let dreepyCount = 0;
    let drakloakCount = 0;
    let dragapultCount = 0;
    let unusedReconCount = 0;
    let hasFireOnBoard = false;
    let hasPsychicOnBoard = false;
    let hasDarknessOnBoard = false;
    let phantomDiveReady = false;

    const active = player.active.getPokemonCard();
    const budewActive = active?.name === 'Budew';
    const dragapultActive = active?.name === 'Dragapult ex';

    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (slot, card) => {
      if (card.name === 'Dreepy') {
        dreepyCount++;
      }
      if (card.name === 'Drakloak') {
        drakloakCount++;
        const used = player.marker.hasMarker('TELLING_SPIRIT_MARKER', card)
          || slot.boardEffect.includes(BoardEffect.ABILITY_USED);
        if (!used) {
          unusedReconCount++;
        }
      }
      if (card.name === 'Dragapult ex') {
        dragapultCount++;
      }

      for (const c of slot.cards) {
        if (!(c instanceof EnergyCard)) {
          continue;
        }
        if (c.provides.includes(CardType.FIRE) || c.name.includes('Fire')) {
          hasFireOnBoard = true;
        }
        if (c.provides.includes(CardType.PSYCHIC) || c.name.includes('Psychic')) {
          hasPsychicOnBoard = true;
        }
        if (c.provides.includes(CardType.DARK) || c.name.includes('Darkness')) {
          hasDarknessOnBoard = true;
        }
      }
    });

    if (dragapultActive) {
      const energies = player.active.cards.filter(c => c instanceof EnergyCard) as EnergyCard[];
      const hasFire = energies.some(e => e.provides.includes(CardType.FIRE) || e.name.includes('Fire'));
      const hasPsychic = energies.some(e => e.provides.includes(CardType.PSYCHIC) || e.name.includes('Psychic'));
      phantomDiveReady = hasFire && hasPsychic;
    }

    const prizesLeft = player.getPrizeLeft();
    const opponentPrizesLeft = opponent.getPrizeLeft();
    const phase = this.detectPhase(drakloakCount, dragapultCount, prizesLeft, opponentPrizesLeft);

    return {
      phase,
      prizesLeft,
      opponentPrizesLeft,
      dreepyCount,
      drakloakCount,
      dragapultCount,
      budewActive,
      dragapultActive,
      unusedReconCount,
      hasFireOnBoard,
      hasPsychicOnBoard,
      hasDarknessOnBoard,
      phantomDiveReady,
    };
  }

  public detectPhase(
    drakloakCount: number,
    dragapultCount: number,
    prizesLeft: number,
    opponentPrizesLeft: number
  ): DragapultPhase {
    if (prizesLeft <= 2 || opponentPrizesLeft <= 2) {
      return 'close';
    }
    if (dragapultCount >= 1 || drakloakCount >= 3) {
      return 'pressure';
    }
    return 'setup';
  }

  /** Additive score adjustment on top of generic StateScore. */
  public adjustScore(state: State, playerId: number): number {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return 0;
    }

    const snap = this.getSnapshot(state, player);
    let bonus = 0;

    bonus += snap.drakloakCount * 80;
    bonus += Math.min(snap.dreepyCount, 4) * 25;
    bonus += snap.unusedReconCount * 120;
    bonus += snap.dragapultCount * 100;

    if (snap.phase === 'setup') {
      if (snap.budewActive) {
        bonus += 60;
      }
      if (snap.drakloakCount >= 3) {
        bonus += 100;
      }
    }

    if (snap.phase === 'pressure' || snap.phase === 'close') {
      if (snap.dragapultActive) {
        bonus += 150;
      }
      if (snap.budewActive) {
        bonus -= 80;
      }
      if (snap.phantomDiveReady) {
        bonus += 200;
      }
    }

    if (snap.phase === 'close') {
      bonus += (6 - snap.opponentPrizesLeft) * 50;
    }

    if (snap.hasFireOnBoard) {
      bonus += 20;
    }
    if (snap.hasPsychicOnBoard) {
      bonus += 20;
    }
    if (snap.hasDarknessOnBoard) {
      bonus += 15;
    }

    return bonus;
  }

  /** Prefer cards that advance the current phase when choosing from a prompt. */
  public getCardPriority(state: State, playerId: number, card: Card): number {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return 0;
    }
    const snap = this.getSnapshot(state, player);
    let priority = 0;

    if (card instanceof PokemonCard) {
      if (card.name === 'Dreepy' && snap.phase === 'setup') {
        priority += 40;
      }
      if (card.name === 'Drakloak') {
        priority += 50;
      }
      if (card.name === 'Dragapult ex') {
        priority += snap.phase === 'setup' ? 20 : 80;
      }
      if (card.name === 'Budew' && snap.phase === 'setup') {
        priority += 35;
      }
      if (card.name === 'Munkidori') {
        priority += 30;
      }
      if (card.name === 'Fezandipiti ex') {
        priority += 25;
      }
      if (card.name === 'Dudunsparce') {
        priority += 45;
      }
    }

    if (card instanceof EnergyCard) {
      if (card.provides.includes(CardType.FIRE) || card.name.includes('Fire')) {
        priority += snap.hasFireOnBoard ? 10 : 40;
      }
      if (card.provides.includes(CardType.PSYCHIC) || card.name.includes('Psychic')) {
        priority += snap.hasPsychicOnBoard ? 10 : 40;
      }
      if (card.provides.includes(CardType.DARK) || card.name.includes('Darkness')) {
        priority += 25;
      }
    }

    if (card instanceof TrainerCard) {
      const name = card.name;
      if (name === 'Buddy-Buddy Poffin' && snap.phase === 'setup') {
        priority += 55;
      }
      if (name === 'Crispin') {
        priority += snap.phase === 'setup' ? 50 : 35;
      }
      if (name === 'Boss\'s Orders') {
        priority += snap.phase === 'setup' ? 10 : 45;
      }
      if (name === 'Crushing Hammer') {
        priority += snap.phase === 'pressure' ? 30 : 15;
      }
      if (name === 'Night Stretcher' || name === 'Poké Pad' || name === 'Poke Pad') {
        priority += 20;
      }
      if (name === 'Unfair Stamp' || name === 'Special Red Card') {
        priority += snap.phase === 'close' ? 40 : 15;
      }
      if (name === 'Lillie\'s Determination') {
        priority += 25;
      }
      if (name === 'Rosa\'s Encouragement' && snap.prizesLeft > snap.opponentPrizesLeft) {
        priority += 40;
      }
      if (name === 'Risky Ruins' && card.trainerType === TrainerType.STADIUM) {
        priority += 30;
      }
      if (name === 'Ultra Ball') {
        priority += 20;
      }
    }

    return priority;
  }

  public preferAttack(attackName: string, snap: DragapultBoardSnapshot): number {
    if (attackName === 'Phantom Dive') {
      return snap.phantomDiveReady || snap.phase !== 'setup' ? 500 : 200;
    }
    if (attackName === 'Jet Headbutt') {
      return 0;
    }
    if (attackName === 'Itchy Pollen' && snap.phase === 'setup') {
      return 80;
    }
    return 0;
  }
}
