/**
 * Prefabs for "effects of Abilities done to" a Pokémon — parallel to effect-of-attack-prefabs.
 *
 * Sources should emit concrete effects (e.g. PlaceDamageCountersEffect with source) and let
 * the engine probe EffectOfAbilityEffect. Blockers call PREVENT_EFFECTS_OF_OPPONENTS_ABILITIES.
 */

import { GameMessage } from '../../game-message';
import { PlayerType, SlotType, CardTarget } from '../actions/play-card-action';
import { SpecialCondition, SuperType } from '../card/card-types';
import { PokemonCard } from '../card/pokemon-card';
import { Power, PowerType } from '../card/pokemon-types';
import { AddSpecialConditionsPowerEffect } from '../effects/check-effects';
import { Effect } from '../effects/effect';
import {
  EffectOfAbilityEffect,
  PlaceDamageCountersEffect,
  PutDamageCountersEffect,
} from '../effects/game-effects';
import { AttachEnergyPrompt } from '../prompts/attach-energy-prompt';
import { ChoosePokemonPrompt } from '../prompts/choose-pokemon-prompt';
import { SelectPrompt } from '../prompts/select-prompt';
import { StateUtils } from '../state-utils';
import { Player } from '../state/player';
import { PokemonCardList } from '../state/pokemon-card-list';
import { State } from '../state/state';
import { StoreLike } from '../store-like';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SWITCH_OUT_OPPONENT_ACTIVE_POKEMON } from './prefabs';

export type ProtectedTarget =
  | PokemonCardList
  | ((target: PokemonCardList, effect: Effect) => boolean);

function resolveProtectedTarget(
  effect: Effect,
  protectedTarget: ProtectedTarget,
): PokemonCardList | undefined {
  const target = getEffectTarget(effect);
  if (!target) {
    return undefined;
  }
  if (typeof protectedTarget === 'function') {
    return protectedTarget(target, effect) ? target : undefined;
  }
  return target === protectedTarget ? target : undefined;
}

function getEffectTarget(effect: Effect): PokemonCardList | undefined {
  if (effect instanceof EffectOfAbilityEffect) {
    return effect.target;
  }
  if (effect instanceof PlaceDamageCountersEffect) {
    return effect.target;
  }
  if (effect instanceof PutDamageCountersEffect) {
    return effect.effectOfAbility.target;
  }
  if (effect instanceof AddSpecialConditionsPowerEffect) {
    return effect.target;
  }
  return undefined;
}

/**
 * True when `effect` is an opponent's Ability effect done to `protectedList`.
 */
export function IS_EFFECT_OF_OPPONENTS_ABILITY_DONE_TO(
  state: State,
  effect: Effect,
  protectedList: PokemonCardList,
): boolean {
  const target = getEffectTarget(effect);
  if (!target || target !== protectedList) {
    return false;
  }

  let targetOwner: Player;
  try {
    targetOwner = StateUtils.findOwner(state, target);
  } catch {
    return false;
  }

  if (effect instanceof EffectOfAbilityEffect) {
    return effect.player === StateUtils.getOpponent(state, targetOwner);
  }

  if (effect instanceof PlaceDamageCountersEffect) {
    if (effect.player === targetOwner) {
      return false;
    }
    if (!(effect.source instanceof PokemonCard)) {
      return false;
    }
    const sourceSlot = StateUtils.findPokemonSlot(state, effect.source);
    if (!sourceSlot || StateUtils.findOwner(state, sourceSlot) !== effect.player) {
      return false;
    }
    return true;
  }

  if (effect instanceof PutDamageCountersEffect) {
    return effect.player === StateUtils.getOpponent(state, targetOwner);
  }

  // Ability-sourced Special Conditions use the Vileplume pattern:
  // effect.player = ability owner, source = ability Pokemon, target = affected list.
  // Attack-sourced ADD_*_TO_PLAYER_ACTIVE uses effect.player = target owner and is not blocked.
  if (effect instanceof AddSpecialConditionsPowerEffect) {
    if (!(effect.source instanceof PokemonCard)) {
      return false;
    }
    const sourceSlot = StateUtils.findPokemonSlot(state, effect.source);
    if (!sourceSlot) {
      return false;
    }
    const sourceOwner = StateUtils.findOwner(state, sourceSlot);
    return (
      effect.player === sourceOwner &&
      sourceOwner === StateUtils.getOpponent(state, targetOwner)
    );
  }

  return false;
}

/**
 * Prevent opponent Ability effects done to the protected target(s).
 * Returns true if the effect was prevented.
 *
 * - EffectOfAbilityEffect → clears `target`
 * - PlaceDamageCountersEffect → `preventDefault`
 * - PutDamageCountersEffect → zeroes damage / clears nested target
 * - AddSpecialConditionsPowerEffect → `preventDefault`
 */
export function PREVENT_EFFECTS_OF_OPPONENTS_ABILITIES(
  state: State,
  effect: Effect,
  protectedTarget: ProtectedTarget,
): boolean {
  const matched = resolveProtectedTarget(effect, protectedTarget);
  if (!matched || !IS_EFFECT_OF_OPPONENTS_ABILITY_DONE_TO(state, effect, matched)) {
    return false;
  }

  // Stealthy Hood / Hide 'n' Sneak: "Abilities" includes Poké-Bodies, Poké-Powers,
  // and Pokémon Powers (older wording for the same rules category).
  if (
    effect instanceof EffectOfAbilityEffect &&
    (
      effect.power.powerType === PowerType.ABILITY ||
      effect.power.powerType === PowerType.POKEBODY ||
      effect.power.powerType === PowerType.POKEPOWER ||
      effect.power.powerType === PowerType.POKEMON_POWER
    )
  ) {
    effect.target = undefined;
    return true;
  }

  if (effect instanceof PlaceDamageCountersEffect) {
    effect.preventDefault = true;
    return true;
  }

  if (effect instanceof PutDamageCountersEffect) {
    effect.damage = 0;
    effect.effectOfAbility.target = undefined;
    effect.preventDefault = true;
    return true;
  }

  if (effect instanceof AddSpecialConditionsPowerEffect) {
    effect.preventDefault = true;
    return true;
  }

  return false;
}

/**
 * Probe whether an Ability can apply its effect to `target`.
 * Returns false if a blocker cleared the probe target.
 */
export function CAN_APPLY_ABILITY_TO_TARGET(
  store: StoreLike,
  state: State,
  abilityOwner: Player,
  power: Power,
  card: PokemonCard,
  target: PokemonCardList,
): boolean {
  const canApplyAbility = new EffectOfAbilityEffect(abilityOwner, power, card, target);
  store.reduceEffect(state, canApplyAbility);
  return !!canApplyAbility.target;
}

/**
 * Ability-sourced flat damage bonus (Blastoise Torrential Pump, etc.).
 * Probes EffectOfAbilityEffect against the damage target so Stealthy Hood /
 * Hide 'n' Sneak can prevent the bonus. Base attack damage is unchanged.
 * Returns true if the bonus was applied.
 */
export function ADD_DAMAGE_FROM_ABILITY(
  store: StoreLike,
  state: State,
  abilityOwner: Player,
  power: Power,
  card: PokemonCard,
  effect: { damage: number; target: PokemonCardList },
  amount: number,
): boolean {
  if (amount === 0) {
    return false;
  }
  if (!CAN_APPLY_ABILITY_TO_TARGET(store, state, abilityOwner, power, card, effect.target)) {
    return false;
  }
  effect.damage += amount;
  return true;
}

export interface GustOpponentBenchedPokemonFromAbilityOptions {
  allowCancel?: boolean;
  blocked?: CardTarget[];
  onSwitched?: (target: PokemonCardList) => void;
}

/**
 * Ability-sourced gust: choose an opponent's Benched Pokémon, probe
 * EffectOfAbilityEffect (Stealthy Hood / Hide 'n' Sneak), then switch if allowed.
 *
 * Do not use for attacks (GustOpponentBenchEffect) or trainers (plain SWITCH_IN…).
 */
export function GUST_OPPONENT_BENCHED_POKEMON_FROM_ABILITY(
  store: StoreLike,
  state: State,
  player: Player,
  power: Power,
  card: PokemonCard,
  options: GustOpponentBenchedPokemonFromAbilityOptions = {},
): State {
  const { allowCancel = false, blocked = [], onSwitched } = options;
  const opponent = StateUtils.getOpponent(state, player);
  if (!opponent.bench.some((bench) => bench.cards.length > 0)) {
    return state;
  }

  return store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_SWITCH,
      PlayerType.TOP_PLAYER,
      [SlotType.BENCH],
      { min: 1, max: 1, allowCancel, blocked },
    ),
    (selected) => {
      if (!selected || selected.length === 0) {
        return;
      }
      const target = selected[0];
      if (!CAN_APPLY_ABILITY_TO_TARGET(store, state, player, power, card, target)) {
        return;
      }
      opponent.switchPokemon(target, store, state);
      if (onSwitched !== undefined) {
        onSwitched(target);
      }
    },
  );
}

const SPECIAL_CONDITION_MESSAGES: Record<SpecialCondition, GameMessage> = {
  [SpecialCondition.ASLEEP]: GameMessage.SPECIAL_CONDITION_ASLEEP,
  [SpecialCondition.BURNED]: GameMessage.SPECIAL_CONDITION_BURNED,
  [SpecialCondition.CONFUSED]: GameMessage.SPECIAL_CONDITION_CONFUSED,
  [SpecialCondition.PARALYZED]: GameMessage.SPECIAL_CONDITION_PARALYZED,
  [SpecialCondition.POISONED]: GameMessage.SPECIAL_CONDITION_POISONED,
};

/**
 * Ability-sourced Special Conditions (Vileplume pattern):
 * probe EffectOfAbilityEffect, then AddSpecialConditionsPowerEffect with ability owner as player.
 * Returns false if a blocker prevented the effect.
 */
export function APPLY_SPECIAL_CONDITIONS_FROM_ABILITY(
  store: StoreLike,
  state: State,
  abilityOwner: Player,
  power: Power,
  card: PokemonCard,
  target: PokemonCardList,
  conditions: SpecialCondition[],
  poisonDamage: number = 10,
): boolean {
  if (!CAN_APPLY_ABILITY_TO_TARGET(store, state, abilityOwner, power, card, target)) {
    return false;
  }
  store.reduceEffect(
    state,
    new AddSpecialConditionsPowerEffect(
      abilityOwner,
      card,
      target,
      conditions,
      poisonDamage,
    ),
  );
  return true;
}

/**
 * Prompt to choose one Special Condition from `conditions`, then apply via Ability.
 */
export function CHOOSE_SPECIAL_CONDITION_FROM_ABILITY(
  store: StoreLike,
  state: State,
  abilityOwner: Player,
  power: Power,
  card: PokemonCard,
  target: PokemonCardList,
  conditions: SpecialCondition[],
): State {
  const options = conditions.map((value) => ({
    message: SPECIAL_CONDITION_MESSAGES[value],
    value,
  }));

  return store.prompt(
    state,
    new SelectPrompt(
      abilityOwner.id,
      GameMessage.CHOOSE_SPECIAL_CONDITION,
      options.map((c) => c.message),
      { allowCancel: false },
    ),
    (choice) => {
      const option = options[choice];
      if (option !== undefined) {
        APPLY_SPECIAL_CONDITIONS_FROM_ABILITY(
          store,
          state,
          abilityOwner,
          power,
          card,
          target,
          [option.value],
        );
      }
    },
  );
}

export interface SwitchOutOpponentActiveFromAbilityOptions {
  allowCancel?: boolean;
  blocked?: CardTarget[];
  onSwitched?: (target: PokemonCardList) => void;
}

export interface AttachEnergyFromOpponentHandFromAbilityOptions {
  allowCancel?: boolean;
  min?: number;
  max?: number;
  /** When true (default), reveal the opponent's hand before choosing Energy. */
  lookAtHand?: boolean;
}

/**
 * Ability-sourced attach from opponent's hand (Xatu Energy Leap).
 * Looks at the hand, chooses Energy, probes EffectOfAbilityEffect against the
 * chosen attach target (Stealthy Hood / Hide 'n' Sneak), then MOVE_CARDS.
 */
export function ATTACH_ENERGY_FROM_OPPONENT_HAND_FROM_ABILITY(
  store: StoreLike,
  state: State,
  player: Player,
  power: Power,
  card: PokemonCard,
  options: AttachEnergyFromOpponentHandFromAbilityOptions = {},
): State {
  const { allowCancel = true, min = 0, max = 1, lookAtHand = true } = options;
  const opponent = StateUtils.getOpponent(state, player);

  if (opponent.hand.cards.length === 0) {
    return state;
  }

  if (lookAtHand) {
    SHOW_CARDS_TO_PLAYER(store, state, player, opponent.hand.cards);
  }

  const hasEnergy = opponent.hand.cards.some(c => c.superType === SuperType.ENERGY);
  if (!hasEnergy) {
    return state;
  }

  return store.prompt(
    state,
    new AttachEnergyPrompt(
      player.id,
      GameMessage.ATTACH_ENERGY_CARDS,
      opponent.hand,
      PlayerType.TOP_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { superType: SuperType.ENERGY },
      { allowCancel, min, max },
    ),
    (transfers) => {
      transfers = transfers || [];
      for (const transfer of transfers) {
        const target = StateUtils.getTarget(state, player, transfer.to);
        if (!CAN_APPLY_ABILITY_TO_TARGET(store, state, player, power, card, target)) {
          continue;
        }
        MOVE_CARDS(store, state, opponent.hand, target, {
          cards: [transfer.card],
          sourceCard: card,
          sourceEffect: power,
        });
      }
    },
  );
}

/**
 * Ability-sourced "opponent switches their Active" (Iron Bundle / Shinx Big Roar).
 * Probes the current Active, then prompts the opponent to choose a Benched replacement.
 */
export function SWITCH_OUT_OPPONENT_ACTIVE_FROM_ABILITY(
  store: StoreLike,
  state: State,
  player: Player,
  power: Power,
  card: PokemonCard,
  options: SwitchOutOpponentActiveFromAbilityOptions = {},
): State {
  const opponent = StateUtils.getOpponent(state, player);
  if (!opponent.bench.some((bench) => bench.cards.length > 0)) {
    return state;
  }
  if (!CAN_APPLY_ABILITY_TO_TARGET(store, state, player, power, card, opponent.active)) {
    return state;
  }
  return SWITCH_OUT_OPPONENT_ACTIVE_POKEMON(store, state, player, {
    allowCancel: options.allowCancel,
    blocked: options.blocked,
    onSwitched: options.onSwitched,
  });
}
