import { Card } from '../../game/store/card/card';
import { CardManager } from '../../game/cards/card-manager';
import { EnergyCard } from '../../game/store/card/energy-card';
import { PokemonCard } from '../../game/store/card/pokemon-card';
import { SuperType, CardType } from '../../game/store/card/card-types';
import { State, GamePhase } from '../../game/store/state/state';
import { Player } from '../../game/store/state/player';
import { PokemonCardList } from '../../game/store/state/pokemon-card-list';
import { CardList } from '../../game/store/state/card-list';
import { StateUtils } from '../../game/store/state-utils';
import { Store } from '../../game/store/store';
import { StoreHandler } from '../../game/store/store-handler';
import { Prompt } from '../../game/store/prompts/prompt';
import { ResolvePromptAction } from '../../game/store/actions/resolve-prompt-action';
import { BotArbiter, BotFlipMode, BotShuffleMode } from '../../game/bots/bot-arbiter';
import { AlertPrompt } from '../../game/store/prompts/alert-prompt';
import { ConfirmPrompt } from '../../game/store/prompts/confirm-prompt';
import { ConfirmCardsPrompt } from '../../game/store/prompts/confirm-cards-prompt';
import { ShowCardsPrompt } from '../../game/store/prompts/show-cards-prompt';
import { ChooseCardsPrompt, matchesPromptFilter } from '../../game/store/prompts/choose-cards-prompt';
import { ChoosePokemonPrompt } from '../../game/store/prompts/choose-pokemon-prompt';
import { AttachEnergyPrompt } from '../../game/store/prompts/attach-energy-prompt';
import { ChooseEnergyPrompt } from '../../game/store/prompts/choose-energy-prompt';
import { SelectPrompt } from '../../game/store/prompts/select-prompt';
import { SelectOptionPrompt } from '../../game/store/prompts/select-option-prompt';
import { ChoosePrizePrompt } from '../../game/store/prompts/choose-prize-prompt';
import { OrderCardsPrompt } from '../../game/store/prompts/order-cards-prompt';
import { PutDamagePrompt } from '../../game/store/prompts/put-damage-prompt';
import { MoveDamagePrompt } from '../../game/store/prompts/move-damage-prompt';
import { MoveEnergyPrompt } from '../../game/store/prompts/move-energy-prompt';
import { DiscardEnergyPrompt } from '../../game/store/prompts/discard-energy-prompt';
import { PlayerType, SlotType, CardTarget } from '../../game/store/actions/play-card-action';

// ── Config interfaces ──

export interface PokemonSlotConfig {
  card: string;
  energy?: string[];
  damage?: number;
  tools?: string[];
}

export interface PlayerConfig {
  active: PokemonSlotConfig;
  bench?: PokemonSlotConfig[];
  hand?: string[];
  deck?: string[];
  discard?: string[];
  prizeCount?: number;
}

export interface SetupGameConfig {
  player1: PlayerConfig;
  player2: PlayerConfig;
  /** Override the starting turn number (default 1) */
  turn?: number;
}

// ── Card registration ──

const fs = require('fs');
const path = require('path');

const setsDir = path.resolve(__dirname, '..');
const EXPORT_PATH_REGEX = /export \* from '\.\/([^']+)'/g;
const IMPORT_PATH_REGEX = /from '\.\/([^']+)'/g;
const SET_DECLARATION_REGEX = /public set(?:\s*:\s*string)?\s*=\s*['"]([^'"]+)['"]/;
const SET_CODE_REGEX = /^[A-Z0-9-]{2,8}$/;

let setCodeToModules: Map<string, string[]> | undefined;
const loadedSetModules = new Set<string>();

function getExportedSetModulePaths(): string[] {
  const indexContent: string = fs.readFileSync(path.join(setsDir, 'index.ts'), 'utf8');
  const modulePaths: string[] = [];
  EXPORT_PATH_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EXPORT_PATH_REGEX.exec(indexContent)) !== null) {
    modulePaths.push(match[1]);
  }
  return modulePaths;
}

function extractSetCodeFromSource(source: string): string | undefined {
  const match = SET_DECLARATION_REGEX.exec(source);
  if (!match) {
    return undefined;
  }
  const setCode = match[1].toUpperCase();
  return SET_CODE_REGEX.test(setCode) ? setCode : undefined;
}

function inferSetCodeFromModule(moduleName: string): string | undefined {
  const moduleDir = path.join(setsDir, moduleName);
  const indexPath = path.join(moduleDir, 'index.ts');
  if (!fs.existsSync(indexPath)) {
    return undefined;
  }

  const indexContent: string = fs.readFileSync(indexPath, 'utf8');
  const candidateFiles: string[] = [];
  IMPORT_PATH_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_PATH_REGEX.exec(indexContent)) !== null) {
    candidateFiles.push(path.join(moduleDir, `${match[1]}.ts`));
  }

  for (const candidateFile of candidateFiles) {
    if (!fs.existsSync(candidateFile)) {
      continue;
    }
    const fileContent = fs.readFileSync(candidateFile, 'utf8');
    const setCode = extractSetCodeFromSource(fileContent);
    if (setCode) {
      return setCode;
    }
  }

  const fallbackFiles = fs.readdirSync(moduleDir)
    .filter((file: string) => file.endsWith('.ts') && file !== 'index.ts')
    .map((file: string) => path.join(moduleDir, file));

  for (const candidateFile of fallbackFiles) {
    const fileContent = fs.readFileSync(candidateFile, 'utf8');
    const setCode = extractSetCodeFromSource(fileContent);
    if (setCode) {
      return setCode;
    }
  }

  return undefined;
}

function getSetCodeToModules(): Map<string, string[]> {
  if (setCodeToModules) {
    return setCodeToModules;
  }

  const map = new Map<string, string[]>();
  const modulePaths = getExportedSetModulePaths();
  for (const moduleName of modulePaths) {
    const setCode = inferSetCodeFromModule(moduleName);
    if (!setCode) {
      continue;
    }
    const modules = map.get(setCode) ?? [];
    modules.push(moduleName);
    map.set(setCode, modules);
  }

  setCodeToModules = map;
  return map;
}

function extractSetCodeFromFullName(fullName: string): string {
  const tokens = fullName.trim().split(/\s+/);
  const lastToken = tokens[tokens.length - 1]?.toUpperCase();
  if (!lastToken || !SET_CODE_REGEX.test(lastToken)) {
    throw new Error(`[test-helpers] Could not infer set code from card fullName "${fullName}"`);
  }
  return lastToken;
}

function loadSetModule(moduleName: string): void {
  if (loadedSetModules.has(moduleName)) {
    return;
  }

  const cardManager = CardManager.getInstance();
  const mod = require(path.join(setsDir, moduleName));
  for (const key of Object.keys(mod)) {
    const value = mod[key];
    if (!Array.isArray(value) || value.length === 0 || !(value[0] instanceof Card)) {
      continue;
    }
    try {
      cardManager.defineSet(value);
    } catch (error: any) {
      if (!error.message?.startsWith('Multiple cards with the same name')) {
        throw error;
      }
    }
  }
  loadedSetModules.add(moduleName);
}

function ensureSetCodeLoaded(setCode: string): void {
  const modulePaths = getSetCodeToModules().get(setCode);
  if (!modulePaths || modulePaths.length === 0) {
    throw new Error(`[test-helpers] No set module found for set code "${setCode}"`);
  }

  for (const moduleName of modulePaths) {
    try {
      loadSetModule(moduleName);
    } catch (error: any) {
      throw new Error(`[test-helpers] Failed to load set module "${moduleName}" (${setCode}): ${error.message}`);
    }
  }
}

export function ensureCardsRegistered(cardNames: string[] = []): void {
  const cardManager = CardManager.getInstance();
  const namesToRegister = Array.from(new Set(cardNames.map(name => name.trim()).filter(Boolean)));

  for (const fullName of namesToRegister) {
    if (cardManager.isCardDefined(fullName)) {
      continue;
    }
    const setCode = extractSetCodeFromFullName(fullName);
    ensureSetCodeLoaded(setCode);
  }
}

// ── Convenience helpers ──

export function getCardByName(fullName: string): Card {
  const cardManager = CardManager.getInstance();
  let card = cardManager.getCardByName(fullName);
  if (!card) {
    ensureCardsRegistered([fullName]);
    card = cardManager.getCardByName(fullName);
  }
  if (card === undefined) {
    throw new Error(`Card not found: "${fullName}"`);
  }
  return card;
}

const DEFAULT_FILLER = 'Water Energy SVE';

export function padDeck(n: number, cardName?: string): string[] {
  return Array(n).fill(cardName ?? DEFAULT_FILLER);
}

// ── Prompt override map ──

type PromptHandler = (prompt: Prompt<any>, state: State) => any;

// ── TestStoreHandler ──

class TestStoreHandler implements StoreHandler {
  private arbiter = new BotArbiter({
    flipMode: BotFlipMode.ALL_HEADS,
    shuffleMode: BotShuffleMode.NO_SHUFFLE
  });
  private overrides = new Map<string, PromptHandler>();
  private store!: Store;

  setStore(store: Store): void {
    this.store = store;
  }

  overridePrompt(type: string, handler: PromptHandler): void {
    this.overrides.set(type, handler);
  }

  onStateChange(state: State): void {
    // Auto-resolve any pending prompts
    const pending = state.prompts.filter(p => p.result === undefined);
    for (const prompt of pending) {
      const action = this.resolvePrompt(state, prompt);
      if (action) {
        this.store.dispatch(action);
      }
    }
  }

  private resolvePrompt(state: State, prompt: Prompt<any>): ResolvePromptAction | undefined {
    // Check one-shot overrides first
    const override = this.overrides.get(prompt.type);
    if (override) {
      this.overrides.delete(prompt.type);
      const rawResult = override(prompt, state);
      return this.decodeAndValidatePromptResult(state, prompt, rawResult);
    }

    // Try BotArbiter for coin flips and shuffles
    const arbiterResult = this.arbiter.resolvePrompt(state, prompt);
    if (arbiterResult) {
      return this.decodeAndValidatePromptResult(state, prompt, arbiterResult.result, arbiterResult.log);
    }

    const rawResult = this.resolveRawPromptResult(state, prompt);
    return this.decodeAndValidatePromptResult(state, prompt, rawResult);
  }

  private resolveRawPromptResult(state: State, prompt: Prompt<any>): any {
    // Auto-resolve by prompt type — these are raw prompt payloads
    let rawResult: any = true;

    if (prompt instanceof AlertPrompt) {
      rawResult = true;
    } else if (prompt instanceof ShowCardsPrompt) {
      rawResult = true;
    } else if (prompt instanceof ConfirmPrompt) {
      rawResult = true;
    } else if (prompt instanceof ConfirmCardsPrompt) {
      rawResult = true;
    } else if (prompt instanceof ChooseCardsPrompt) {
      rawResult = this.resolveChooseCardsRaw(prompt);
    } else if (prompt instanceof ChoosePokemonPrompt) {
      rawResult = this.resolveChoosePokemonRaw(state, prompt);
    } else if (prompt instanceof AttachEnergyPrompt) {
      rawResult = this.resolveAttachEnergyRaw(state, prompt);
    } else if (prompt instanceof ChooseEnergyPrompt) {
      rawResult = this.resolveChooseEnergyRaw(prompt);
    } else if (prompt instanceof SelectPrompt) {
      rawResult = 0;
    } else if (prompt instanceof SelectOptionPrompt) {
      rawResult = 0;
    } else if (prompt instanceof ChoosePrizePrompt) {
      rawResult = this.resolveChoosePrizeRaw(state, prompt);
    } else if (prompt instanceof OrderCardsPrompt) {
      rawResult = prompt.cards.cards.map((_: any, i: number) => i);
    } else if (prompt instanceof PutDamagePrompt) {
      rawResult = this.resolvePutDamageRaw(state, prompt);
    } else if (prompt instanceof MoveDamagePrompt) {
      rawResult = prompt.options.allowCancel ? null : [];
    } else if (prompt instanceof MoveEnergyPrompt) {
      rawResult = prompt.options.allowCancel ? null : [];
    } else if (prompt instanceof DiscardEnergyPrompt) {
      rawResult = this.resolveDiscardEnergyRaw(state, prompt);
    }

    return rawResult;
  }

  private decodeAndValidatePromptResult(
    state: State,
    prompt: Prompt<any>,
    rawResult: any,
    log?: any
  ): ResolvePromptAction {
    const decoded = prompt.decode(rawResult, state);
    if (prompt.validate(decoded, state) === false) {
      throw new Error(`[test-helpers] Invalid auto-resolved prompt result for "${prompt.type}"`);
    }
    return new ResolvePromptAction(prompt.id, decoded, log);
  }

  private getPromptPlayers(state: State, prompt: Prompt<any>): { player: Player; opponent: Player } | undefined {
    const player = state.players.find(p => p.id === prompt.playerId);
    const opponent = state.players.find(p => p.id !== prompt.playerId);
    if (!player || !opponent) {
      return undefined;
    }
    return { player, opponent };
  }

  private toTargetKey(target: CardTarget): string {
    return `${target.player}-${target.slot}-${target.index}`;
  }

  private cardMatchesPartialFilter(card: Card, filter: Partial<Card>): boolean {
    return matchesPromptFilter(card, filter);
  }

  private resolveChooseCardsRaw(prompt: ChooseCardsPrompt): any {
    const blocked = new Set(prompt.options.blocked);
    const indices: number[] = [];
    const max = prompt.options.max;
    for (let i = 0; i < prompt.cards.cards.length && indices.length < max; i++) {
      if (!blocked.has(i)) {
        indices.push(i);
      }
    }
    if (indices.length < prompt.options.min && prompt.options.allowCancel) {
      return null;
    }
    return indices;
  }

  private resolveChoosePokemonRaw(state: State, prompt: ChoosePokemonPrompt): any {
    const promptPlayers = this.getPromptPlayers(state, prompt);
    if (!promptPlayers) return null;
    const { player, opponent } = promptPlayers;

    const blockedSet = new Set(prompt.options.blocked.map(b => this.toTargetKey(b)));
    const targets: CardTarget[] = [];

    for (const pt of [PlayerType.BOTTOM_PLAYER, PlayerType.TOP_PLAYER]) {
      const p = pt === PlayerType.BOTTOM_PLAYER ? player : opponent;
      if (prompt.playerType !== PlayerType.ANY && prompt.playerType !== pt) continue;

      if (prompt.slots.includes(SlotType.ACTIVE) && p.active.cards.length > 0) {
        const t: CardTarget = { player: pt, slot: SlotType.ACTIVE, index: 0 };
        if (!blockedSet.has(this.toTargetKey(t))) {
          targets.push(t);
        }
      }
      if (prompt.slots.includes(SlotType.BENCH)) {
        for (let i = 0; i < p.bench.length; i++) {
          if (p.bench[i].cards.length > 0) {
            const t: CardTarget = { player: pt, slot: SlotType.BENCH, index: i };
            if (!blockedSet.has(this.toTargetKey(t))) {
              targets.push(t);
            }
          }
        }
      }
    }

    const max = prompt.options.max;
    const result = targets.slice(0, max);
    if (result.length < prompt.options.min) {
      return prompt.options.allowCancel ? null : [];
    }
    return result;
  }

  private getPrimaryEnergyType(card: Card): CardType {
    if (card instanceof EnergyCard && card.provides.length > 0) {
      return card.provides[0];
    }
    return CardType.NONE;
  }

  private buildAttachTargets(
    player: Player,
    opponent: Player,
    prompt: AttachEnergyPrompt
  ): CardTarget[] {
    const blockedToSet = new Set(prompt.options.blockedTo.map(target => this.toTargetKey(target)));
    const targets: CardTarget[] = [];
    const targetPlayers: PlayerType[] = prompt.playerType === PlayerType.ANY
      ? [PlayerType.BOTTOM_PLAYER, PlayerType.TOP_PLAYER]
      : [prompt.playerType];

    for (const playerType of targetPlayers) {
      const targetPlayer = playerType === PlayerType.BOTTOM_PLAYER ? player : opponent;
      if (prompt.slots.includes(SlotType.ACTIVE) && targetPlayer.active.cards.length > 0) {
        const target: CardTarget = { player: playerType, slot: SlotType.ACTIVE, index: 0 };
        if (!blockedToSet.has(this.toTargetKey(target))) {
          targets.push(target);
        }
      }
      if (prompt.slots.includes(SlotType.BENCH)) {
        for (let i = 0; i < targetPlayer.bench.length; i++) {
          if (targetPlayer.bench[i].cards.length === 0) {
            continue;
          }
          const target: CardTarget = { player: playerType, slot: SlotType.BENCH, index: i };
          if (!blockedToSet.has(this.toTargetKey(target))) {
            targets.push(target);
          }
        }
      }
    }

    return targets;
  }

  private findAttachAssignments(
    energies: Array<{ index: number; card: Card; type: CardType }>,
    targets: CardTarget[],
    prompt: AttachEnergyPrompt,
    desiredCount: number
  ): Array<{ to: CardTarget; index: number }> | undefined {
    const assignments: Array<{ to: CardTarget; index: number }> = [];
    const usedTargets = new Set<string>();
    const usedTypes = new Set<CardType>();
    const typeCounts = new Map<CardType, number>();

    const canUseEnergy = (energy: { card: Card; type: CardType }): boolean => {
      if (prompt.options.validCardTypes) {
        const provided = energy.card instanceof EnergyCard ? energy.card.provides : [];
        if (!provided.some(type => prompt.options.validCardTypes!.includes(type))) {
          return false;
        }
      }

      if (prompt.options.differentTypes && usedTypes.has(energy.type)) {
        return false;
      }

      if (prompt.options.maxPerType !== undefined) {
        const count = (typeCounts.get(energy.type) ?? 0) + 1;
        if (count > prompt.options.maxPerType) {
          return false;
        }
      }

      return true;
    };

    const canUseTarget = (target: CardTarget): boolean => {
      const targetKey = this.toTargetKey(target);
      if (prompt.options.sameTarget && assignments.length > 0) {
        const firstKey = this.toTargetKey(assignments[0].to);
        if (targetKey !== firstKey) {
          return false;
        }
      }
      if (prompt.options.differentTargets && usedTargets.has(targetKey)) {
        return false;
      }
      return true;
    };

    const recurse = (energyStartIndex: number): boolean => {
      if (assignments.length === desiredCount) {
        return true;
      }

      for (let i = energyStartIndex; i < energies.length; i++) {
        const energy = energies[i];
        if (!canUseEnergy(energy)) {
          continue;
        }

        for (const target of targets) {
          if (!canUseTarget(target)) {
            continue;
          }

          const targetKey = this.toTargetKey(target);
          assignments.push({ to: target, index: energy.index });
          usedTargets.add(targetKey);
          usedTypes.add(energy.type);
          typeCounts.set(energy.type, (typeCounts.get(energy.type) ?? 0) + 1);

          if (recurse(i + 1)) {
            return true;
          }

          assignments.pop();
          if (prompt.options.differentTargets) {
            usedTargets.delete(targetKey);
          }

          const nextCount = (typeCounts.get(energy.type) ?? 1) - 1;
          if (nextCount <= 0) {
            typeCounts.delete(energy.type);
            usedTypes.delete(energy.type);
          } else {
            typeCounts.set(energy.type, nextCount);
          }
        }
      }

      return false;
    };

    return recurse(0) ? assignments : undefined;
  }

  private resolveAttachEnergyRaw(state: State, prompt: AttachEnergyPrompt): any {
    const promptPlayers = this.getPromptPlayers(state, prompt);
    if (!promptPlayers) return null;
    const { player, opponent } = promptPlayers;

    const blocked = new Set(prompt.options.blocked);
    const energyCandidates: Array<{ index: number; card: Card; type: CardType }> = [];
    for (let i = 0; i < prompt.cardList.cards.length; i++) {
      const card = prompt.cardList.cards[i];
      if (blocked.has(i) || card.superType !== SuperType.ENERGY) {
        continue;
      }
      if (!this.cardMatchesPartialFilter(card, prompt.filter)) {
        continue;
      }
      energyCandidates.push({ index: i, card, type: this.getPrimaryEnergyType(card) });
    }
    if (energyCandidates.length === 0) {
      return prompt.options.allowCancel ? null : [];
    }

    const targets = this.buildAttachTargets(player, opponent, prompt);
    if (targets.length === 0) {
      return prompt.options.allowCancel ? null : [];
    }

    const max = Math.min(prompt.options.max, energyCandidates.length);
    const min = Math.max(0, prompt.options.min);
    for (let desiredCount = max; desiredCount >= min; desiredCount--) {
      const assignments = this.findAttachAssignments(energyCandidates, targets, prompt, desiredCount);
      if (assignments !== undefined) {
        return assignments;
      }
    }

    return prompt.options.allowCancel ? null : [];
  }

  private getEnergyCardScore(provides: CardType[]): number {
    let score = 0;
    provides.forEach(cardType => {
      if (cardType === CardType.COLORLESS) {
        score += 2;
      } else if (cardType === CardType.ANY) {
        score += 10;
      } else {
        score += 3;
      }
    });
    return score;
  }

  private resolveChooseEnergyRaw(prompt: ChooseEnergyPrompt): any {
    const selectedIndices: number[] = [];
    const remainingIndices = prompt.energy.map((_, index) => index);
    const costsToCover = prompt.cost.filter(cost => cost !== CardType.COLORLESS);

    while (costsToCover.length > 0 && remainingIndices.length > 0) {
      const cost = costsToCover[0];
      let selectedPosition = remainingIndices.findIndex(index => prompt.energy[index].provides.includes(cost));
      if (selectedPosition === -1) {
        selectedPosition = remainingIndices.findIndex(index => prompt.energy[index].provides.includes(CardType.ANY));
      }
      if (selectedPosition === -1) {
        break;
      }

      const energyIndex = remainingIndices[selectedPosition];
      remainingIndices.splice(selectedPosition, 1);
      selectedIndices.push(energyIndex);

      for (const providedType of prompt.energy[energyIndex].provides) {
        if (providedType === CardType.ANY && costsToCover.length > 0) {
          costsToCover.shift();
        } else {
          const costIndex = costsToCover.indexOf(providedType);
          if (costIndex !== -1) {
            costsToCover.splice(costIndex, 1);
          }
        }
      }
    }

    if (costsToCover.length > 0) {
      return prompt.options.allowCancel ? null : [];
    }

    remainingIndices.sort((left, right) => {
      const leftScore = this.getEnergyCardScore(prompt.energy[left].provides);
      const rightScore = this.getEnergyCardScore(prompt.energy[right].provides);
      return leftScore - rightScore;
    });

    while (remainingIndices.length > 0) {
      const selectedEnergy = selectedIndices.map(index => prompt.energy[index]);
      if (StateUtils.checkEnoughEnergy(selectedEnergy, prompt.cost)) {
        break;
      }
      const energyIndex = remainingIndices.shift();
      if (energyIndex !== undefined) {
        selectedIndices.push(energyIndex);
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < selectedIndices.length; i++) {
        const nextSelected = selectedIndices.slice();
        nextSelected.splice(i, 1);
        const selectedEnergy = nextSelected.map(index => prompt.energy[index]);
        if (StateUtils.checkEnoughEnergy(selectedEnergy, prompt.cost)) {
          selectedIndices.splice(i, 1);
          changed = true;
          break;
        }
      }
    }

    const selectedEnergy = selectedIndices.map(index => prompt.energy[index]);
    if (!prompt.validate(selectedEnergy)) {
      return prompt.options.allowCancel ? null : [];
    }

    return selectedIndices;
  }

  private resolveChoosePrizeRaw(state: State, prompt: ChoosePrizePrompt): any {
    const player = state.players.find(p => p.id === prompt.playerId);
    if (!player) return null;
    const nonEmpty: number[] = [];
    const prizes = player.prizes.filter(p => p.cards.length > 0);
    for (let i = 0; i < prizes.length && nonEmpty.length < prompt.options.count; i++) {
      if (!prompt.options.blocked.includes(i)) {
        nonEmpty.push(i);
      }
    }
    return nonEmpty;
  }

  private resolvePutDamageRaw(state: State, prompt: PutDamagePrompt): any {
    const player = state.players.find(p => p.id === prompt.playerId);
    if (!player) return null;

    const blockedSet = new Set(prompt.options.blocked.map(b => this.toTargetKey(b)));

    let fallbackTarget: CardTarget | undefined;
    for (const dm of prompt.maxAllowedDamage) {
      if (dm.damage <= 0 || blockedSet.has(this.toTargetKey(dm.target))) {
        continue;
      }
      if (fallbackTarget === undefined) {
        fallbackTarget = dm.target;
      }
      if (dm.damage >= prompt.damage) {
        return [{ target: dm.target, damage: prompt.damage }];
      }
    }

    if (fallbackTarget && prompt.options.allowPlacePartialDamage) {
      const target = fallbackTarget;
      const fallbackDamage = prompt.maxAllowedDamage.find(dm => this.toTargetKey(dm.target) === this.toTargetKey(target))?.damage ?? prompt.damage;
      return [{ target, damage: Math.min(prompt.damage, fallbackDamage) }];
    }

    return prompt.options.allowCancel ? null : [];
  }

  private resolveDiscardEnergyRaw(state: State, prompt: DiscardEnergyPrompt): any {
    const promptPlayers = this.getPromptPlayers(state, prompt);
    if (!promptPlayers) return null;
    const { player, opponent } = promptPlayers;

    const blockedFromSet = new Set(prompt.options.blockedFrom.map(source => this.toTargetKey(source)));
    const blockedBySource = new Map<string, Set<number>>();
    for (const blockEntry of prompt.options.blockedMap) {
      blockedBySource.set(
        this.toTargetKey(blockEntry.source),
        new Set(blockEntry.blocked)
      );
    }

    const result: { from: CardTarget; index: number }[] = [];
    const max = prompt.options.max ?? Infinity;

    const scanSlots = (playerType: PlayerType, targetPlayer: Player) => {
      if (prompt.playerType !== PlayerType.ANY && prompt.playerType !== playerType) return;

      const slots: Array<{ cardList: PokemonCardList; target: CardTarget }> = [];
      if (prompt.slots.includes(SlotType.ACTIVE) && targetPlayer.active.cards.length > 0) {
        slots.push({
          cardList: targetPlayer.active,
          target: { player: playerType, slot: SlotType.ACTIVE, index: 0 }
        });
      }
      if (prompt.slots.includes(SlotType.BENCH)) {
        for (let i = 0; i < targetPlayer.bench.length; i++) {
          if (targetPlayer.bench[i].cards.length > 0) {
            slots.push({
              cardList: targetPlayer.bench[i],
              target: { player: playerType, slot: SlotType.BENCH, index: i }
            });
          }
        }
      }

      for (const { cardList, target } of slots) {
        const sourceKey = this.toTargetKey(target);
        if (blockedFromSet.has(sourceKey)) continue;
        const blockedIndices = blockedBySource.get(sourceKey) ?? new Set<number>();
        for (let i = 0; i < cardList.cards.length && result.length < max; i++) {
          const card = cardList.cards[i];
          if (card.superType !== SuperType.ENERGY) {
            continue;
          }
          if (blockedIndices.has(i)) {
            continue;
          }
          if (!this.cardMatchesPartialFilter(card, prompt.filter)) {
            continue;
          }
          result.push({ from: target, index: i });
        }
      }
    };

    scanSlots(PlayerType.BOTTOM_PLAYER, player);
    scanSlots(PlayerType.TOP_PLAYER, opponent);

    const min = prompt.options.min;
    if (result.length < min) {
      return prompt.options.allowCancel ? null : [];
    }
    return result.slice(0, max);
  }
}

// ── Main setup function ──

let nextCardId = 1000;

export interface SetupGameResult {
  store: Store;
  state: State;
  player1: Player;
  player2: Player;
  overridePrompt: (type: string, handler: PromptHandler) => void;
}

function collectCardsFromPokemonSlot(config: PokemonSlotConfig): string[] {
  const cards: string[] = [config.card];
  if (config.energy) {
    cards.push(...config.energy);
  }
  if (config.tools) {
    cards.push(...config.tools);
  }
  return cards;
}

function collectCardsFromPlayerConfig(config: PlayerConfig): string[] {
  const cards: string[] = [];
  cards.push(...collectCardsFromPokemonSlot(config.active));
  if (config.bench) {
    config.bench.forEach(slot => cards.push(...collectCardsFromPokemonSlot(slot)));
  }
  if (config.hand) {
    cards.push(...config.hand);
  }
  if (config.deck) {
    cards.push(...config.deck);
  }
  if (config.discard) {
    cards.push(...config.discard);
  }
  return cards;
}

function collectCardsFromSetupConfig(config: SetupGameConfig): string[] {
  return [
    DEFAULT_FILLER,
    ...collectCardsFromPlayerConfig(config.player1),
    ...collectCardsFromPlayerConfig(config.player2)
  ];
}

export function setupGame(config: SetupGameConfig): SetupGameResult {
  ensureCardsRegistered(collectCardsFromSetupConfig(config));
  nextCardId = 1000;

  const handler = new TestStoreHandler();
  const store = new Store(handler);
  handler.setStore(store);

  const state = new State();
  state.phase = GamePhase.PLAYER_TURN;
  state.turn = config.turn ?? 1;
  state.activePlayer = 0;

  const player1 = buildPlayer(0, config.player1);
  const player2 = buildPlayer(1, config.player2);

  state.players = [player1, player2];
  store.state = state;

  return {
    store,
    state,
    player1,
    player2,
    overridePrompt: (type: string, h: PromptHandler) => handler.overridePrompt(type, h)
  };
}

function buildPlayer(index: number, config: PlayerConfig): Player {
  const player = new Player();
  player.id = index + 1;

  // Initialize bench slots
  player.bench = [];
  for (let i = 0; i < 5; i++) {
    const bench = new PokemonCardList();
    bench.isPublic = true;
    player.bench.push(bench);
  }

  // Initialize prizes with filler energy cards
  const prizeCount = config.prizeCount ?? 6;
  player.prizes = [];
  for (let i = 0; i < prizeCount; i++) {
    const prizeList = new CardList();
    prizeList.isSecret = true;
    const filler = getCardByName(DEFAULT_FILLER);
    filler.id = nextCardId++;
    prizeList.cards.push(filler);
    player.prizes.push(prizeList);
  }

  // Set public zones (matching production setup-reducer.ts)
  player.active.isPublic = true;
  player.discard.isPublic = true;
  player.lostzone.isPublic = true;
  player.stadium.isPublic = true;
  player.supporter.isPublic = true;

  // Build active Pokemon
  buildPokemonSlot(player.active, config.active);

  // Build bench Pokemon
  if (config.bench) {
    for (let i = 0; i < config.bench.length && i < player.bench.length; i++) {
      buildPokemonSlot(player.bench[i], config.bench[i]);
    }
  }

  // Build hand
  if (config.hand) {
    for (const cardName of config.hand) {
      const card = getCardByName(cardName);
      card.id = nextCardId++;
      player.hand.cards.push(card);
    }
  }

  // Build deck
  if (config.deck) {
    for (const cardName of config.deck) {
      const card = getCardByName(cardName);
      card.id = nextCardId++;
      player.deck.cards.push(card);
    }
  }

  // Build discard
  if (config.discard) {
    for (const cardName of config.discard) {
      const card = getCardByName(cardName);
      card.id = nextCardId++;
      player.discard.cards.push(card);
    }
  }

  return player;
}

function buildPokemonSlot(slot: PokemonCardList, config: PokemonSlotConfig): void {
  const pokemon = getCardByName(config.card);
  pokemon.id = nextCardId++;
  slot.cards.push(pokemon);

  // Set HP from the PokemonCard
  if (pokemon instanceof PokemonCard) {
    slot.hp = pokemon.hp;
  }

  // Apply damage
  if (config.damage) {
    slot.damage = config.damage;
  }

  // Attach energy — placed in both .cards and .energies.cards
  if (config.energy) {
    for (const energyName of config.energy) {
      const energy = getCardByName(energyName);
      energy.id = nextCardId++;
      slot.cards.push(energy);
      if (energy instanceof EnergyCard) {
        slot.energies.cards.push(energy);
      }
    }
  }

  // Attach tools — production keeps tools only in tools[] (stripped from cards on attach)
  if (config.tools) {
    for (const toolName of config.tools) {
      const tool = getCardByName(toolName);
      tool.id = nextCardId++;
      slot.tools.push(tool);
    }
  }
}
