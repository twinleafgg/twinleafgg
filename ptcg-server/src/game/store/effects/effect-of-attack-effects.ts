import { PlayerType } from "../actions/play-card-action";
import { Card } from "../card/card";
import { Stage, CardType, SpecialCondition } from "../card/card-types";
import { PokemonCard, getPokemonCardTypes } from "../card/pokemon-card";
import { PowerType, Attack } from "../card/pokemon-types";
import { AttackPowerSuppression } from "../state/player";
import { StateUtils } from "../state-utils";
import { PendingEndOfTurnEffect } from "../state/pending-end-of-turn-effects";
import { PreventDamageFilter, PokemonCardList, SurviveOnTenHpOptions, StoredRetaliateOnDamage, NextTurnAttackBaseDamage, RetaliateOnDamageOptions } from "../state/pokemon-card-list";
import { State } from "../state/state";
import { AbstractAttackEffect, ApplyWeaknessEffect, PutDamageEffect, DealDamageEffect } from "./attack-effects";
import { Effect } from "./effect";
import { AttackEffect } from "./game-effects";

// =============================================================================
// Shared helpers
// =============================================================================

function sourceMatchesPreventFilter(
  sourceCard: PokemonCard,
  filter: PreventDamageFilter,
  sourceList?: PokemonCardList,
): boolean {
  if (filter.sourceStage !== undefined && sourceCard.stage !== filter.sourceStage) {
    return false;
  }

  if (filter.sourceIsEvolution === true && sourceCard.stage === Stage.BASIC) {
    return false;
  }

  if (filter.sourceTags !== undefined
    && !filter.sourceTags.some(tag => sourceCard.tags.includes(tag))) {
    return false;
  }

  if (filter.sourceCardTypes !== undefined
    && !getPokemonCardTypes(sourceCard).some(t => filter.sourceCardTypes!.includes(t))) {
    return false;
  }

  if (filter.sourceHasAbility === true
    && !sourceCard.powers.some(p => p.powerType === PowerType.ABILITY)) {
    return false;
  }

  if (filter.sourceHasPokePowerOrBody === true
    && !sourceCard.powers.some(p =>
      p.powerType === PowerType.POKEPOWER || p.powerType === PowerType.POKEBODY)) {
    return false;
  }

  if (filter.sourceHasSpecialCondition !== undefined
    && !sourceList?.specialConditions.includes(filter.sourceHasSpecialCondition)) {
    return false;
  }

  return true;
}

function preventFilterFromOptions(options: PreventDamageOptions): PreventDamageFilter {
  const filter: PreventDamageFilter = {};
  if (options.maxDamage !== undefined) {
    filter.maxDamage = options.maxDamage;
  }
  if (options.sourceStage !== undefined) {
    filter.sourceStage = options.sourceStage;
  }
  if (options.sourceIsEvolution !== undefined) {
    filter.sourceIsEvolution = options.sourceIsEvolution;
  }
  if (options.sourceTags !== undefined) {
    filter.sourceTags = options.sourceTags;
  }
  if (options.sourceCardTypes !== undefined) {
    filter.sourceCardTypes = options.sourceCardTypes;
  }
  if (options.sourceHasAbility !== undefined) {
    filter.sourceHasAbility = options.sourceHasAbility;
  }
  if (options.sourceHasSpecialCondition !== undefined) {
    filter.sourceHasSpecialCondition = options.sourceHasSpecialCondition;
  }
  if (options.sourceHasPokePowerOrBody !== undefined) {
    filter.sourceHasPokePowerOrBody = options.sourceHasPokePowerOrBody;
  }
  return filter;
}

/**
 * Optional filters for {@link PreventDamageEffect}.
 * An empty object prevents all attack damage during the opponent's next turn.
 */
export type PreventDamageOptions = PreventDamageFilter;

export function shouldPreventAttackDamage(
  target: PokemonCardList,
  source: PokemonCardList,
  damage?: number,
): boolean {
  const filter = target.preventDamageNextTurn;
  if (!filter) {
    return false;
  }

  const sourceCard = source.getPokemonCard();
  if (!sourceCard) {
    return false;
  }

  if (filter.maxDamage !== undefined && (damage === undefined || damage > filter.maxDamage)) {
    return false;
  }

  return sourceMatchesPreventFilter(sourceCard, filter, source);
}

/** Whether {@link PokemonCardList.damageReductionNextTurn} should apply for this source. */
export function shouldApplyDamageReduction(
  target: PokemonCardList,
  source: PokemonCardList,
): boolean {
  if (target.damageReductionNextTurn === 0) {
    return false;
  }

  const filter = target.damageReductionNextTurnFilter;
  if (!filter) {
    return true;
  }

  const sourceCard = source.getPokemonCard();
  if (!sourceCard) {
    return false;
  }

  return sourceMatchesPreventFilter(sourceCard, filter, source);
}

/**
 * Returns true when an attack effect (not damage) should be blocked on the target
 * because it has {@link PokemonCardList.preventEffectsOfAttacksNextTurn} active.
 * Mirrors Mist Energy: damage is not an effect.
 */
export function shouldPreventAttackEffects(state: State, effect: Effect): boolean {
  if (!(effect instanceof AbstractAttackEffect)) {
    return false;
  }

  const filter = effect.target.preventEffectsOfAttacksNextTurn;
  if (!filter) {
    return false;
  }

  const targetOwner = StateUtils.findOwner(state, effect.target);
  const sourceOwner = StateUtils.findOwner(state, effect.source);
  if (sourceOwner !== StateUtils.getOpponent(state, targetOwner)) {
    return false;
  }

  const sourceCard = effect.source.getPokemonCard();
  if (!sourceCard) {
    return false;
  }

  if (
    effect instanceof ApplyWeaknessEffect ||
    effect instanceof PutDamageEffect ||
    effect instanceof DealDamageEffect
  ) {
    return false;
  }

  return sourceMatchesPreventFilter(sourceCard, filter, effect.source);
}

export function shouldKnockOutIfDamaged(
  target: PokemonCardList,
  source: PokemonCardList,
): boolean {
  if (!target.knockOutIfDamagedNextTurn || target.knockOutIfDamagedNextTurnPending) {
    return false;
  }
  const filter = target.knockOutIfDamagedNextTurnFilter;
  if (!filter) {
    return true;
  }
  const sourceCard = source.getPokemonCard();
  if (!sourceCard) {
    return false;
  }
  return sourceMatchesPreventFilter(sourceCard, filter, source);
}

export function getActiveSurviveOnTenHpOptions(
  target: PokemonCardList,
): SurviveOnTenHpOptions | null {
  if (target.surviveOnTenHpNextTurnPending !== null) {
    return null;
  }
  return target.surviveOnTenHpNextTurn;
}

export function getActiveRetaliateOnDamage(
  target: PokemonCardList,
): StoredRetaliateOnDamage | null {
  if (target.retaliateOnDamageNextTurnPending !== null) {
    return null;
  }
  return target.retaliateOnDamageNextTurn;
}

// =============================================================================
// Base
// =============================================================================

/**
 * Base class for effects that are caused by attacks
 * These can be prevented by abilities like Skeledirge's "Unaware"
 */
export abstract class EffectOfAttackEffect extends AbstractAttackEffect implements Effect {
  readonly type: string = 'EFFECT_OF_ATTACK_EFFECT';
  public preventDefault = false;
  public markerSource!: Card;

  constructor(base: AttackEffect) {
    super(base);
  }

  /**
   * Apply the effect to the target
   * Override this in subclasses
   */
  abstract applyEffect(): void;
}

// =============================================================================
// Retreat locks
// =============================================================================

/**
 * Effect that prevents the defending Pokemon from retreating during the opponent's next turn.
 */
export class PreventRetreatEffect extends EffectOfAttackEffect {
  readonly type: string = 'PREVENT_RETREAT_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.cannotRetreatNextTurn = true;
  }
}

export function preventRetreatEffect(attackEffect: AttackEffect, source: Card): PreventRetreatEffect {
  const effect = new PreventRetreatEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * Effect that prevents the attacking Pokemon from retreating during its own next turn.
 * Used for self-retreat-lock effects like "This Pokemon can't retreat during your next turn."
 */
export class SelfPreventRetreatEffect extends EffectOfAttackEffect {
  readonly type: string = 'SELF_PREVENT_RETREAT_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
  }

  applyEffect(): void {
    this.player.active.cannotRetreatNextTurnPending = true;
  }
}

export function selfPreventRetreatEffect(attackEffect: AttackEffect, source: Card): SelfPreventRetreatEffect {
  const effect = new SelfPreventRetreatEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

export class PreventRetreatWhileActiveEffect extends EffectOfAttackEffect {
  readonly type = 'PREVENT_RETREAT_WHILE_ACTIVE_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.cannotRetreatWhileActive = true;
    this.opponent.active.cannotRetreatWhileActiveSourceCard = this.source.getPokemonCard();
  }
}

export function preventRetreatWhileActiveEffect(
  attackEffect: AttackEffect,
): PreventRetreatWhileActiveEffect {
  return new PreventRetreatWhileActiveEffect(attackEffect);
}

// =============================================================================
// Damage & effect prevention
// =============================================================================

/**
 * During the opponent's next turn, prevents attack damage to this Pokémon.
 * Use {@link PreventDamageOptions} to restrict which attackers are blocked.
 */
export class PreventDamageEffect extends EffectOfAttackEffect {
  readonly type: string = 'PREVENT_DAMAGE_EFFECT';

  constructor(base: AttackEffect, public readonly options: PreventDamageOptions = {}) {
    super(base);
    // Self-protection applies to the attacking Pokémon, not the defender.
    // Using the defender as target causes tools like Mist Energy to incorrectly block it.
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.active.preventDamageNextTurnPending = preventFilterFromOptions(this.options);
  }
}

export function preventDamageEffect(
  attackEffect: AttackEffect,
  source: Card,
  options: PreventDamageOptions = {},
): PreventDamageEffect {
  const effect = new PreventDamageEffect(attackEffect, options);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, prevents effects of attacks done to this Pokémon.
 * Damage is not an effect and is handled separately (e.g. {@link PreventDamageEffect}).
 * Use {@link PreventDamageOptions} to restrict which attackers are blocked.
 */
export class PreventEffectsOfAttacksEffect extends EffectOfAttackEffect {
  readonly type: string = 'PREVENT_EFFECTS_OF_ATTACKS_EFFECT';

  constructor(base: AttackEffect, public readonly options: PreventDamageOptions = {}) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.active.preventEffectsOfAttacksNextTurnPending = preventFilterFromOptions(this.options);
  }
}

export function preventEffectsOfAttacksEffect(
  attackEffect: AttackEffect,
  source: Card,
  options: PreventDamageOptions = {},
): PreventEffectsOfAttacksEffect {
  const effect = new PreventEffectsOfAttacksEffect(attackEffect, options);
  effect.markerSource = source;
  return effect;
}

/**
 * Prevent all damage and effects of attacks done to each of your Pokémon
 * during your opponent's next turn. Self-protection — not Mist-blockable.
 */
export class PreventDamageAndEffectsToAllYourPokemonEffect extends EffectOfAttackEffect {
  readonly type: string = 'PREVENT_DAMAGE_AND_EFFECTS_TO_ALL_YOUR_POKEMON_EFFECT';

  constructor(base: AttackEffect, public readonly options: PreventDamageOptions = {}) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    const filter = preventFilterFromOptions(this.options);

    this.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
      cardList.preventDamageNextTurnPending = { ...filter };
      cardList.preventEffectsOfAttacksNextTurnPending = { ...filter };
    });
  }
}

/**
 * During the opponent's next turn, if attack damage would be done to this Pokémon,
 * flip a coin. Heads prevents that damage. Other effects of attacks still happen.
 */
export class CoinFlipPreventAttackDamageDuringOpponentsNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'COIN_FLIP_PREVENT_ATTACK_DAMAGE_DURING_OPPONENTS_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.active.coinFlipPreventAttackDamageNextTurnPending = true;
  }
}

export function coinFlipPreventAttackDamageDuringOpponentsNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): CoinFlipPreventAttackDamageDuringOpponentsNextTurnEffect {
  const effect = new CoinFlipPreventAttackDamageDuringOpponentsNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, this Pokémon can't be affected by Special Conditions.
 */
export class CannotBeSpecialConditionedDuringOpponentsNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'CANNOT_BE_SPECIAL_CONDITIONED_DURING_OPPONENTS_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.active.cannotBeSpecialConditionedNextTurnPending = true;
  }
}

export function cannotBeSpecialConditionedDuringOpponentsNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): CannotBeSpecialConditionedDuringOpponentsNextTurnEffect {
  const effect = new CannotBeSpecialConditionedDuringOpponentsNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

export function preventDamageAndEffectsToAllYourPokemonEffect(
  attackEffect: AttackEffect,
  source: Card,
  options: PreventDamageOptions = {},
): PreventDamageAndEffectsToAllYourPokemonEffect {
  const effect = new PreventDamageAndEffectsToAllYourPokemonEffect(attackEffect, options);
  effect.markerSource = source;
  return effect;
}

// =============================================================================
// Attack restrictions
// =============================================================================

/**
 * During the opponent's next turn, the Defending Pokémon can't use attacks.
 */
export class PreventAttackEffect extends EffectOfAttackEffect {
  readonly type: string = 'PREVENT_ATTACK_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.cannotAttackNextTurn = true;
  }
}

export function preventAttackEffect(attackEffect: AttackEffect, source: Card): PreventAttackEffect {
  const effect = new PreventAttackEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, the Defending Pokémon can't be healed.
 */
export class PreventHealOnDefendingDuringOpponentsNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'PREVENT_HEAL_ON_DEFENDING_DURING_OPPONENTS_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.cannotBeHealedNextTurn = true;
  }
}

export function preventHealOnDefendingDuringOpponentsNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): PreventHealOnDefendingDuringOpponentsNextTurnEffect {
  const effect = new PreventHealOnDefendingDuringOpponentsNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, if the Defending Pokémon tries to attack,
 * they flip coin(s). If any is tails, that attack does nothing (Smokescreen / Sand-Attack).
 */
export class CoinFlipCancelAttackEffect extends EffectOfAttackEffect {
  readonly type: string = 'COIN_FLIP_CANCEL_ATTACK_EFFECT';

  constructor(base: AttackEffect, public coinFlips: number = 1) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.coinFlipCancelAttackNextTurn = Math.max(1, this.coinFlips);
  }
}

export function coinFlipCancelAttackEffect(
  attackEffect: AttackEffect,
  source: Card,
  coinFlips: number = 1,
): CoinFlipCancelAttackEffect {
  const effect = new CoinFlipCancelAttackEffect(attackEffect, coinFlips);
  effect.markerSource = source;
  return effect;
}

/**
 * Effect that prevents the defending Pokemon from using a specific attack during the opponent's next turn.
 */
export class OpponentPokemonCannotUseAttackEffect extends EffectOfAttackEffect {
  readonly type: string = 'OPPONENT_POKEMON_CANNOT_USE_ATTACK_EFFECT';

  constructor(base: AttackEffect, public blockedAttack: Attack) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.blockedAttackNameNextTurn = this.blockedAttack.name;
  }
}

export function opponentPokemonCannotUseAttackEffect(
  attackEffect: AttackEffect,
  source: Card,
  blockedAttack: Attack,
): OpponentPokemonCannotUseAttackEffect {
  const effect = new OpponentPokemonCannotUseAttackEffect(attackEffect, blockedAttack);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, the Defending Pokémon can only use the chosen attack (Encore).
 */
export class OpponentPokemonCanOnlyUseAttackEffect extends EffectOfAttackEffect {
  readonly type: string = 'OPPONENT_POKEMON_CAN_ONLY_USE_ATTACK_EFFECT';

  constructor(base: AttackEffect, public allowedAttack: Attack) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.onlyAllowedAttackNameNextTurn = this.allowedAttack.name;
  }
}

export function opponentPokemonCanOnlyUseAttackEffect(
  attackEffect: AttackEffect,
  source: Card,
  allowedAttack: Attack,
): OpponentPokemonCanOnlyUseAttackEffect {
  const effect = new OpponentPokemonCanOnlyUseAttackEffect(attackEffect, allowedAttack);
  effect.markerSource = source;
  return effect;
}

export class PreventAttackUntilLeavesActiveEffect extends EffectOfAttackEffect {
  constructor(base: AttackEffect, public attackName: string) {
    super(base);
  }

  applyEffect(): void {
    this.source.blockedAttackNameUntilLeavesActive = this.attackName;
  }
}

export function preventAttackUntilLeavesActiveEffect(
  attackEffect: AttackEffect,
  attackName: string,
): PreventAttackUntilLeavesActiveEffect {
  return new PreventAttackUntilLeavesActiveEffect(attackEffect, attackName);
}

// =============================================================================
// Damage reduction / next-turn attack setup
// =============================================================================

/**
 * During the opponent's next turn, the Defending Pokémon's attacks do
 * `reduction` less damage (before applying Weakness and Resistance).
 * Effect lives on the Defending Pokémon — switching/benching clears it.
 */
export class ReduceDamageEffect extends EffectOfAttackEffect {
  readonly type: string = 'REDUCE_DAMAGE_EFFECT';

  constructor(base: AttackEffect, public reduction: number) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.attackDamageReductionNextTurn = Math.max(0, this.reduction);
  }
}

export function reduceDamageEffect(
  attackEffect: AttackEffect,
  source: Card,
  reduction: number,
): ReduceDamageEffect {
  const effect = new ReduceDamageEffect(attackEffect, reduction);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, the Defending Pokémon's attacks do
 * `reduction` less damage after Weakness and Resistance.
 * Effect lives on the Defending Pokémon — switching/benching clears it.
 */
export class ReduceDamageAfterWeaknessEffect extends EffectOfAttackEffect {
  readonly type: string = 'REDUCE_DAMAGE_AFTER_WEAKNESS_EFFECT';

  constructor(base: AttackEffect, public reduction: number) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.attackDamageReductionAfterWeaknessNextTurn = Math.max(0, this.reduction);
  }
}

export function reduceDamageAfterWeaknessEffect(
  attackEffect: AttackEffect,
  source: Card,
  reduction: number,
): ReduceDamageAfterWeaknessEffect {
  const effect = new ReduceDamageAfterWeaknessEffect(attackEffect, reduction);
  effect.markerSource = source;
  return effect;
}

export class NextTurnAttackDamageBonusEffect extends EffectOfAttackEffect {
  constructor(
    base: AttackEffect,
    public attackName: string,
    public bonusDamage: number,
    public sourceCardName?: string,
    /** When set, only this attack arms the bonus (e.g. Hone Claws → Slash). Defaults to attackName. */
    public setupAttackName?: string,
  ) {
    super(base);
  }

  applyEffect(): void {
    const sourceCard = this.source.getPokemonCard();
    if (!sourceCard
      || (this.sourceCardName !== undefined && sourceCard.fullName !== this.sourceCardName)) {
      return;
    }

    const cardList = this.source;
    const activeBonus = cardList.nextTurnAttackDamageBonus;
    if (activeBonus
      && activeBonus.sourceCardName === sourceCard.fullName
      && (activeBonus.attackName === '*' || activeBonus.attackName === this.attack.name)) {
      this.attackEffect.damage += activeBonus.bonusDamage;
    }

    const setupName = this.setupAttackName ?? this.attackName;
    if (this.attack.name !== setupName) {
      return;
    }

    cardList.nextTurnAttackDamageBonusPending = {
      attackName: this.attackName,
      bonusDamage: this.bonusDamage,
      sourceCardName: sourceCard.fullName,
    };
  }
}

export function nextTurnAttackDamageBonusEffect(
  effect: Effect,
  attackName: string,
  bonusDamage: number,
  sourceCardName?: string,
  setupAttackName?: string,
): void {
  if (effect instanceof AttackEffect) {
    new NextTurnAttackDamageBonusEffect(
      effect,
      attackName,
      bonusDamage,
      sourceCardName,
      setupAttackName,
    ).applyEffect();
  }
}

export function armNextTurnAttackDamageBonus(
  source: PokemonCardList,
  attackName: string,
  bonusDamage: number,
  sourceCardName: string,
): void {
  source.nextTurnAttackDamageBonusPending = {
    attackName,
    bonusDamage,
    sourceCardName,
  };
}

export class NextTurnAttackBaseDamageEffect extends EffectOfAttackEffect {
  constructor(
    base: AttackEffect,
    public setupAttackName: string,
    public attackName: string,
    public baseDamage: number,
    public sourceCardName?: string,
  ) {
    super(base);
  }

  applyEffect(): void {
    const sourceCard = this.source.getPokemonCard();
    if (!sourceCard || (this.sourceCardName !== undefined && sourceCard.fullName !== this.sourceCardName)) {
      return;
    }

    const cardList = this.source;
    const activeBaseDamage = cardList.nextTurnAttackBaseDamage;
    if (activeBaseDamage
      && activeBaseDamage.attackName === this.attack.name
      && activeBaseDamage.sourceCardName === sourceCard.fullName) {
      this.attackEffect.damage = activeBaseDamage.baseDamage;
    }

    if (this.attack.name === this.setupAttackName) {
      const baseDamage: NextTurnAttackBaseDamage = {
        setupAttackName: this.setupAttackName,
        attackName: this.attackName,
        baseDamage: this.baseDamage,
        sourceCardName: sourceCard.fullName,
      };
      cardList.nextTurnAttackBaseDamagePending = baseDamage;
    }
  }
}

export function nextTurnAttackBaseDamageEffect(
  effect: Effect,
  setupAttackName: string,
  attackName: string,
  baseDamage: number,
  sourceCardName?: string,
): void {
  if (effect instanceof AttackEffect) {
    new NextTurnAttackBaseDamageEffect(
      effect,
      setupAttackName,
      attackName,
      baseDamage,
      sourceCardName,
    ).applyEffect();
  }
}

// =============================================================================
// Play / trainer / stadium locks
// =============================================================================

/**
 * During the opponent's next turn (or longer), prevent the target player(s)
 * from playing certain card types from hand. Locks live on the Player.
 */
export interface PlayLockOptions {
  item?: boolean;
  supporter?: boolean;
  stadium?: boolean;
  tool?: boolean;
  specialEnergy?: boolean;
  /** Block playing any Energy from hand (Basic + Special). */
  energy?: boolean;
  /** Block playing any Pokémon from hand (including evolution). */
  pokemon?: boolean;
  pokemonWithAbilities?: boolean;
  /** Block playing Pokémon from hand only to evolve (basics still allowed). */
  evolve?: boolean;
  /** EndTurns of the locked player until clear. Default 1 (opponent's next turn). */
  turnsRemaining?: number;
  /** Also lock the attacking player (e.g. Vanilluxe Frigid Breath). */
  bothPlayers?: boolean;
  /** EndTurns for the attacker when bothPlayers. Default 2 (until end of your next turn). */
  attackerTurnsRemaining?: number;
}

export class PlayLockEffect extends EffectOfAttackEffect {
  readonly type: string = 'PLAY_LOCK_EFFECT';

  constructor(base: AttackEffect, public readonly options: PlayLockOptions) {
    super(base);
    // Player-level lock — not an effect done to the Defending Pokémon.
    // Using the defender as target lets Mist Energy / similar incorrectly block it.
    this.target = base.source;
  }

  applyEffect(): void {
    const locks = {
      item: this.options.item === true,
      supporter: this.options.supporter === true,
      stadium: this.options.stadium === true,
      tool: this.options.tool === true,
      specialEnergy: this.options.specialEnergy === true,
      energy: this.options.energy === true,
      pokemon: this.options.pokemon === true,
      pokemonWithAbilities: this.options.pokemonWithAbilities === true,
      evolve: this.options.evolve === true,
    };
    const opponentTurns = this.options.turnsRemaining ?? 1;
    this.opponent.applyPlayLocks(locks, opponentTurns);

    if (this.options.bothPlayers) {
      this.player.applyPlayLocks(locks, this.options.attackerTurnsRemaining ?? 2);
    }
  }
}

export function playLockEffect(
  attackEffect: AttackEffect,
  source: Card,
  options: PlayLockOptions,
): PlayLockEffect {
  const effect = new PlayLockEffect(attackEffect, options);
  effect.markerSource = source;
  return effect;
}

/**
 * Until the end of the opponent's next turn, Stadium and Pokémon Tool cards
 * in play have no effect. Flag lives on the opponent and is checked globally.
 */
export class StadiumAndToolHaveNoEffectEffect extends EffectOfAttackEffect {
  readonly type: string = 'STADIUM_AND_TOOL_HAVE_NO_EFFECT_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.opponent.stadiumAndToolHaveNoEffectTurnsRemaining = Math.max(
      this.opponent.stadiumAndToolHaveNoEffectTurnsRemaining,
      1,
    );
  }
}

export function stadiumAndToolHaveNoEffectEffect(
  attackEffect: AttackEffect,
  source: Card,
): StadiumAndToolHaveNoEffectEffect {
  const effect = new StadiumAndToolHaveNoEffectEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, whenever they play a Trainer from hand,
 * they flip a coin; on tails that card has no effect (still discarded).
 */
export class CoinFlipCancelTrainerPlayEffect extends EffectOfAttackEffect {
  readonly type: string = 'COIN_FLIP_CANCEL_TRAINER_PLAY_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.opponent.coinFlipCancelTrainerPlayTurnsRemaining = Math.max(
      this.opponent.coinFlipCancelTrainerPlayTurnsRemaining,
      1,
    );
  }
}

export function coinFlipCancelTrainerPlayEffect(
  attackEffect: AttackEffect,
  source: Card,
): CoinFlipCancelTrainerPlayEffect {
  const effect = new CoinFlipCancelTrainerPlayEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

// =============================================================================
// Cost modifiers
// =============================================================================

export class IncreaseDefendingPokemonAttackCostNextTurnEffect extends EffectOfAttackEffect {
  applyEffect(): void {
    this.opponent.active.attackCostIncreaseNextTurnPending = 1;
    this.opponent.active.attackCostIncreaseNextTurnAttackerId = this.player.id;
  }
}

export function increaseDefendingPokemonAttackCostNextTurnEffect(
  attackEffect: AttackEffect,
): IncreaseDefendingPokemonAttackCostNextTurnEffect {
  return new IncreaseDefendingPokemonAttackCostNextTurnEffect(attackEffect);
}

export class IncreaseDefendingPokemonRetreatCostNextTurnEffect extends EffectOfAttackEffect {
  applyEffect(): void {
    this.opponent.active.retreatCostIncreaseNextTurnPending = 1;
    this.opponent.active.retreatCostIncreaseNextTurnAttackerId = this.player.id;
  }
}

export function increaseDefendingPokemonRetreatCostNextTurnEffect(
  attackEffect: AttackEffect,
): IncreaseDefendingPokemonRetreatCostNextTurnEffect {
  return new IncreaseDefendingPokemonRetreatCostNextTurnEffect(attackEffect);
}

export class IncreaseDefendingPokemonAttackCostWhileActiveEffect extends EffectOfAttackEffect {
  readonly type = 'INCREASE_DEFENDING_POKEMON_ATTACK_COST_WHILE_ACTIVE_EFFECT';

  constructor(base: AttackEffect, public readonly amount: number) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.attackCostIncreaseWhileActive = Math.max(this.opponent.active.attackCostIncreaseWhileActive, this.amount);
    this.opponent.active.attackCostIncreaseWhileActiveSourceCard = this.source.getPokemonCard();
  }
}

export function increaseDefendingPokemonAttackCostWhileActiveEffect(
  attackEffect: AttackEffect,
  amount: number = 1,
): IncreaseDefendingPokemonAttackCostWhileActiveEffect {
  return new IncreaseDefendingPokemonAttackCostWhileActiveEffect(attackEffect, amount);
}

// =============================================================================
// Defending damage / energy attach traps
// =============================================================================

/**
 * Effect that causes the defending Pokemon to take more damage from attacks
 * during the attacking player's next turn (after applying Weakness and Resistance).
 */
export class DefendingPokemonTakesMoreDamageDuringAttackerNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'DEFENDING_POKEMON_TAKES_MORE_DAMAGE_DURING_ATTACKER_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect, public damageBonus: number) {
    super(base);
  }

  applyEffect(): void {
    const target = this.opponent.active;
    const bonusAlreadyActive = target.defendingPokemonExtraDamageNextTurn > 0
      && !target.defendingPokemonExtraDamagePending
      && target.defendingPokemonExtraDamageAttackerId === this.player.id;

    target.defendingPokemonExtraDamageNextTurn = this.damageBonus;
    target.defendingPokemonExtraDamageAttackerId = this.player.id;

    if (bonusAlreadyActive) {
      // Attack effects run before damage. Keep the bonus active for this attack,
      // then re-arm pending afterward so the next trap cycle can begin.
      target.defendingPokemonExtraDamageRearmAfterAttack = true;
      return;
    }

    target.defendingPokemonExtraDamagePending = true;
  }
}

export function defendingPokemonTakesMoreDamageDuringAttackerNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
  damageBonus: number,
): DefendingPokemonTakesMoreDamageDuringAttackerNextTurnEffect {
  const effect = new DefendingPokemonTakesMoreDamageDuringAttackerNextTurnEffect(attackEffect, damageBonus);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, whenever they attach an Energy card from their hand
 * to the Defending Pokémon, place damage counters on that Pokémon.
 */
export class DefendingPokemonTakesDamageOnEnergyAttachFromHandNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'DEFENDING_POKEMON_TAKES_DAMAGE_ON_ENERGY_ATTACH_FROM_HAND_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect, public damage: number) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.pendingEnergyAttachDamageCounters = {
      damage: this.damage,
      attack: this.attackEffect.attack,
      sourceCard: this.markerSource as PokemonCard,
      attackerPlayerId: this.player.id,
    };
  }
}

export function defendingPokemonTakesDamageOnEnergyAttachFromHandNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
  damage: number,
): DefendingPokemonTakesDamageOnEnergyAttachFromHandNextTurnEffect {
  const effect = new DefendingPokemonTakesDamageOnEnergyAttachFromHandNextTurnEffect(attackEffect, damage);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, Energy can't be attached from their hand to the Defending Pokémon.
 */
export class CannotAttachEnergyFromHandToDefendingNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'CANNOT_ATTACH_ENERGY_FROM_HAND_TO_DEFENDING_NEXT_TURN_EFFECT';

  applyEffect(): void {
    this.opponent.active.cannotAttachEnergyFromHandNextTurn = true;
  }
}

export function cannotAttachEnergyFromHandToDefendingNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): CannotAttachEnergyFromHandToDefendingNextTurnEffect {
  const effect = new CannotAttachEnergyFromHandToDefendingNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, if they attach Energy from hand to the Defending Pokémon,
 * apply consequences (Asleep and/or end their turn).
 */
export class EnergyAttachFromHandConsequenceNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'ENERGY_ATTACH_FROM_HAND_CONSEQUENCE_NEXT_TURN_EFFECT';

  constructor(
    base: AttackEffect,
    public readonly consequence: { asleep?: boolean; endTurn?: boolean },
  ) {
    super(base);
  }

  applyEffect(): void {
    const existing = this.opponent.active.pendingEnergyAttachFromHandConsequence ?? {};
    this.opponent.active.pendingEnergyAttachFromHandConsequence = {
      asleep: existing.asleep === true || this.consequence.asleep === true,
      endTurn: existing.endTurn === true || this.consequence.endTurn === true,
    };
  }
}

export function energyAttachFromHandConsequenceNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
  consequence: { asleep?: boolean; endTurn?: boolean },
): EnergyAttachFromHandConsequenceNextTurnEffect {
  const effect = new EnergyAttachFromHandConsequenceNextTurnEffect(attackEffect, consequence);
  effect.markerSource = source;
  return effect;
}

// =============================================================================
// Weakness / retreat cost / self buffs
// =============================================================================

/**
 * The Defending Pokémon's Weakness is now the given type until the end of the
 * attacking player's next turn. Applied as ×2 (no Weakness amount).
 */
export class DefendingPokemonWeaknessIsNowEffect extends EffectOfAttackEffect {
  readonly type: string = 'DEFENDING_POKEMON_WEAKNESS_IS_NOW_EFFECT';

  constructor(base: AttackEffect, public weaknessType: CardType) {
    super(base);
  }

  applyEffect(): void {
    const target = this.opponent.active;
    target.weaknessOverrideType = this.weaknessType;
    target.weaknessOverrideAttackerId = this.player.id;
    target.weaknessOverrideClearArmed = false;
  }
}

export function defendingPokemonWeaknessIsNowEffect(
  attackEffect: AttackEffect,
  source: Card,
  weaknessType: CardType,
): DefendingPokemonWeaknessIsNowEffect {
  const effect = new DefendingPokemonWeaknessIsNowEffect(attackEffect, weaknessType);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, this Pokémon has no Weakness.
 */
export class ThisPokemonHasNoWeaknessDuringOpponentsNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'THIS_POKEMON_HAS_NO_WEAKNESS_DURING_OPPONENTS_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.active.noWeaknessNextTurnPending = true;
  }
}

export function thisPokemonHasNoWeaknessDuringOpponentsNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): ThisPokemonHasNoWeaknessDuringOpponentsNextTurnEffect {
  const effect = new ThisPokemonHasNoWeaknessDuringOpponentsNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * During your next turn, this Pokémon has no Retreat Cost.
 */
export class ThisPokemonHasNoRetreatCostDuringYourNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'THIS_POKEMON_HAS_NO_RETREAT_COST_DURING_YOUR_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.active.zeroRetreatCostNextTurnPending = true;
  }
}

export function thisPokemonHasNoRetreatCostDuringYourNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): ThisPokemonHasNoRetreatCostDuringYourNextTurnEffect {
  const effect = new ThisPokemonHasNoRetreatCostDuringYourNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

// =============================================================================
// KO / survival / retaliate / prizes
// =============================================================================

export interface KnockOutIfDamagedOptions {
  /** Optional source filter (e.g. Rapid Strike only). */
  filter?: PreventDamageFilter;
}

/**
 * During your next turn, if the Defending Pokémon is damaged by an attack, it is Knocked Out.
 */
export class KnockOutIfDamagedDuringAttackerNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'KNOCK_OUT_IF_DAMAGED_DURING_ATTACKER_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect, public readonly options: KnockOutIfDamagedOptions = {}) {
    super(base);
  }

  applyEffect(): void {
    const target = this.opponent.active;
    target.knockOutIfDamagedNextTurn = true;
    target.knockOutIfDamagedNextTurnPending = true;
    target.knockOutIfDamagedNextTurnAttackerId = this.player.id;
    target.knockOutIfDamagedNextTurnFilter = this.options.filter ?? null;
    target.knockOutIfDamagedNextTurnAttack = this.attack;
    target.knockOutIfDamagedNextTurnSourceCard = this.markerSource as PokemonCard;
  }
}

export function knockOutIfDamagedDuringAttackerNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
  options: KnockOutIfDamagedOptions = {},
): KnockOutIfDamagedDuringAttackerNextTurnEffect {
  const effect = new KnockOutIfDamagedDuringAttackerNextTurnEffect(attackEffect, options);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, if this Pokémon would be Knocked Out by damage
 * from an attack, it is not Knocked Out and its remaining HP becomes 10.
 */
export class SurviveOnTenHpDuringOpponentsNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'SURVIVE_ON_TEN_HP_DURING_OPPONENTS_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect, public readonly options: SurviveOnTenHpOptions = {}) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.active.surviveOnTenHpNextTurnPending = { ...this.options };
  }
}

export function surviveOnTenHpDuringOpponentsNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
  options: SurviveOnTenHpOptions = {},
): SurviveOnTenHpDuringOpponentsNextTurnEffect {
  const effect = new SurviveOnTenHpDuringOpponentsNextTurnEffect(attackEffect, options);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, if this Pokémon is damaged by an attack
 * (even if Knocked Out), put damage counters on / reflect damage to the attacker.
 */
export class RetaliateOnDamageDuringOpponentsNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'RETALIATE_ON_DAMAGE_DURING_OPPONENTS_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect, public readonly options: RetaliateOnDamageOptions) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.active.retaliateOnDamageNextTurnPending = {
      ...this.options,
      attack: this.attack,
      sourceCard: this.markerSource as PokemonCard,
      attackerPlayerId: this.player.id,
    };
  }
}

export function retaliateOnDamageDuringOpponentsNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
  options: RetaliateOnDamageOptions,
): RetaliateOnDamageDuringOpponentsNextTurnEffect {
  const effect = new RetaliateOnDamageDuringOpponentsNextTurnEffect(attackEffect, options);
  effect.markerSource = source;
  return effect;
}

/**
 * Places revenge-trap damage counters on the Attacking Pokémon.
 * Attributed to the Pokémon that used the revenge attack so Mist Energy / other
 * "prevent effects of attacks" effects can block it.
 */
export class RetaliateDamageEffect extends EffectOfAttackEffect {
  readonly type: string = 'RETALIATE_DAMAGE_EFFECT';

  constructor(base: AttackEffect, public readonly damage: number) {
    super(base);
  }

  applyEffect(): void {
    if (this.damage > 0) {
      this.target.damage += this.damage;
    }
  }
}

export function retaliateDamageEffect(
  attackEffect: AttackEffect,
  damage: number,
  target: PokemonCardList,
): RetaliateDamageEffect {
  const effect = new RetaliateDamageEffect(attackEffect, damage);
  effect.target = target;
  return effect;
}

/**
 * If the Defending Pokémon is Knocked Out during your next turn, take N more Prize cards.
 */
export class ExtraPrizesIfKnockedOutDuringAttackerNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'EXTRA_PRIZES_IF_KNOCKED_OUT_DURING_ATTACKER_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect, public readonly extraPrizes: number) {
    super(base);
  }

  applyEffect(): void {
    const target = this.opponent.active;
    target.extraPrizesIfKnockedOutNextTurn = this.extraPrizes;
    target.extraPrizesIfKnockedOutNextTurnPending = true;
    target.extraPrizesIfKnockedOutNextTurnAttackerId = this.player.id;
  }
}

export function extraPrizesIfKnockedOutDuringAttackerNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
  extraPrizes: number,
): ExtraPrizesIfKnockedOutDuringAttackerNextTurnEffect {
  const effect = new ExtraPrizesIfKnockedOutDuringAttackerNextTurnEffect(attackEffect, extraPrizes);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, if this Pokémon is Knocked Out, deny Prize cards.
 */
export class DenyPrizesIfKnockedOutDuringOpponentsNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'DENY_PRIZES_IF_KNOCKED_OUT_DURING_OPPONENTS_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.active.denyPrizesIfKnockedOutNextTurnPending = true;
  }
}

export function denyPrizesIfKnockedOutDuringOpponentsNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): DenyPrizesIfKnockedOutDuringOpponentsNextTurnEffect {
  const effect = new DenyPrizesIfKnockedOutDuringOpponentsNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, if this Pokémon is Knocked Out by damage from an
 * attack, discard an Energy attached to the Attacking Pokémon.
 */
export class DiscardAttackerEnergyIfKnockedOutDuringOpponentsNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'DISCARD_ATTACKER_ENERGY_IF_KNOCKED_OUT_DURING_OPPONENTS_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.active.discardAttackerEnergyIfKnockedOutNextTurn = true;
    this.player.active.discardAttackerEnergyIfKnockedOutNextTurnPending = true;
    this.player.active.discardAttackerEnergyIfKnockedOutNextTurnAttack = this.attack;
    this.player.active.discardAttackerEnergyIfKnockedOutNextTurnSourceCard = this.markerSource as PokemonCard;
    this.player.active.discardAttackerEnergyIfKnockedOutNextTurnAttackerId = this.player.id;
  }
}

export function discardAttackerEnergyIfKnockedOutDuringOpponentsNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): DiscardAttackerEnergyIfKnockedOutDuringOpponentsNextTurnEffect {
  const effect = new DiscardAttackerEnergyIfKnockedOutDuringOpponentsNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

// =============================================================================
// End-of-turn schedules
// =============================================================================

export type ScheduleEndOfTurnPending =
  | { type: 'knock_out' }
  | { type: 'discard' }
  | { type: 'damage_counters'; damage: number }
  | { type: 'special_condition'; specialCondition: SpecialCondition };

/**
 * Schedules a delayed effect on the Defending Pokémon for the end of their next turn.
 * Mist Energy / prevent-effects-of-attacks can block this arming EffectOfAttack.
 */
export class ScheduleDefendingPokemonEndOfTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'SCHEDULE_DEFENDING_POKEMON_END_OF_TURN_EFFECT';

  constructor(
    base: AttackEffect,
    public readonly pending: ScheduleEndOfTurnPending,
  ) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.pendingEndOfTurnEffects.push({
      target: this.target,
      attack: this.attack,
      sourceCard: this.markerSource as PokemonCard,
      attackerPlayerId: this.player.id,
      ...this.pending,
    } as PendingEndOfTurnEffect);
  }
}

export function scheduleDefendingPokemonEndOfTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
  pending: ScheduleEndOfTurnPending,
  target?: PokemonCardList,
): ScheduleDefendingPokemonEndOfTurnEffect {
  const effect = new ScheduleDefendingPokemonEndOfTurnEffect(attackEffect, pending);
  effect.markerSource = source;
  if (target) {
    effect.target = target;
  }
  return effect;
}

// =============================================================================
// Player-level turn restrictions
// =============================================================================

/**
 * Your opponent can't draw a card at the beginning of their next turn.
 * Player-level — not Mist-blockable (target is the attacker).
 */
export class OpponentCannotDrawAtStartOfNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'OPPONENT_CANNOT_DRAW_AT_START_OF_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.opponent.cannotDrawAtStartOfTurn = true;
  }
}

export function opponentCannotDrawAtStartOfNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): OpponentCannotDrawAtStartOfNextTurnEffect {
  const effect = new OpponentCannotDrawAtStartOfNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * During your next turn, your Pokémon can't attack (including ones that come into play).
 * Player-level — not Mist-blockable.
 */
export class YourPokemonCannotAttackDuringYourNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'YOUR_POKEMON_CANNOT_ATTACK_DURING_YOUR_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.cannotAttackTurnsRemaining = Math.max(this.player.cannotAttackTurnsRemaining, 2);
  }
}

export function yourPokemonCannotAttackDuringYourNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): YourPokemonCannotAttackDuringYourNextTurnEffect {
  const effect = new YourPokemonCannotAttackDuringYourNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * During the opponent's next turn, their Pokémon can't attack (including ones
 * that come into play). Player-level — not Mist-blockable.
 */
export class OpponentPokemonCannotAttackDuringTheirNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'OPPONENT_POKEMON_CANNOT_ATTACK_DURING_THEIR_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect, public readonly maxEnergy: number | null = null) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    if (this.maxEnergy === null) {
      this.opponent.cannotAttackTurnsRemaining = Math.max(this.opponent.cannotAttackTurnsRemaining, 1);
      return;
    }
    this.opponent.cannotAttackMaxEnergy = this.maxEnergy;
    this.opponent.cannotAttackMaxEnergyTurnsRemaining = Math.max(
      this.opponent.cannotAttackMaxEnergyTurnsRemaining,
      1,
    );
  }
}

export function opponentPokemonCannotAttackDuringTheirNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
  maxEnergy: number | null = null,
): OpponentPokemonCannotAttackDuringTheirNextTurnEffect {
  const effect = new OpponentPokemonCannotAttackDuringTheirNextTurnEffect(attackEffect, maxEnergy);
  effect.markerSource = source;
  return effect;
}

/**
 * During your next turn, ignore all Energy in the attack costs of Pokémon of the given types.
 * Player-level — not Mist-blockable.
 */
export class IgnoreAttackCostsForTypesDuringYourNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'IGNORE_ATTACK_COSTS_FOR_TYPES_DURING_YOUR_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect, public readonly cardTypes: CardType[]) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    this.player.ignoreAttackCostCardTypes = [...this.cardTypes];
    this.player.ignoreAttackCostTurnsRemaining = Math.max(this.player.ignoreAttackCostTurnsRemaining, 2);
  }
}

export function ignoreAttackCostsForTypesDuringYourNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
  cardTypes: CardType[],
): IgnoreAttackCostsForTypesDuringYourNextTurnEffect {
  const effect = new IgnoreAttackCostsForTypesDuringYourNextTurnEffect(attackEffect, cardTypes);
  effect.markerSource = source;
  return effect;
}

// =============================================================================
// Evolve / abilities locks
// =============================================================================

/**
 * During the opponent's next turn, Pokémon can't be played from hand to evolve
 * the Defending Pokémon. Mist Energy can block this (targets the Defending Pokémon).
 */
export class CannotEvolveDefendingNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'CANNOT_EVOLVE_DEFENDING_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
  }

  applyEffect(): void {
    this.opponent.active.cannotEvolveNextTurn = true;
  }
}

export function cannotEvolveDefendingNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): CannotEvolveDefendingNextTurnEffect {
  const effect = new CannotEvolveDefendingNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * The Defending Pokémon has no Abilities until the end of your next turn (Gastro Acid).
 * Mist Energy can block this.
 */
export class DefendingPokemonHasNoAbilitiesUntilEndOfAttackerNextTurnEffect extends EffectOfAttackEffect {
  readonly type: string = 'DEFENDING_POKEMON_HAS_NO_ABILITIES_UNTIL_END_OF_ATTACKER_NEXT_TURN_EFFECT';

  constructor(base: AttackEffect) {
    super(base);
  }

  applyEffect(): void {
    const target = this.opponent.active;
    target.noAbilities = true;
    target.noAbilitiesAttackerId = this.player.id;
    target.noAbilitiesClearArmed = false;
  }
}

export function defendingPokemonHasNoAbilitiesUntilEndOfAttackerNextTurnEffect(
  attackEffect: AttackEffect,
  source: Card,
): DefendingPokemonHasNoAbilitiesUntilEndOfAttackerNextTurnEffect {
  const effect = new DefendingPokemonHasNoAbilitiesUntilEndOfAttackerNextTurnEffect(attackEffect);
  effect.markerSource = source;
  return effect;
}

/**
 * Until the end of the opponent's next turn, each of their Pokémon in play, hand,
 * and discard has no Abilities (Greninja Shadow Stitching). Player-level — not Mist-blockable.
 */
export interface OpponentPowerSuppressionOptions {
  powerTypes?: PowerType[];
  mode?: AttackPowerSuppression['mode'];
}

export class OpponentPokemonHaveNoAbilitiesEffect extends EffectOfAttackEffect {
  readonly type: string = 'OPPONENT_POKEMON_HAVE_NO_ABILITIES_EFFECT';

  constructor(
    base: AttackEffect,
    public readonly options: OpponentPowerSuppressionOptions = {},
  ) {
    super(base);
    this.target = base.source;
  }

  applyEffect(): void {
    const powerTypes = this.options.powerTypes ?? [PowerType.ABILITY];
    const mode = this.options.mode ?? 'remove';
    const existing = this.opponent.attackPowerSuppressions.find(suppression =>
      suppression.mode === mode && samePowerTypes(suppression.powerTypes, powerTypes));
    if (existing) {
      existing.turnsRemaining = Math.max(existing.turnsRemaining, 1);
      return;
    }
    this.opponent.attackPowerSuppressions.push({
      turnsRemaining: 1,
      powerTypes: [...powerTypes],
      mode,
    });
  }
}

function samePowerTypes(left: PowerType[], right: PowerType[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every(type => right.includes(type));
}

export function opponentPokemonHaveNoAbilitiesEffect(
  attackEffect: AttackEffect,
  source: Card,
  options: OpponentPowerSuppressionOptions = {},
): OpponentPokemonHaveNoAbilitiesEffect {
  const effect = new OpponentPokemonHaveNoAbilitiesEffect(attackEffect, options);
  effect.markerSource = source;
  return effect;
}

