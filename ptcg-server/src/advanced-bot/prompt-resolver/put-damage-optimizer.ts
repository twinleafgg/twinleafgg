import {
  CardTag, CardTarget, DamageMap, PlayerType, PokemonCard, PokemonCardList,
  State, StateUtils
} from '../../game';
import { PutDamagePrompt } from '../../game/store/prompts/put-damage-prompt';

export interface DamageTarget {
  target: CardTarget;
  cardList: PokemonCardList;
  /** Damage already on this Pokémon */
  currentDamage: number;
  /** Remaining HP (damage needed to KO) */
  hpLeft: number;
  /** Prize value when KO'd (1 or 2 typically) */
  prizeValue: number;
}

/**
 * Distribute PutDamagePrompt damage (e.g. Phantom Dive's 60) to maximize
 * immediate KOs, then prize value, then leftover damage toward future KOs.
 * Uses real remaining HP — unlike the simple resolver which dumps onto maxAllowedDamage=9999.
 */
export function optimizePutDamage(
  state: State,
  prompt: PutDamagePrompt
): DamageMap[] | null {
  const targets = collectTargets(state, prompt);
  if (targets.length === 0) {
    return prompt.options.allowCancel ? null : [];
  }

  const damageMultiple = prompt.options.damageMultiple ?? 10;
  const totalDamage = prompt.damage;
  const counters = totalDamage / damageMultiple;

  if (!Number.isInteger(counters) || counters < 0) {
    return prompt.options.allowCancel ? null : dumpGreedy(targets, totalDamage);
  }

  const best = searchDistributions(targets, counters, damageMultiple);
  if (best.length === 0 && prompt.options.allowCancel) {
    return null;
  }
  return best.length === 0 ? dumpGreedy(targets, totalDamage) : best;
}

function collectTargets(state: State, prompt: PutDamagePrompt): DamageTarget[] {
  const player = state.players.find(p => p.id === prompt.playerId);
  if (!player) {
    return [];
  }

  const results: DamageTarget[] = [];
  const blocked = new Set(
    prompt.options.blocked.map(b => StateUtils.getTarget(state, player, b))
  );

  const visit = (owner: typeof player, playerType: PlayerType) => {
    owner.forEachPokemon(playerType, (cardList, card, target) => {
      if (!prompt.slots.includes(target.slot)) {
        return;
      }
      if (blocked.has(cardList)) {
        return;
      }
      if (prompt.playerType !== PlayerType.ANY && target.player !== prompt.playerType) {
        return;
      }

      const hpLeft = Math.max(0, card.hp - cardList.damage);
      if (hpLeft <= 0) {
        return;
      }

      results.push({
        target,
        cardList,
        currentDamage: cardList.damage,
        hpLeft,
        prizeValue: estimatePrizeValue(card),
      });
    });
  };

  const opponent = state.players.find(p => p.id !== prompt.playerId);
  const hasOpponent = [PlayerType.TOP_PLAYER, PlayerType.ANY].includes(prompt.playerType);
  const hasPlayer = [PlayerType.BOTTOM_PLAYER, PlayerType.ANY].includes(prompt.playerType);

  if (hasOpponent && opponent) {
    visit(opponent, PlayerType.TOP_PLAYER);
  }
  if (hasPlayer) {
    visit(player, PlayerType.BOTTOM_PLAYER);
  }

  return results;
}

function estimatePrizeValue(card: PokemonCard): number {
  const multiPrize = [
    CardTag.POKEMON_ex,
    CardTag.POKEMON_V,
    CardTag.POKEMON_VMAX,
    CardTag.POKEMON_VSTAR,
    CardTag.POKEMON_GX,
    CardTag.POKEMON_EX,
    CardTag.TAG_TEAM,
  ];
  if (multiPrize.some(t => card.hasTag(t))) {
    return 2;
  }
  return 1;
}

interface DistScore {
  kos: number;
  prizes: number;
  leftoverPressure: number;
  assignment: number[]; // counters per target index
}

function searchDistributions(
  targets: DamageTarget[],
  counters: number,
  damageMultiple: number
): DamageMap[] {
  // Cap search: for Phantom Dive counters=6 and typically ≤5 bench, full search is small.
  // Prefer targets that can be KO'd with fewer counters first.
  const n = targets.length;
  let best: DistScore = { kos: -1, prizes: -1, leftoverPressure: -1, assignment: new Array(n).fill(0) };

  function score(assignment: number[]): DistScore {
    let kos = 0;
    let prizes = 0;
    let leftoverPressure = 0;
    for (let i = 0; i < n; i++) {
      const dmg = assignment[i] * damageMultiple;
      if (dmg <= 0) {
        continue;
      }
      if (dmg >= targets[i].hpLeft) {
        kos++;
        prizes += targets[i].prizeValue;
      } else {
        // Prefer filling targets closer to KO
        leftoverPressure += (dmg / targets[i].hpLeft) * targets[i].prizeValue * 10;
      }
    }
    return { kos, prizes, leftoverPressure, assignment: assignment.slice() };
  }

  function better(a: DistScore, b: DistScore): boolean {
    if (a.kos !== b.kos) {
      return a.kos > b.kos;
    }
    if (a.prizes !== b.prizes) {
      return a.prizes > b.prizes;
    }
    return a.leftoverPressure > b.leftoverPressure;
  }

  // Recursive distribution of remaining counters across targets
  const assignment = new Array(n).fill(0);
  function dfs(index: number, remaining: number): void {
    if (index === n - 1) {
      assignment[index] = remaining;
      const s = score(assignment);
      if (better(s, best)) {
        best = s;
      }
      return;
    }
    if (index >= n) {
      return;
    }

    // Max useful counters for this target: enough to KO (extra is waste unless no other targets)
    const maxUseful = Math.ceil(targets[index].hpLeft / damageMultiple);
    const maxGive = remaining;
    for (let give = 0; give <= maxGive; give++) {
      // Skip obviously wasteful overkill when we still have other targets
      if (give > maxUseful && remaining - give > 0 && index < n - 1) {
        continue;
      }
      assignment[index] = give;
      dfs(index + 1, remaining - give);
    }
    assignment[index] = 0;
  }

  if (n === 0) {
    return [];
  }

  // Limit branching for large boards: only consider top targets by KO-efficiency
  const ordered = targets
    .map((t, i) => ({ t, i, countersToKo: Math.ceil(t.hpLeft / damageMultiple) }))
    .sort((a, b) => {
      if (a.countersToKo !== b.countersToKo) {
        return a.countersToKo - b.countersToKo;
      }
      return b.t.prizeValue - a.t.prizeValue;
    });

  const limited = ordered.slice(0, Math.min(5, ordered.length));
  const limitedTargets = limited.map(x => x.t);
  const indexMap = limited.map(x => x.i);

  if (limitedTargets.length < n) {
    // Search on limited set, map back
    const limBest = { kos: -1, prizes: -1, leftoverPressure: -1, assignment: new Array(limitedTargets.length).fill(0) };
    const limAssign = new Array(limitedTargets.length).fill(0);
    const limN = limitedTargets.length;

    function limScore(a: number[]): DistScore {
      let kos = 0;
      let prizes = 0;
      let leftoverPressure = 0;
      for (let i = 0; i < limN; i++) {
        const dmg = a[i] * damageMultiple;
        if (dmg <= 0) continue;
        if (dmg >= limitedTargets[i].hpLeft) {
          kos++;
          prizes += limitedTargets[i].prizeValue;
        } else {
          leftoverPressure += (dmg / limitedTargets[i].hpLeft) * limitedTargets[i].prizeValue * 10;
        }
      }
      return { kos, prizes, leftoverPressure, assignment: a.slice() };
    }

    function limDfs(index: number, remaining: number): void {
      if (index === limN - 1) {
        limAssign[index] = remaining;
        const s = limScore(limAssign);
        if (better(s, limBest as DistScore)) {
          Object.assign(limBest, s);
        }
        return;
      }
      const maxUseful = Math.ceil(limitedTargets[index].hpLeft / damageMultiple);
      for (let give = 0; give <= remaining; give++) {
        if (give > maxUseful && remaining - give > 0 && index < limN - 1) {
          continue;
        }
        limAssign[index] = give;
        limDfs(index + 1, remaining - give);
      }
      limAssign[index] = 0;
    }

    limDfs(0, counters);
    const result: DamageMap[] = [];
    for (let i = 0; i < limN; i++) {
      const dmg = limBest.assignment[i] * damageMultiple;
      if (dmg > 0) {
        result.push({ target: targets[indexMap[i]].target, damage: dmg });
      }
    }
    return result;
  }

  dfs(0, counters);

  const result: DamageMap[] = [];
  for (let i = 0; i < n; i++) {
    const dmg = best.assignment[i] * damageMultiple;
    if (dmg > 0) {
      result.push({ target: targets[i].target, damage: dmg });
    }
  }
  return result;
}

function dumpGreedy(targets: DamageTarget[], totalDamage: number): DamageMap[] {
  // Fallback: KO cheapest targets first
  const sorted = [...targets].sort((a, b) => {
    if (a.hpLeft !== b.hpLeft) {
      return a.hpLeft - b.hpLeft;
    }
    return b.prizeValue - a.prizeValue;
  });

  const result: DamageMap[] = [];
  let remaining = totalDamage;
  for (const t of sorted) {
    if (remaining <= 0) {
      break;
    }
    const dmg = Math.min(remaining, t.hpLeft);
    // Round up to damage multiple if needed — keep exact for simplicity
    result.push({ target: t.target, damage: dmg });
    remaining -= dmg;
  }
  if (remaining > 0 && sorted.length > 0) {
    // Dump leftover on last target (overkill allowed by Phantom Dive)
    const last = result[result.length - 1];
    if (last) {
      last.damage += remaining;
    } else {
      result.push({ target: sorted[0].target, damage: remaining });
    }
  }
  return result;
}
