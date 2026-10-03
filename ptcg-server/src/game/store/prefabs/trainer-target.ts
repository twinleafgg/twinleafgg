import { GameLog } from '../../game-message';
import { CardTarget } from '../actions/play-card-action';
import { Card } from '../card/card';
import { TrainerType } from '../card/card-types';
import { TrainerCard } from '../card/trainer-card';
import { Effect } from '../effects/effect';
import { TrainerTargetEffect } from '../effects/play-card-effects';
import { AttachEnergyPrompt } from '../prompts/attach-energy-prompt';
import { ChoosePokemonPrompt } from '../prompts/choose-pokemon-prompt';
import { DiscardEnergyPrompt } from '../prompts/discard-energy-prompt';
import { MoveDamagePrompt } from '../prompts/move-damage-prompt';
import { MoveEnergyPrompt } from '../prompts/move-energy-prompt';
import { Prompt } from '../prompts/prompt';
import { PutDamagePrompt } from '../prompts/put-damage-prompt';
import { RemoveDamagePrompt } from '../prompts/remove-damage-prompt';
import { StateUtils } from '../state-utils';
import { Player } from '../state/player';
import { PokemonCardList } from '../state/pokemon-card-list';
import { State } from '../state/state';
import { StoreLike } from '../store-like';

/**
 * Trainer whose effect is currently creating prompts. Kept on Store, not on
 * Prompt, so it is not serialized to the client.
 */
export interface ResolvingTrainerSource {
  player: Player;
  trainerCard: TrainerCard;
}

/** Narrow which trainer effects `IS_TRAINER_TARGET` matches. */
export interface TrainerTargetFilter {
  /** Slot must contain this card, in `cards` or `tools`. */
  card?: Card;
  /** Match only these trainer types. A single type or a list. */
  trainerType?: TrainerType | TrainerType[];
}

/**
 * True when `effect` is a trainer effect still being applied to a Pokemon slot.
 * Pass a card to require that the slot contains it, or a filter to also
 * require a trainer type (for example `TrainerType.SUPPORTER`).
 */
export function IS_TRAINER_TARGET(
  effect: Effect,
  cardOrFilter?: Card | TrainerTargetFilter,
): effect is TrainerTargetEffect & { target: PokemonCardList } {
  if (!(effect instanceof TrainerTargetEffect) || effect.preventDefault || effect.target == null) {
    return false;
  }

  const filter: TrainerTargetFilter = cardOrFilter instanceof Card
    ? { card: cardOrFilter }
    : (cardOrFilter ?? {});

  if (filter.card !== undefined
    && !effect.target.cards.includes(filter.card)
    && !effect.target.tools.includes(filter.card)) {
    return false;
  }

  if (filter.trainerType !== undefined) {
    const allowed = Array.isArray(filter.trainerType) ? filter.trainerType : [filter.trainerType];
    if (!allowed.includes(effect.trainerCard.trainerType)) {
      return false;
    }
  }

  return true;
}

/** Both cancel signals the engine honors when dropping a blocked selection. */
export function BLOCK_TRAINER_TARGET(effect: TrainerTargetEffect): void {
  effect.preventDefault = true;
  effect.target = undefined;
}

export function WAS_TRAINER_TARGET_BLOCKED(effect: TrainerTargetEffect): boolean {
  return effect.preventDefault || effect.target == null;
}

/**
 * Probe whether `trainerCard`'s effect is prevented on `slot`. For trainers
 * that affect a Pokemon without a targeting prompt (e.g. Hypnotoxic Laser,
 * Koga's Trap). Call immediately before mutating that slot; if this returns
 * true, skip only that slot's effect — still play/discard the trainer and keep
 * unrelated effects (own Active, stadium discard, "played this card" markers).
 * Do not rely on ChoosePokemonPrompt existing; prompt results are already
 * filtered by filterTrainerPromptResult.
 */
export function TRAINER_TARGET_BLOCKED(
  store: StoreLike,
  state: State,
  player: Player,
  trainerCard: TrainerCard,
  slot: PokemonCardList,
): boolean {
  const effect = new TrainerTargetEffect(player, trainerCard, slot);
  store.reduceEffect(state, effect);
  if (!WAS_TRAINER_TARGET_BLOCKED(effect)) {
    return false;
  }
  logTrainerTargetBlocked(store, state, effect, trainerCard, slot);
  return true;
}

function logTrainerTargetBlocked(
  store: StoreLike,
  state: State,
  effect: TrainerTargetEffect,
  trainerCard: TrainerCard,
  slot: PokemonCardList,
): void {
  const blocker = effect.blockedBy;
  if (blocker == null) {
    return;
  }

  const owner = StateUtils.findOwner(state, slot);
  store.log(state, slot === owner.active
    ? GameLog.LOG_TRAINER_TARGET_BLOCKED_ACTIVE
    : GameLog.LOG_TRAINER_TARGET_BLOCKED_BENCH, {
    blocker: blocker.name,
    card: trainerCard.name,
    name: owner.name,
    pokemon: slot.getPokemonCard()?.name ?? 'Pokémon',
  });
}

/**
 * Emit TrainerTargetEffect for opponent slots in a trainer-owned prompt result
 * and drop any that blockers cancelled. `null` (cancelled) results are unchanged.
 * The trainer player's own slots are not probed.
 */
export function filterTrainerPromptResult(
  store: StoreLike,
  state: State,
  prompt: Prompt<any>,
  source: ResolvingTrainerSource,
): void {
  const result = prompt.result;
  if (result == null || !Array.isArray(result)) {
    return;
  }

  const resolve = cardTargetResolver(state, prompt);
  const opponentSlots = uniqueOpponentSlots(state, source.player, result, prompt, resolve);
  if (opponentSlots.length === 0) {
    return;
  }

  const blocked = new Set<PokemonCardList>();
  for (const slot of opponentSlots) {
    if (TRAINER_TARGET_BLOCKED(store, state, source.player, source.trainerCard, slot)) {
      blocked.add(slot);
    }
  }
  if (blocked.size === 0) {
    return;
  }

  prompt.result = result.filter(entry => !entryTouchesBlocked(prompt, entry, blocked, resolve));
}

function cardTargetResolver(
  state: State,
  prompt: Prompt<any>,
): (target: CardTarget | undefined) => PokemonCardList | undefined {
  const perspective = state.players.find(p => p.id === prompt.getPerspectivePlayerId());
  return target => {
    if (perspective === undefined || target === undefined) {
      return undefined;
    }
    try {
      return StateUtils.getTarget(state, perspective, target);
    } catch {
      return undefined;
    }
  };
}

function isOpponentSlot(state: State, trainerPlayer: Player, slot: PokemonCardList): boolean {
  const opponent = StateUtils.getOpponent(state, trainerPlayer);
  return slot === opponent.active || opponent.bench.includes(slot);
}

function uniqueOpponentSlots(
  state: State,
  trainerPlayer: Player,
  result: any[],
  prompt: Prompt<any>,
  resolve: (target: CardTarget | undefined) => PokemonCardList | undefined,
): PokemonCardList[] {
  const slots: PokemonCardList[] = [];
  const add = (slot: PokemonCardList | undefined) => {
    if (slot && isOpponentSlot(state, trainerPlayer, slot) && !slots.includes(slot)) {
      slots.push(slot);
    }
  };

  if (prompt instanceof ChoosePokemonPrompt) {
    for (const slot of result) {
      if (slot instanceof PokemonCardList) {
        add(slot);
      }
    }
    return slots;
  }

  for (const entry of result) {
    for (const target of entryTargets(prompt, entry)) {
      add(resolve(target));
    }
  }
  return slots;
}

function entryTargets(prompt: Prompt<any>, entry: any): Array<CardTarget | undefined> {
  if (entry == null || typeof entry !== 'object') {
    return [];
  }
  if (prompt instanceof DiscardEnergyPrompt) {
    return [entry.from];
  }
  if (prompt instanceof MoveEnergyPrompt || prompt instanceof MoveDamagePrompt || prompt instanceof RemoveDamagePrompt) {
    return [entry.from, entry.to];
  }
  if (prompt instanceof PutDamagePrompt) {
    return [entry.target];
  }
  if (prompt instanceof AttachEnergyPrompt) {
    return [entry.to];
  }
  return [];
}

function entryTouchesBlocked(
  prompt: Prompt<any>,
  entry: any,
  blocked: Set<PokemonCardList>,
  resolve: (target: CardTarget | undefined) => PokemonCardList | undefined,
): boolean {
  if (prompt instanceof ChoosePokemonPrompt) {
    return entry instanceof PokemonCardList && blocked.has(entry);
  }
  return entryTargets(prompt, entry).some(target => {
    const slot = resolve(target);
    return slot !== undefined && blocked.has(slot);
  });
}
