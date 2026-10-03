import { GameError } from '../../game-error';
import { GameMessage } from '../../game-message';
import { Card } from '../card/card';
import { CardType } from '../card/card-types';
import { PokemonCard } from '../card/pokemon-card';
import { Power, PowerType } from '../card/pokemon-types';
import { CheckPokemonPowersEffect } from '../effects/check-effects';
import { Effect } from '../effects/effect';
import { EffectOfAbilityEffect, PowerEffect } from '../effects/game-effects';
import { EndTurnEffect } from '../effects/game-phase-effects';
import { StateUtils } from '../state-utils';
import { Player } from '../state/player';
import { PokemonCardList } from '../state/pokemon-card-list';
import { State } from '../state/state';
import { StoreLike } from '../store-like';
import { PlayerType } from '../actions/play-card-action';

// =============================================================================
// Types & options
// =============================================================================

/**
 * How a suppressor interacts with power discovery.
 *
 * - `'remove'`: Card text like "have no Abilities" — strip matching powers from
 *   `CheckPokemonPowersEffect` (Use Ability sees UNKNOWN_POWER / UI hides them)
 *   and throw on `PowerEffect`.
 * - `'block'`: Card text like "can't use any Poké-Powers" — leave powers in the
 *   discovery list, but throw on `PowerEffect` (`CANNOT_USE_POWER`).
 */
export type AbilityLockMode = 'remove' | 'block';

/**
 * Options for ability-lock / ability-block enforcement.
 *
 * Prefer {@link HANDLE_ABILITY_LOCK} for "have no Abilities" and
 * {@link HANDLE_ABILITY_BLOCK} for "can't use" wording.
 */
export interface AbilityLockOptions {
  /**
   * `'remove'` strips powers from discovery; `'block'` only prevents use.
   * Default: `'remove'`.
   */
  mode?: AbilityLockMode;
  /** Power types suppressed by the lock. Default: `[PowerType.ABILITY]`. */
  powerTypes?: PowerType[];
  /** Power names that remain usable (e.g. `'Garbotoxin'`). */
  exemptPowerNames?: string[];
  /** Honor `power.exemptFromAbilityLock`. Default: `true`. */
  respectExemptFlag?: boolean;
  /**
   * Honor `power.exemptFromInitialize` (Iron Thorns ex Initialization).
   * Default: `false`.
   */
  respectExemptFromInitialize?: boolean;
  /**
   * When `true`, only powers with `knocksOutSelf` are locked (Psyduck/Golduck Damp).
   * Default: `false`.
   */
  onlyKnocksOutSelf?: boolean;
  /**
   * When `true`, powers with `useFromHand` are not locked.
   * Default: `false` (Hex Maniac / Silent Lab style — hand is locked too).
   */
  allowUseFromHand?: boolean;
  /**
   * When `true`, powers with `useFromDiscard` are not locked.
   * Default: `false`.
   */
  allowUseFromDiscard?: boolean;
  /** Error thrown when blocking a PowerEffect. Default: `CANNOT_USE_POWER`. */
  error?: GameMessage;
}

export interface AbilityLockContext {
  player: Player;
  card: PokemonCard;
  power?: Power;
  checkEffect?: CheckPokemonPowersEffect;
  powerEffect?: PowerEffect;
}

// =============================================================================
// Power-type constants
// =============================================================================

/** Common power-type sets for older-era locks. */
export const POKEPOWER_TYPES = [PowerType.POKEPOWER];

export const POKEBODY_TYPES = [PowerType.POKEBODY];

export const POKEPOWER_AND_BODY_TYPES = [PowerType.POKEPOWER, PowerType.POKEBODY];

export const POKEMON_POWER_TYPES = [PowerType.POKEMON_POWER];

export const ABILITY_TYPES = [PowerType.ABILITY];

// =============================================================================
// Shared internals
// =============================================================================

const DEFAULT_POWER_TYPES = [PowerType.ABILITY];

function resolveOptions(options?: AbilityLockOptions): Required<AbilityLockOptions> {
  return {
    mode: options?.mode ?? 'remove',
    powerTypes: options?.powerTypes ?? DEFAULT_POWER_TYPES,
    exemptPowerNames: options?.exemptPowerNames ?? [],
    respectExemptFlag: options?.respectExemptFlag ?? true,
    respectExemptFromInitialize: options?.respectExemptFromInitialize ?? false,
    onlyKnocksOutSelf: options?.onlyKnocksOutSelf ?? false,
    allowUseFromHand: options?.allowUseFromHand ?? false,
    allowUseFromDiscard: options?.allowUseFromDiscard ?? false,
    error: options?.error ?? GameMessage.CANNOT_USE_POWER,
  };
}

// =============================================================================
// Subjectivity / filter / block primitives
// =============================================================================

/**
 * Returns whether a power should be stripped/blocked when an ability lock is active.
 * Does not evaluate whether the lock itself is active — callers supply that.
 */
export function IS_POWER_SUBJECT_TO_ABILITY_LOCK(
  power: Power,
  options?: AbilityLockOptions,
): boolean {
  const opts = resolveOptions(options);

  if (!opts.powerTypes.includes(power.powerType)) {
    return false;
  }
  if (opts.onlyKnocksOutSelf && !power.knocksOutSelf) {
    return false;
  }
  if (opts.respectExemptFlag && power.exemptFromAbilityLock) {
    return false;
  }
  if (opts.respectExemptFromInitialize && power.exemptFromInitialize) {
    return false;
  }
  if (opts.exemptPowerNames.includes(power.name)) {
    return false;
  }
  if (opts.allowUseFromHand && power.useFromHand) {
    return false;
  }
  if (opts.allowUseFromDiscard && power.useFromDiscard) {
    return false;
  }
  return true;
}

/**
 * Filter locked abilities out of a CheckPokemonPowersEffect.
 */
export function FILTER_LOCKED_ABILITIES(
  effect: Effect,
  isLocked: (check: CheckPokemonPowersEffect) => boolean,
  options?: AbilityLockOptions,
): void {
  if (!(effect instanceof CheckPokemonPowersEffect)) {
    return;
  }
  if (!isLocked(effect)) {
    return;
  }
  effect.powers = effect.powers.filter(power => !IS_POWER_SUBJECT_TO_ABILITY_LOCK(power, options));
}

/**
 * Throw if a PowerEffect is using a locked ability.
 */
export function BLOCK_IF_ABILITY_LOCKED(
  effect: Effect,
  isLocked: (powerEffect: PowerEffect) => boolean,
  options?: AbilityLockOptions,
): void {
  if (!(effect instanceof PowerEffect)) {
    return;
  }
  if (!IS_POWER_SUBJECT_TO_ABILITY_LOCK(effect.power, options)) {
    return;
  }
  if (!isLocked(effect)) {
    return;
  }
  throw new GameError(resolveOptions(options).error);
}

// =============================================================================
// Suppression handlers
// =============================================================================

function HANDLE_ABILITY_SUPPRESSION(
  effect: Effect,
  isLocked: (ctx: AbilityLockContext) => boolean,
  options?: AbilityLockOptions,
): void {
  const opts = resolveOptions(options);

  if (opts.mode === 'remove') {
    FILTER_LOCKED_ABILITIES(
      effect,
      check => isLocked({
        player: check.player,
        card: check.target,
        checkEffect: check,
      }),
      options,
    );
  }

  BLOCK_IF_ABILITY_LOCKED(
    effect,
    powerEffect => isLocked({
      player: powerEffect.player,
      card: powerEffect.card,
      power: powerEffect.power,
      powerEffect,
    }),
    options,
  );
}

/**
 * "Have no Abilities" suppressor (Path to the Peak, Hex Maniac, Silent Lab, etc.).
 *
 * Strips matching powers from `CheckPokemonPowersEffect` and throws on `PowerEffect`.
 * For "can't use" wording, use {@link HANDLE_ABILITY_BLOCK} instead.
 */
export function HANDLE_ABILITY_LOCK(
  effect: Effect,
  isLocked: (ctx: AbilityLockContext) => boolean,
  options?: AbilityLockOptions,
): void {
  HANDLE_ABILITY_SUPPRESSION(effect, isLocked, { ...options, mode: options?.mode ?? 'remove' });
}

/**
 * "Can't use" suppressor (Mesprit Psychic Bind, Gardevoir Psychic Lock, etc.).
 *
 * Powers remain discoverable in `CheckPokemonPowersEffect`; activation throws on
 * `PowerEffect` (typically `CANNOT_USE_POWER`).
 */
export function HANDLE_ABILITY_BLOCK(
  effect: Effect,
  isLocked: (ctx: AbilityLockContext) => boolean,
  options?: Omit<AbilityLockOptions, 'mode'>,
): void {
  HANDLE_ABILITY_SUPPRESSION(effect, isLocked, { ...options, mode: 'block' });
}

/**
 * Enforce attack-sourced ability locks stored on PokemonCardList / Player
 * (Gastro Acid, Shadow Stitching). Call from the store before card handlers.
 */
export function OPPONENT_WEAKNESS_AURA_POWER(type: CardType): Power {
  const symbol = type === CardType.PSYCHIC ? '[P]' : '[?]';
  return {
    name: 'Star Cipher',
    powerType: PowerType.ABILITY,
    text: `The Weakness of each of your opponent's Pokémon in play is now ${symbol}. (The amount of Weakness doesn't change.)`,
  };
}

export function APPLY_ATTACK_EFFECT_ABILITY_LOCKS(state: State, effect: Effect): void {
  if (effect instanceof CheckPokemonPowersEffect
    && effect.target.whileInPlayOpponentWeakness !== undefined
    && StateUtils.isPokemonInPlay(effect.player, effect.target)) {
    effect.powers.push(OPPONENT_WEAKNESS_AURA_POWER(effect.target.whileInPlayOpponentWeakness));
  }

  HANDLE_ABILITY_LOCK(effect, ({ card }) => {
    try {
      const cardList = StateUtils.findCardList(state, card);
      return cardList instanceof PokemonCardList && cardList.noAbilities;
    } catch {
      return false;
    }
  }, {
    error: GameMessage.BLOCKED_BY_EFFECT,
  });

  for (const player of state.players) {
    for (const suppression of player.attackPowerSuppressions) {
      const handler = suppression.mode === 'block' ? HANDLE_ABILITY_BLOCK : HANDLE_ABILITY_LOCK;
      handler(effect, ctx => ctx.player === player, {
        powerTypes: suppression.powerTypes,
        error: suppression.mode === 'block'
          ? GameMessage.CANNOT_USE_POWER
          : GameMessage.BLOCKED_BY_EFFECT,
      });
    }
  }
}

// =============================================================================
// Markers
// =============================================================================

/**
 * Place an ability-lock marker on one or more players (Hex Maniac / Cologne style).
 */
export function APPLY_ABILITY_LOCK_MARKERS(
  marker: string,
  source: Card,
  ...targets: Player[]
): void {
  for (const target of targets) {
    target.marker.addMarker(marker, source);
  }
}

/**
 * Clear a timed ability lock at the end of the opponent's turn
 * ("Until the end of your opponent's next turn" — Hex Maniac, Shadow Stitching).
 */
export function CLEAR_ABILITY_LOCK_AT_END_OF_OPPONENTS_TURN(
  effect: Effect,
  state: State,
  marker: string,
  source: Card,
): void {
  if (!(effect instanceof EndTurnEffect)) {
    return;
  }

  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  let owner: Player;
  try {
    owner = StateUtils.findOwner(state, StateUtils.findCardList(state, source));
  } catch {
    return;
  }

  if (player !== owner) {
    player.marker.removeMarker(marker, source);
    opponent.marker.removeMarker(marker, source);
  }
}

/**
 * Clear a timed ability lock at the end of your turn
 * ("Until the end of your turn" — Canceling Cologne).
 */
export function CLEAR_ABILITY_LOCK_AT_END_OF_YOUR_TURN(
  effect: Effect,
  state: State,
  marker: string,
  source: Card,
): void {
  if (!(effect instanceof EndTurnEffect)) {
    return;
  }

  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  let owner: Player;
  try {
    owner = StateUtils.findOwner(state, StateUtils.findCardList(state, source));
  } catch {
    return;
  }

  if (player === owner) {
    player.marker.removeMarker(marker, source);
    opponent.marker.removeMarker(marker, source);
  }
}

/**
 * Convenience predicate: true when `player` or their opponent has the marker.
 * Used by global locks like Hex Maniac that mark both players.
 */
export function HAS_ABILITY_LOCK_MARKER(
  marker: string,
  player: Player,
  source: Card,
  state: State,
): boolean {
  const opponent = StateUtils.getOpponent(state, player);
  return player.marker.hasMarker(marker, source) || opponent.marker.hasMarker(marker, source);
}

// =============================================================================
// Locker presence
// =============================================================================

/**
 * Returns true if `lockerCard` is currently in play for either player.
 */
export function IS_ABILITY_LOCKER_IN_PLAY(
  state: State,
  player: Player,
  lockerCard: PokemonCard,
): boolean {
  const opponent = StateUtils.getOpponent(state, player);
  let inPlay = false;
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
    if (card === lockerCard) {
      inPlay = true;
    }
  });
  opponent.forEachPokemon(PlayerType.TOP_PLAYER, (_cardList, card) => {
    if (card === lockerCard) {
      inPlay = true;
    }
  });
  return inPlay;
}

/**
 * Returns true if `lockerCard` is Active for either player.
 */
export function IS_ABILITY_LOCKER_ACTIVE(
  state: State,
  player: Player,
  lockerCard: PokemonCard,
): boolean {
  const opponent = StateUtils.getOpponent(state, player);
  return player.active.getPokemonCard() === lockerCard
    || opponent.active.getPokemonCard() === lockerCard;
}

// =============================================================================
// Activation order
// =============================================================================

function getAbilityLockActivationOrder(state: State, card: PokemonCard): number {
  try {
    const list = StateUtils.findCardList(state, card);
    if (list instanceof PokemonCardList) {
      return list.abilityLockActivationOrder;
    }
  } catch {
    // not in play
  }
  return 0;
}

function isTurnPlayersCard(state: State, card: PokemonCard): boolean {
  try {
    const owner = StateUtils.findOwner(state, StateUtils.findCardList(state, card));
    return state.players[state.activePlayer] === owner;
  } catch {
    return false;
  }
}

/**
 * Stamp activation order when an `abilityLock` Pokemon becomes Active.
 */
export function STAMP_ABILITY_LOCK_ACTIVATION(
  state: State,
  slot: PokemonCardList,
  card: PokemonCard,
): void {
  if (!card.powers.some(p => p.abilityLock)) {
    return;
  }
  state.abilityLockOrderCounter += 1;
  slot.abilityLockActivationOrder = state.abilityLockOrderCounter;
}

/**
 * Clear activation order when an ability locker leaves the Active Spot.
 */
export function CLEAR_ABILITY_LOCK_ACTIVATION(
  state: State,
  card: PokemonCard,
): void {
  try {
    const list = StateUtils.findCardList(state, card);
    if (list instanceof PokemonCardList) {
      list.abilityLockActivationOrder = 0;
    }
  } catch {
    // ignore
  }
}

/**
 * Both starting Actives activate simultaneously — same order, turn-player wins ties.
 */
export function STAMP_STARTING_ABILITY_LOCKS(state: State): void {
  state.abilityLockOrderCounter += 1;
  const order = state.abilityLockOrderCounter;
  for (const player of state.players) {
    const card = player.active.getPokemonCard();
    if (card?.powers.some(p => p.abilityLock)) {
      player.active.abilityLockActivationOrder = order;
    }
  }
}

// =============================================================================
// Apply probes
// =============================================================================

/**
 * Whether `suppressor` may shut off `target`'s ability-lock Ability.
 * Earlier activation wins; simultaneous → turn player's locker wins.
 */
export function CAN_SUPPRESS_ABILITY_LOCKER(
  state: State,
  suppressor: PokemonCard,
  target: PokemonCard,
): boolean {
  const sOrder = getAbilityLockActivationOrder(state, suppressor);
  const tOrder = getAbilityLockActivationOrder(state, target);

  if (sOrder === 0 && tOrder === 0) {
    return isTurnPlayersCard(state, suppressor);
  }
  if (sOrder === 0) {
    return false;
  }
  if (tOrder === 0) {
    return true;
  }
  if (sOrder < tOrder) {
    return true;
  }
  if (sOrder > tOrder) {
    return false;
  }
  return isTurnPlayersCard(state, suppressor);
}

/**
 * Probe whether a locker Pokemon's own locking ability can currently apply.
 * Use inside `HANDLE_ABILITY_LOCK` callbacks for Ability-sourced locks.
 */
export function CAN_APPLY_LOCKER_ABILITY(
  store: StoreLike,
  state: State,
  player: Player,
  lockerCard: PokemonCard,
  lockerPower: Power,
): boolean {
  try {
    store.reduceEffect(state, new PowerEffect(player, lockerPower, lockerCard));
    return true;
  } catch {
    return false;
  }
}

/**
 * First-in-wins check against other ability lockers, then {@link CAN_APPLY_LOCKER_ABILITY}.
 * Prefer this over bare `CAN_APPLY_LOCKER_ABILITY` in Active ability-lock callbacks.
 */
export function LOCKER_ABILITY_APPLIES(
  store: StoreLike,
  state: State,
  player: Player,
  lockerCard: PokemonCard,
  lockerPower: Power,
  targetCard: PokemonCard,
): boolean {
  if (
    lockerCard.powers.some(p => p.abilityLock)
    && targetCard.powers.some(p => p.abilityLock)
    && !CAN_SUPPRESS_ABILITY_LOCKER(state, lockerCard, targetCard)
  ) {
    return false;
  }
  return CAN_APPLY_LOCKER_ABILITY(store, state, player, lockerCard, lockerPower);
}

/**
 * Probe EffectOfAbilityEffect against the target card list.
 * Returns false if the lock cannot be applied to that Pokemon.
 * If the card is not on a PokemonCardList (hand/discard), returns true.
 */
export function CAN_APPLY_LOCK_TO_TARGET(
  store: StoreLike,
  state: State,
  abilityOwner: Player,
  lockerCard: PokemonCard,
  lockerPower: Power,
  targetCard: PokemonCard,
): boolean {
  try {
    const cardList = StateUtils.findCardList(state, targetCard);
    if (!(cardList instanceof PokemonCardList)) {
      return true;
    }
    const canApplyAbility = new EffectOfAbilityEffect(abilityOwner, lockerPower, lockerCard, cardList);
    canApplyAbility.target = cardList;
    store.reduceEffect(state, canApplyAbility);
    return !!canApplyAbility.target;
  } catch {
    return false;
  }
}

