import { GameMessage, GameLog } from "../../game-message";
import { PlayerType } from "../actions/play-card-action";
import { Card } from "../card/card";
import { TrainerType, CardType } from "../card/card-types";
import { PokemonCard } from "../card/pokemon-card";
import { TrainerCard } from "../card/trainer-card";
import { AbstractAttackEffect, PutDamageEffect, PutCountersEffect, DealDamageEffect, ApplyWeaknessEffect, AfterDamageEffect } from "../effects/attack-effects";
import { Effect } from "../effects/effect";
import { PreventDamageOptions, PlayLockOptions, KnockOutIfDamagedOptions, preventRetreatEffect, selfPreventRetreatEffect, preventRetreatWhileActiveEffect, preventDamageEffect, preventEffectsOfAttacksEffect, preventDamageAndEffectsToAllYourPokemonEffect, coinFlipPreventAttackDamageDuringOpponentsNextTurnEffect, cannotBeSpecialConditionedDuringOpponentsNextTurnEffect, shouldPreventAttackEffects, preventAttackEffect, preventHealOnDefendingDuringOpponentsNextTurnEffect, coinFlipCancelAttackEffect, opponentPokemonCannotUseAttackEffect, opponentPokemonCanOnlyUseAttackEffect, preventAttackUntilLeavesActiveEffect, reduceDamageEffect, reduceDamageAfterWeaknessEffect, playLockEffect, stadiumAndToolHaveNoEffectEffect, coinFlipCancelTrainerPlayEffect, increaseDefendingPokemonAttackCostNextTurnEffect, increaseDefendingPokemonAttackCostWhileActiveEffect, increaseDefendingPokemonRetreatCostNextTurnEffect, defendingPokemonTakesMoreDamageDuringAttackerNextTurnEffect, defendingPokemonTakesDamageOnEnergyAttachFromHandNextTurnEffect, cannotAttachEnergyFromHandToDefendingNextTurnEffect, energyAttachFromHandConsequenceNextTurnEffect, defendingPokemonWeaknessIsNowEffect, thisPokemonHasNoWeaknessDuringOpponentsNextTurnEffect, thisPokemonHasNoRetreatCostDuringYourNextTurnEffect, knockOutIfDamagedDuringAttackerNextTurnEffect, surviveOnTenHpDuringOpponentsNextTurnEffect, retaliateOnDamageDuringOpponentsNextTurnEffect, extraPrizesIfKnockedOutDuringAttackerNextTurnEffect, denyPrizesIfKnockedOutDuringOpponentsNextTurnEffect, discardAttackerEnergyIfKnockedOutDuringOpponentsNextTurnEffect, opponentCannotDrawAtStartOfNextTurnEffect, yourPokemonCannotAttackDuringYourNextTurnEffect, opponentPokemonCannotAttackDuringTheirNextTurnEffect, ignoreAttackCostsForTypesDuringYourNextTurnEffect, cannotEvolveDefendingNextTurnEffect, defendingPokemonHasNoAbilitiesUntilEndOfAttackerNextTurnEffect, opponentPokemonHaveNoAbilitiesEffect, OpponentPowerSuppressionOptions } from "../effects/effect-of-attack-effects";
import { AttackEffect } from "../effects/game-effects";
import { ChooseAttackPrompt } from "../prompts/choose-attack-prompt";
import { StateUtils } from "../state-utils";
import { Player } from "../state/player";
import { PokemonCardList, SurviveOnTenHpOptions, RetaliateOnDamageOptions } from "../state/pokemon-card-list";
import { State } from "../state/state";
import { StoreLike } from "../store-like";
import { COIN_FLIP_PROMPT, IS_ABILITY_BLOCKED, IS_TOOL_BLOCKED, DAMAGED_FROM_FULL_HP } from "./prefabs";

export type { PreventDamageOptions, PlayLockOptions, KnockOutIfDamagedOptions, OpponentPowerSuppressionOptions };

// =============================================================================
// Effect-of-attack wrappers — Retreat locks
// =============================================================================

/**
 * Creates and reduces a prevent retreat effect for the given source card.
 * This is commonly used in Pokemon card effects that prevent the defending Pokemon from retreating.
 * @param store The store instance
 * @param state The current game state
 * @param effect The original attack effect that triggered this
 * @param source The source card that created this effect
 * @returns The updated game state
 */
export function BLOCK_RETREAT(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  const retreatEffect = preventRetreatEffect(effect, source);
  return store.reduceEffect(state, retreatEffect);
}

/**
 * Creates and reduces a self-prevent-retreat effect for the given source card.
 * This is used for effects like "This Pokemon can't retreat during your next turn."
 * Unlike BLOCK_RETREAT which targets the opponent, this targets the attacking Pokemon itself.
 * @param store The store instance
 * @param state The current game state
 * @param effect The original attack effect that triggered this
 * @param source The source card that created this effect
 * @returns The updated game state
 */
export function BLOCK_SELF_RETREAT(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  const retreatEffect = selfPreventRetreatEffect(effect, source);
  return store.reduceEffect(state, retreatEffect);
}

export function OPPONENT_CANNOT_RETREAT_UNTIL_LEAVES_ACTIVE(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): State {
  return store.reduceEffect(state, preventRetreatWhileActiveEffect(effect));
}

// =============================================================================
// Effect-of-attack wrappers — Damage & effect prevention
// =============================================================================

/**
 * Creates and reduces a prevent damage effect for the given source card.
 * This is commonly used in Pokemon card effects that prevent damage during the opponent's next turn.
 * @param store The store instance
 * @param state The current game state
 * @param effect The original attack effect that triggered this
 * @param source The source card that created this effect
 * @returns The updated game state
 */
export function PREVENT_DAMAGE(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options?: PreventDamageOptions,
): State {
  const damageEffect = preventDamageEffect(effect, source, options);
  return store.reduceEffect(state, damageEffect);
}

/**
 * During the opponent's next turn, prevents effects of attacks done to this Pokémon.
 * Damage is not an effect — pair with {@link PREVENT_DAMAGE} when card text blocks both.
 * Enforcement uses the same rules as Mist Energy and is handled by the attack reducer.
 */
export function PREVENT_EFFECTS_OF_ATTACKS(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options?: PreventDamageOptions,
): State {
  const effectsEffect = preventEffectsOfAttacksEffect(effect, source, options);
  return store.reduceEffect(state, effectsEffect);
}

/**
 * If any damage is done to this Pokémon by attacks during your opponent's next turn,
 * flip a coin. If heads, prevent that damage.
 */
export function FLIP_COIN_TO_PREVENT_DAMAGE_WHEN_DAMAGED_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, coinFlipPreventAttackDamageDuringOpponentsNextTurnEffect(effect, source));
}

/**
 * As long as this Pokémon is Active, its attacks do `bonus` more damage.
 * `cap` limits the total added this way (Haxorus Dragon Dance).
 * Cleared when this Pokémon leaves the Active slot.
 */
export function THIS_POKEMON_ATTACKS_DO_MORE_DAMAGE_WHILE_ACTIVE(
  effect: AttackEffect,
  bonus: number,
  cap?: number,
): void {
  const slot = effect.player.active;
  const next = slot.whileActiveAttackDamageBonus + bonus;
  slot.whileActiveAttackDamageBonus = cap === undefined ? next : Math.min(cap, next);
}

/**
 * During the chosen Pokémon's next turn, its attacks do `bonus` more damage
 * to the opponent's Active (before Weakness and Resistance).
 */
export function ARM_OUTGOING_ATTACK_DAMAGE_BONUS_NEXT_TURN(
  target: PokemonCardList,
  bonus: number,
): void {
  target.outgoingAttackDamageBonusNextTurnPending = bonus;
}

/**
 * During this Pokémon's next turn, a named attack flips `flips` coins instead of its usual count.
 */
export function ARM_NEXT_TURN_COIN_FLIP_COUNT(
  source: PokemonCardList,
  attackName: string,
  flips: number,
  sourceCardName: string,
): void {
  source.nextTurnCoinFlipCountPending = { attackName, flips, sourceCardName };
}

/**
 * During your next turn, you may attach any number of Energy cards from your hand.
 * Armed this turn; active only on the following turn.
 */
export function DURING_YOUR_NEXT_TURN_ATTACH_ANY_NUMBER_OF_ENERGY(
  effect: AttackEffect,
): void {
  effect.player.unlimitedEnergyAttachTurnsRemaining = 2;
  effect.player.usedDragonsWish = false;
}

/**
 * For the rest of this game, the opponent can't use GX attacks.
 */
export function OPPONENT_CANNOT_USE_GX_ATTACKS_FOR_REST_OF_GAME(
  effect: AttackEffect,
): void {
  effect.opponent.cannotUseGXAttacks = true;
}

/**
 * This attack can't be used again as long as this Pokémon stays in play,
 * including while it is on the Bench. Cleared when the card is played again.
 */
export function THIS_ATTACK_CANNOT_BE_USED_AGAIN_WHILE_IN_PLAY(
  effect: AttackEffect,
  attackName: string,
): void {
  const card = effect.source.getPokemonCard();
  if (card) {
    card.cannotUseAttackUntilLeavesPlay = attackName;
  }
}

/**
 * Until this Pokémon leaves play, it gains an Ability that changes each of the
 * opponent's Pokémon's Weakness to `type`.
 */
export function THIS_POKEMON_GAINS_OPPONENT_WEAKNESS_ABILITY_WHILE_IN_PLAY(
  effect: AttackEffect,
  type: CardType,
): void {
  const card = effect.source.getPokemonCard();
  if (card) {
    card.whileInPlayOpponentWeakness = type;
  }
}

export function COIN_FLIPS_FOR_ATTACK(
  source: PokemonCardList,
  attackName: string,
  defaultFlips: number,
): number {
  const override = source.nextTurnCoinFlipCount;
  const card = source.getPokemonCard();
  if (!override || !card || override.attackName !== attackName || override.sourceCardName !== card.fullName) {
    return defaultFlips;
  }
  return override.flips;
}

/**
 * During your opponent's next turn, this Pokémon can't be affected by any Special Conditions.
 */
export function THIS_POKEMON_CANNOT_BE_SPECIAL_CONDITIONED_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, cannotBeSpecialConditionedDuringOpponentsNextTurnEffect(effect, source));
}

export function PREVENT_DAMAGE_AND_EFFECTS_TO_ALL_YOUR_POKEMON(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options?: PreventDamageOptions,
): State {
  return store.reduceEffect(state, preventDamageAndEffectsToAllYourPokemonEffect(effect, source, options));
}

/**
 * Flip a coin. If heads, prevent all damage to this Pokémon during the opponent's next turn.
 * (Any other effects of attacks still happen.) — Stiffen / Harden style.
 * Arming is an EffectOfAttack ({@link PreventDamageEffect}).
 */
export function FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options?: PreventDamageOptions,
): State {
  return COIN_FLIP_PROMPT(store, state, effect.player, result => {
    if (result) {
      PREVENT_DAMAGE(store, state, effect, source, options);
    }
  });
}

/**
 * Flip a coin. If heads, prevent all effects of attacks, including damage,
 * done to this Pokémon during the opponent's next turn. — Agility / Detect style.
 * Arming uses {@link PreventDamageEffect} + {@link PreventEffectsOfAttacksEffect}.
 */
export function FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options?: PreventDamageOptions,
): State {
  return COIN_FLIP_PROMPT(store, state, effect.player, result => {
    if (result) {
      PREVENT_DAMAGE(store, state, effect, source, options);
      PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, source, options);
    }
  });
}

/**
 * Fly style: Flip a coin. If tails, this attack does nothing.
 * If heads, prevent all effects of attacks, including damage, during the opponent's next turn.
 */
export function FLIP_COIN_FOR_FLY(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options?: PreventDamageOptions,
): State {
  return COIN_FLIP_PROMPT(store, state, effect.player, result => {
    if (!result) {
      effect.damage = 0;
      return;
    }
    PREVENT_DAMAGE(store, state, effect, source, options);
    PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, source, options);
  });
}

/**
 * Blocks non-damage attack effects on a Pokémon that has
 * {@link PokemonCardList.preventEffectsOfAttacksNextTurn} active.
 * Ref: set-temporal-forces/mist-energy.ts
 */
export function BLOCK_EFFECTS_OF_ATTACKS_IF_PREVENTED(state: State, effect: Effect): boolean {
  return shouldPreventAttackEffects(state, effect);
}

export function THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  reduction: number,
): State {
  effect.player.active.damageReductionNextTurn = Math.max(0, reduction);
  return state;
}

export function THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN_BEFORE_WEAKNESS_AND_RESISTANCE(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  reduction: number,
): State {
  effect.player.active.damageReductionBeforeWeaknessNextTurn = Math.max(0, reduction);
  return state;
}

export interface BenchProtectionOptions {
  owner: Player;
  source?: PokemonCard | TrainerCard;
  includeSourcePokemon?: boolean;
  targetFilter?: (target: PokemonCardList, pokemonCard: PokemonCard | undefined) => boolean;
  checkBlocked?: boolean;
}

function isProtectionSourceInPlay(
  state: State,
  owner: Player,
  source?: PokemonCard | TrainerCard,
): boolean {
  if (source === undefined) {
    return true;
  }

  if (source instanceof PokemonCard) {
    let inPlay = false;
    owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, pokemonCard) => {
      if (pokemonCard === source) {
        inPlay = true;
      }
    });
    return inPlay;
  }

  if (source.trainerType === TrainerType.STADIUM) {
    return StateUtils.getStadiumCard(state) === source;
  }

  if (source.trainerType === TrainerType.TOOL) {
    let attached = false;
    owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      if (cardList.tools.includes(source)) {
        attached = true;
      }
    });
    return attached;
  }

  return false;
}

function isBenchProtectionBlocked(
  store: StoreLike,
  state: State,
  owner: Player,
  source?: PokemonCard | TrainerCard,
  checkBlocked: boolean = true,
): boolean {
  if (!checkBlocked || source === undefined) {
    return false;
  }

  if (source instanceof PokemonCard) {
    return IS_ABILITY_BLOCKED(store, state, owner, source);
  }

  if (source.trainerType === TrainerType.TOOL) {
    return IS_TOOL_BLOCKED(store, state, owner, source);
  }

  return false;
}

function isProtectedBenchedTarget(
  state: State,
  effect: AbstractAttackEffect,
  options: BenchProtectionOptions,
): boolean {
  const { owner, source, includeSourcePokemon = false, targetFilter } = options;

  if (!owner.bench.includes(effect.target)) {
    return false;
  }

  const attackerOwner = StateUtils.findOwner(state, effect.source);
  if (attackerOwner === owner) {
    return false;
  }

  if (
    !includeSourcePokemon &&
    source instanceof PokemonCard &&
    effect.target.cards.includes(source)
  ) {
    return false;
  }

  const targetPokemon = effect.target.getPokemonCard();
  if (targetFilter && !targetFilter(effect.target, targetPokemon)) {
    return false;
  }

  return true;
}

/**
 * Compound helper for text like:
 * "Prevent all damage done to your other Benched Pokémon by attacks from your opponent's Pokémon."
 */
export function PREVENT_DAMAGE_TO_YOUR_BENCHED_POKEMON_FROM_OPPONENT_ATTACKS(
  store: StoreLike,
  state: State,
  effect: Effect,
  options: BenchProtectionOptions,
): void {
  if (!(effect instanceof PutDamageEffect) && !(effect instanceof PutCountersEffect)) {
    return;
  }

  if (!isProtectionSourceInPlay(state, options.owner, options.source)) {
    return;
  }

  if (isBenchProtectionBlocked(store, state, options.owner, options.source, options.checkBlocked)) {
    return;
  }

  if (!isProtectedBenchedTarget(state, effect, options)) {
    return;
  }

  effect.preventDefault = true;
}

/**
 * Compound helper for text like:
 * "Prevent all effects of attacks done to your other Benched Pokémon
 * by attacks from your opponent's Pokémon. (Damage is not an effect.)"
 */
export function PREVENT_EFFECTS_TO_YOUR_BENCHED_POKEMON_FROM_OPPONENT_ATTACKS(
  store: StoreLike,
  state: State,
  effect: Effect,
  options: BenchProtectionOptions,
): void {
  if (!(effect instanceof AbstractAttackEffect)) {
    return;
  }

  if (
    effect instanceof DealDamageEffect ||
    effect instanceof PutDamageEffect ||
    effect instanceof PutCountersEffect ||
    effect instanceof ApplyWeaknessEffect ||
    effect instanceof AfterDamageEffect
  ) {
    return;
  }

  if (!isProtectionSourceInPlay(state, options.owner, options.source)) {
    return;
  }

  if (isBenchProtectionBlocked(store, state, options.owner, options.source, options.checkBlocked)) {
    return;
  }

  if (!isProtectedBenchedTarget(state, effect, options)) {
    return;
  }

  effect.preventDefault = true;
}

// =============================================================================
// Effect-of-attack wrappers — Attack restrictions
// =============================================================================

/**
 * During the opponent's next turn, the Defending Pokémon can't use attacks.
 */
export function DEFENDING_POKEMON_CANNOT_ATTACK(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  const attackEffect = preventAttackEffect(effect, source);
  return store.reduceEffect(state, attackEffect);
}

/**
 * During the opponent's next turn, the Defending Pokémon can't be healed.
 */
export function BLOCK_HEALING_ON_DEFENDING_POKEMON_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  const healBlockEffect = preventHealOnDefendingDuringOpponentsNextTurnEffect(effect, source);
  return store.reduceEffect(state, healBlockEffect);
}

/**
 * During your opponent's next turn, if the Defending Pokémon tries to attack,
 * they flip `coinFlips` coins (default 1). If any is tails, that attack does nothing.
 * Covers Smokescreen, Sand-Attack, Ink Spit, Sticky Smokescreen (2 flips), etc.
 */
export function DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  coinFlips: number = 1,
): State {
  const cancelEffect = coinFlipCancelAttackEffect(effect, source, coinFlips);
  return store.reduceEffect(state, cancelEffect);
}

/**
 * Flip a coin. If heads, the Defending Pokémon can't attack during your opponent's next turn.
 */
export function FLIP_COIN_IF_HEADS_DEFENDING_POKEMON_CANNOT_ATTACK(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return COIN_FLIP_PROMPT(store, state, effect.player, result => {
    if (result) {
      DEFENDING_POKEMON_CANNOT_ATTACK(store, state, effect, source);
    }
  });
}

/**
 * Prompts the player to choose one of the opponent's Active Pokemon's attacks to disable
 * during the opponent's next turn.
 */
export function OPPONENTS_POKEMON_CANNOT_USE_THAT_ATTACK(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  const player = effect.player;
  const opponent = effect.opponent;
  const pokemonCard = opponent.active.getPokemonCard();

  if (pokemonCard === undefined || pokemonCard.attacks.length === 0) {
    return state;
  }

  return store.prompt(state, new ChooseAttackPrompt(
    player.id,
    GameMessage.CHOOSE_ATTACK_TO_DISABLE,
    [pokemonCard],
    { allowCancel: false }
  ), result => {
    if (!result) {
      return state;
    }

    store.log(state, GameLog.LOG_PLAYER_DISABLES_ATTACK, {
      name: player.name,
      attack: result.name
    });

    const disableEffect = opponentPokemonCannotUseAttackEffect(effect, source, result);
    return store.reduceEffect(state, disableEffect);
  });
}

/**
 * Prompts the player to choose one of the Defending Pokémon's attacks.
 * During the opponent's next turn, that Pokémon can only use that attack (Encore).
 */
export function OPPONENTS_POKEMON_CAN_ONLY_USE_THAT_ATTACK(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  const player = effect.player;
  const opponent = effect.opponent;
  const pokemonCard = opponent.active.getPokemonCard();

  if (pokemonCard === undefined || pokemonCard.attacks.length === 0) {
    return state;
  }

  return store.prompt(state, new ChooseAttackPrompt(
    player.id,
    GameMessage.CHOOSE_ATTACK_TO_COPY,
    [pokemonCard],
    { allowCancel: false }
  ), result => {
    if (!result) {
      return state;
    }

    const encoreEffect = opponentPokemonCanOnlyUseAttackEffect(effect, source, result);
    return store.reduceEffect(state, encoreEffect);
  });
}

export function PREVENT_THIS_ATTACK_UNTIL_LEAVES_ACTIVE(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  attackName: string,
): State {
  return store.reduceEffect(state, preventAttackUntilLeavesActiveEffect(effect, attackName));
}

/**
 * During your opponent's next turn, the Defending Pokémon's attacks do
 * `reduction` less damage (before applying Weakness and Resistance).
 * Effect is placed on the Defending Pokémon — switching clears it.
 */
export function DEFENDING_POKEMON_DOES_LESS_DAMAGE(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  reduction: number,
): State {
  const reduceEffect = reduceDamageEffect(effect, source, reduction);
  return store.reduceEffect(state, reduceEffect);
}

export function DEFENDING_POKEMON_DOES_LESS_DAMAGE_AFTER_WEAKNESS_AND_RESISTANCE(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  reduction: number,
): State {
  const reduceEffect = reduceDamageAfterWeaknessEffect(effect, source, reduction);
  return store.reduceEffect(state, reduceEffect);
}

// =============================================================================
// Effect-of-attack wrappers — Play / trainer / stadium locks
// =============================================================================

/**
 * During your opponent's next turn, they can't play certain card types from hand.
 * Locks live on the Player (not a Pokemon). Cleared after that player's EndTurn(s).
 *
 * @example OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, this, { item: true })
 * @example OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, this, { tool: true, specialEnergy: true })
 * @example OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, this, { supporter: true, stadium: true, bothPlayers: true })
 */
export function OPPONENT_CANNOT_PLAY_CARDS(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options: PlayLockOptions,
): State {
  return store.reduceEffect(state, playLockEffect(effect, source, options));
}

export function OPPONENT_CANNOT_PLAY_POKEMON_WITH_ABILITIES(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, source, { pokemonWithAbilities: true });
}

export function OPPONENT_CANNOT_PLAY_ITEM_CARDS(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, source, { item: true });
}

export function OPPONENT_CANNOT_PLAY_SUPPORTER_CARDS(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, source, { supporter: true });
}

export function OPPONENT_CANNOT_PLAY_TRAINER_CARDS(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, source, {
    item: true,
    supporter: true,
    tool: true,
    stadium: true,
  });
}

export function OPPONENT_CANNOT_PLAY_ANY_CARDS(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, source, {
    item: true,
    supporter: true,
    tool: true,
    stadium: true,
    energy: true,
    pokemon: true,
  });
}

/** True while Wicked Wind-style Stadium/Tool nullification is active. */
export function STADIUM_AND_TOOL_HAVE_NO_EFFECT(state: State): boolean {
  return state.players.some(p => p.stadiumAndToolHaveNoEffectTurnsRemaining > 0);
}

/**
 * Until the end of your opponent's next turn, each Stadium or Pokémon Tool card
 * in play has no effect.
 */
export function STADIUM_AND_TOOL_CARDS_HAVE_NO_EFFECT(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, stadiumAndToolHaveNoEffectEffect(effect, source));
}

/**
 * Whenever your opponent plays a Trainer card from their hand during their next
 * turn, they flip a coin. If tails, that card has no effect (still discarded).
 */
export function OPPONENT_COIN_FLIP_CANCEL_TRAINER_CARDS(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, coinFlipCancelTrainerPlayEffect(effect, source));
}

// =============================================================================
// Effect-of-attack wrappers — Cost modifiers
// =============================================================================

export function DEFENDING_POKEMON_ATTACKS_COST_MORE(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  amount: number = 1,
): State {
  const costEffect = increaseDefendingPokemonAttackCostNextTurnEffect(effect);
  costEffect.opponent.active.attackCostIncreaseNextTurnPending = amount;
  return store.reduceEffect(state, costEffect);
}

export function DEFENDING_POKEMON_ATTACKS_COST_MORE_UNTIL_LEAVES_ACTIVE(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  amount: number = 2,
): State {
  const costEffect = increaseDefendingPokemonAttackCostWhileActiveEffect(effect, amount);
  return store.reduceEffect(state, costEffect);
}

export function DEFENDING_POKEMON_RETREAT_COSTS_MORE(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  amount: number = 1,
): State {
  const costEffect = increaseDefendingPokemonRetreatCostNextTurnEffect(effect);
  costEffect.opponent.active.retreatCostIncreaseNextTurnPending = amount;
  return store.reduceEffect(state, costEffect);
}

// =============================================================================
// Effect-of-attack wrappers — Defending damage / energy attach traps
// =============================================================================

/**
 * Causes the defending Pokemon to take extra damage from attacks during the
 * attacking player's next turn (after applying Weakness and Resistance).
 */
export function DEFENDING_POKEMON_TAKES_MORE_DAMAGE_DURING_YOUR_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  damageBonus: number,
): State {
  const bonusEffect = defendingPokemonTakesMoreDamageDuringAttackerNextTurnEffect(effect, source, damageBonus);
  return store.reduceEffect(state, bonusEffect);
}

/**
 * During the opponent's next turn, whenever they attach an Energy card from their hand
 * to the Defending Pokémon, place damage counters on that Pokémon.
 * @param damage Total HP to place as damage counters via PutCountersEffect (e.g. 80 for 8 counters).
 */
export function DEFENDING_POKEMON_TAKES_DAMAGE_ON_ENERGY_ATTACH_FROM_HAND_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  damage: number,
): State {
  const attachEffect = defendingPokemonTakesDamageOnEnergyAttachFromHandNextTurnEffect(effect, source, damage);
  return store.reduceEffect(state, attachEffect);
}

/**
 * During your opponent's next turn, Energy can't be attached from their hand to the Defending Pokémon.
 */
export function YOUR_OPPONENT_CANNOT_ATTACH_ENERGY_FROM_HAND_TO_DEFENDING_POKEMON(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, cannotAttachEnergyFromHandToDefendingNextTurnEffect(effect, source));
}

/**
 * During your opponent's next turn, if they attach Energy from hand to the Defending Pokémon,
 * that Pokémon will be Asleep.
 */
export function DEFENDING_POKEMON_ASLEEP_ON_ENERGY_ATTACH_FROM_HAND_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(
    state,
    energyAttachFromHandConsequenceNextTurnEffect(effect, source, { asleep: true }),
  );
}

/**
 * During your opponent's next turn, if they attach Energy from hand to the Defending Pokémon,
 * their turn ends.
 */
export function OPPONENT_TURN_ENDS_ON_ENERGY_ATTACH_FROM_HAND_TO_DEFENDING_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(
    state,
    energyAttachFromHandConsequenceNextTurnEffect(effect, source, { endTurn: true }),
  );
}

// =============================================================================
// Effect-of-attack wrappers — Weakness / retreat cost / self buffs
// =============================================================================

/**
 * The Defending Pokémon's Weakness is now the given type until the end of your next turn (×2).
 */
export function DEFENDING_POKEMON_WEAKNESS_IS_NOW(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  weaknessType: CardType,
): State {
  const weaknessEffect = defendingPokemonWeaknessIsNowEffect(effect, source, weaknessType);
  return store.reduceEffect(state, weaknessEffect);
}

/**
 * During your opponent's next turn, this Pokémon has no Weakness.
 */
export function THIS_POKEMON_HAS_NO_WEAKNESS_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, thisPokemonHasNoWeaknessDuringOpponentsNextTurnEffect(effect, source));
}

/**
 * During your next turn, this Pokémon has no Retreat Cost.
 */
export function THIS_POKEMON_HAS_NO_RETREAT_COST_DURING_YOUR_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, thisPokemonHasNoRetreatCostDuringYourNextTurnEffect(effect, source));
}

// =============================================================================
// Effect-of-attack wrappers — KO / survival / retaliate / prizes
// =============================================================================

/**
 * During your next turn, if the Defending Pokémon is damaged by an attack, it is Knocked Out.
 */
export function DEFENDING_POKEMON_KNOCKED_OUT_IF_DAMAGED_DURING_YOUR_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options: KnockOutIfDamagedOptions = {},
): State {
  return store.reduceEffect(state, knockOutIfDamagedDuringAttackerNextTurnEffect(effect, source, options));
}

/**
 * During your opponent's next turn, if this Pokémon would be Knocked Out by damage
 * from an attack, it survives with 10 HP.
 */
export function THIS_POKEMON_SURVIVES_ON_TEN_HP_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options: SurviveOnTenHpOptions = {},
): State {
  return store.reduceEffect(state, surviveOnTenHpDuringOpponentsNextTurnEffect(effect, source, options));
}

/**
 * During your opponent's next turn, if this Pokémon is damaged by an attack
 * (even if Knocked Out), put damage on / reflect to the Attacking Pokémon.
 *
 * Pass `{ damage: N, coinFlipPrevent: true }` for Reflect Shield-style text:
 * when damaged, flip a coin; if heads, prevent that damage and deal N to the attacker.
 */
export function THIS_POKEMON_RETALIATES_ON_DAMAGE_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options: RetaliateOnDamageOptions,
): State {
  return store.reduceEffect(state, retaliateOnDamageDuringOpponentsNextTurnEffect(effect, source, options));
}

/**
 * If the Defending Pokémon is Knocked Out during your next turn, take N more Prize cards.
 */
export function TAKE_MORE_PRIZES_IF_DEFENDING_KNOCKED_OUT_DURING_YOUR_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  extraPrizes: number,
): State {
  return store.reduceEffect(state, extraPrizesIfKnockedOutDuringAttackerNextTurnEffect(effect, source, extraPrizes));
}

/**
 * During your opponent's next turn, if this Pokémon is Knocked Out, deny Prize cards.
 */
export function DENY_PRIZES_IF_THIS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, denyPrizesIfKnockedOutDuringOpponentsNextTurnEffect(effect, source));
}

/**
 * During your opponent's next turn, if this Pokémon is Knocked Out by damage from an
 * attack, discard an Energy from the Attacking Pokémon.
 */
export function DISCARD_ATTACKER_ENERGY_IF_THIS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, discardAttackerEnergyIfKnockedOutDuringOpponentsNextTurnEffect(effect, source));
}

export interface SurviveOnTenIfFullHpOptions {
  reason: string;
  source: PokemonCard | TrainerCard;
  checkBlocked?: boolean;
}

/**
 * Compound helper for text like:
 * "If this Pokemon has full HP and would be Knocked Out by damage from an attack,
 * this Pokemon is not Knocked Out and its remaining HP becomes 10 instead."
 */
export function SURVIVE_ON_TEN_IF_FULL_HP(
  store: StoreLike,
  state: State,
  effect: Effect,
  options: SurviveOnTenIfFullHpOptions,
): void {
  if (!(effect instanceof PutDamageEffect)) {
    return;
  }

  const { reason, source, checkBlocked = true } = options;
  const player = StateUtils.findOwner(state, effect.target);

  if (source instanceof PokemonCard) {
    if (!effect.target.cards.includes(source)) {
      return;
    }
    if (checkBlocked && IS_ABILITY_BLOCKED(store, state, player, source)) {
      return;
    }
  } else if (source instanceof TrainerCard) {
    if (!effect.target.tools.includes(source)) {
      return;
    }
    if (checkBlocked && IS_TOOL_BLOCKED(store, state, player, source)) {
      return;
    }
  } else {
    return;
  }

  if (DAMAGED_FROM_FULL_HP(store, state, effect, player, effect.target)) {
    effect.surviveOnTenHPReason = reason;
  }
}

// =============================================================================
// Effect-of-attack wrappers — Player-level turn restrictions
// =============================================================================

/**
 * Flip a coin. If heads, your opponent can't draw a card at the beginning of their next turn.
 */
export function FLIP_COIN_OPPONENT_CANNOT_DRAW_AT_START_OF_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return COIN_FLIP_PROMPT(store, state, effect.player, result => {
    if (result) {
      store.reduceEffect(state, opponentCannotDrawAtStartOfNextTurnEffect(effect, source));
    }
  });
}

/**
 * Your opponent can't draw a card at the beginning of their next turn.
 */
export function OPPONENT_CANNOT_DRAW_AT_START_OF_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, opponentCannotDrawAtStartOfNextTurnEffect(effect, source));
}

/**
 * During your next turn, your Pokémon can't attack (including Pokémon that come into play).
 */
export function YOUR_POKEMON_CANNOT_ATTACK_DURING_YOUR_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, yourPokemonCannotAttackDuringYourNextTurnEffect(effect, source));
}

/**
 * During your opponent's next turn, their Pokémon can't attack (including ones
 * that come into play). Player-level — not Mist-blockable.
 */
export function OPPONENT_POKEMON_CANNOT_ATTACK_DURING_THEIR_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, opponentPokemonCannotAttackDuringTheirNextTurnEffect(effect, source));
}

/**
 * During your opponent's next turn, their Pokémon with `maxEnergy` or fewer
 * Energy attached can't attack (including ones that come into play).
 */
export function OPPONENT_POKEMON_WITH_X_OR_LESS_ENERGY_CANNOT_ATTACK(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  maxEnergy: number,
): State {
  return store.reduceEffect(state, opponentPokemonCannotAttackDuringTheirNextTurnEffect(effect, source, maxEnergy));
}

/**
 * During your next turn, ignore all Energy in the attack costs of Pokémon of the given types.
 */
export function IGNORE_ATTACK_COSTS_FOR_TYPES_DURING_YOUR_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  cardTypes: CardType[],
): State {
  return store.reduceEffect(state, ignoreAttackCostsForTypesDuringYourNextTurnEffect(effect, source, cardTypes));
}

// =============================================================================
// Effect-of-attack wrappers — Evolve / abilities locks
// =============================================================================

/**
 * During your opponent's next turn, Pokémon can't be played from hand to evolve
 * the Defending Pokémon. Mist Energy can block this.
 */
export function DEFENDING_POKEMON_CANNOT_EVOLVE_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(state, cannotEvolveDefendingNextTurnEffect(effect, source));
}

/**
 * During your opponent's next turn, they can't play Pokémon from hand to evolve
 * any of their Pokémon. Player-level — not Mist-blockable.
 */
export function OPPONENT_CANNOT_EVOLVE_POKEMON(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, source, { evolve: true });
}

/**
 * The Defending Pokémon has no Abilities until the end of your next turn.
 * Mist Energy can block this.
 */
export function DEFENDING_POKEMON_HAS_NO_ABILITIES_UNTIL_END_OF_YOUR_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
): State {
  return store.reduceEffect(
    state,
    defendingPokemonHasNoAbilitiesUntilEndOfAttackerNextTurnEffect(effect, source),
  );
}

/**
 * Until the end of your opponent's next turn, each of their Pokémon in play, hand,
 * and discard has no Abilities. Player-level — not Mist-blockable.
 */
export function OPPONENT_POKEMON_HAVE_NO_ABILITIES(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: Card,
  options?: OpponentPowerSuppressionOptions,
): State {
  return store.reduceEffect(state, opponentPokemonHaveNoAbilitiesEffect(effect, source, options));
}
