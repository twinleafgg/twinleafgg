import { Card } from '../card/card';
import { BoardEffect, CardTag, CardType, SpecialCondition, Stage, SuperType } from '../card/card-types';
import { PokemonCard } from '../card/pokemon-card';
import { Power, Attack } from '../card/pokemon-types';
import { CardList } from './card-list';
import { Marker } from './card-marker';
import { PendingEnergyAttachDamageCounters, PendingEnergyAttachFromHandConsequence } from './pending-energy-attach-effects';
import { State } from './state';
import { StateUtils } from '../state-utils';

/** Filters for {@link PokemonCardList.preventDamageNextTurn} attack damage prevention. */
export interface PreventDamageFilter {
  /** Only prevent damage at or below this amount after Weakness/Resistance. */
  maxDamage?: number;
  sourceStage?: Stage;
  /** When true, only Evolution Pokémon (stage !== BASIC) match. */
  sourceIsEvolution?: boolean;
  sourceTags?: CardTag[];
  sourceCardTypes?: CardType[];
  sourceHasAbility?: boolean;
  /** Attacker has this Special Condition (e.g. Burned). */
  sourceHasSpecialCondition?: SpecialCondition;
  /** Attacker has a Poké-Power or Poké-Body. */
  sourceHasPokePowerOrBody?: boolean;
}

export interface NextTurnCoinFlipCount {
  attackName: string;
  flips: number;
  sourceCardName: string;
}

export interface NextTurnAttackDamageBonus {
  attackName: string;
  bonusDamage: number;
  sourceCardName: string;
}

export interface NextTurnAttackBaseDamage {
  setupAttackName: string;
  attackName: string;
  baseDamage: number;
  sourceCardName: string;
}

/** Survive-at-10 during opponent's next turn (Endure / Bide / Gritty Claws). */
export interface SurviveOnTenHpOptions {
  requireFullHp?: boolean;
  /** Flip a coin when this Pokémon would be KO'd; only survive on heads (Strong-Willed). */
  coinFlipOnWouldKo?: boolean;
}

/**
 * Revenge trap: fixed HP damage or reflect damage taken.
 * When `coinFlipPrevent` is true (Reflect Shield): on damage during the opponent's
 * next turn, flip a coin; if heads, prevent that damage and still deal `damage` to
 * the attacker; if tails, take the damage (no revenge).
 */
export type RetaliateOnDamageOptions =
  | { damage: number; coinFlipPrevent?: boolean }
  | { reflect: true };

/** Armed revenge trap with attack attribution (so Mist Energy / effects-of-attacks can block). */
export type StoredRetaliateOnDamage = RetaliateOnDamageOptions & {
  attack: Attack;
  sourceCard: PokemonCard;
  attackerPlayerId: number;
};

export class PokemonCardList extends CardList {
  public damage: number = 0;
  public hp: number = 0;
  public specialConditions: SpecialCondition[] = [];
  public poisonDamage: number = 10;
  public burnDamage: number = 20;
  public confusionDamage: number = 30;
  public marker = new Marker();
  public pokemonPlayedTurn: number = 0;
  /**
   * When this slot's Pokemon last activated an `abilityLock` Ability while Active.
   * Lower values win against later lockers (TPCi "first in effect" rulings).
   * `0` means not currently an established ability locker.
   */
  public abilityLockActivationOrder: number = 0;
  public sleepFlips = 1;
  public boardEffect: BoardEffect[] = [];
  public hpBonus: number = 0;
  public tools: Card[] = [];
  public energies: CardList = new CardList();
  public stadium: Card | undefined;
  public isActivatingCard: boolean = false;
  public attacksThisTurn?: number;
  public showAllStageAbilities: boolean = false;
  public triggerEvolutionAnimation: boolean = false;
  public showBasicAnimation: boolean = false;
  public triggerAttackAnimation: boolean = false;
  public damageReductionNextTurn: number = 0;
  /** Optional source filter for {@link damageReductionNextTurn} (e.g. Evolution-only). */
  public damageReductionNextTurnFilter: PreventDamageFilter | null = null;
  public damageReductionBeforeWeaknessNextTurn: number = 0;
  public preventDamageNextTurn: PreventDamageFilter | null = null;
  public preventDamageNextTurnPending: PreventDamageFilter | null = null;
  public preventEffectsOfAttacksNextTurn: PreventDamageFilter | null = null;
  public preventEffectsOfAttacksNextTurnPending: PreventDamageFilter | null = null;
  public cannotBeHealedNextTurn: boolean = false;
  /** True if this Pokémon had damage counters removed by a HealEffect this turn. */
  public healedThisTurn: boolean = false;
  /** During the opponent's next turn, flip a coin when attack damage would be done; heads prevents that damage. */
  public coinFlipPreventAttackDamageNextTurn: boolean = false;
  public coinFlipPreventAttackDamageNextTurnPending: boolean = false;
  /** During the opponent's next turn, this Pokémon can't be affected by Special Conditions. */
  public cannotBeSpecialConditionedNextTurn: boolean = false;
  public cannotBeSpecialConditionedNextTurnPending: boolean = false;
  /** During the opponent's next turn, this Pokémon has no Weakness. */
  public noWeaknessNextTurn: boolean = false;
  public noWeaknessNextTurnPending: boolean = false;
  /** During the owner's next turn, this Pokémon has no Retreat Cost. */
  public zeroRetreatCostNextTurn: boolean = false;
  public zeroRetreatCostNextTurnPending: boolean = false;
  public defendingPokemonExtraDamageNextTurn: number = 0;
  public defendingPokemonExtraDamageAttackerId: number | undefined = undefined;
  public defendingPokemonExtraDamagePending: boolean = false;
  public defendingPokemonExtraDamageRearmAfterAttack: boolean = false;
  public attackCostIncreaseNextTurn = 0;
  public attackCostIncreaseNextTurnPending = 0;
  public attackCostIncreaseNextTurnAttackerId: number | undefined;
  public attackCostIncreaseWhileActive: number = 0;
  public attackCostIncreaseWhileActiveSourceCard: PokemonCard | undefined;
  /** Extra attack damage while this Pokémon stays Active. Cleared on switch. */
  public whileActiveAttackDamageBonus: number = 0;
  /** Extra damage this Pokémon's attacks do to the opponent's Active during its next turn. */
  public outgoingAttackDamageBonusNextTurn: number = 0;
  public outgoingAttackDamageBonusNextTurnPending: number = 0;
  /** Overrides the coin-flip count of a named attack during the owner's next turn. */
  public nextTurnCoinFlipCount: NextTurnCoinFlipCount | null = null;
  public nextTurnCoinFlipCountPending: NextTurnCoinFlipCount | null = null;
  public retreatCostIncreaseNextTurn = 0;
  public retreatCostIncreaseNextTurnPending = 0;
  public retreatCostIncreaseNextTurnAttackerId: number | undefined;
  public cannotRetreatWhileActive: boolean = false;
  public cannotRetreatWhileActiveSourceCard: PokemonCard | undefined;
  public nextTurnAttackDamageBonus: NextTurnAttackDamageBonus | null = null;
  public nextTurnAttackDamageBonusPending: NextTurnAttackDamageBonus | null = null;
  public nextTurnAttackBaseDamage: NextTurnAttackBaseDamage | null = null;
  public nextTurnAttackBaseDamagePending: NextTurnAttackBaseDamage | null = null;
  public weaknessOverrideType: CardType | undefined = undefined;
  public weaknessOverrideAttackerId: number | undefined = undefined;
  public weaknessOverrideClearArmed: boolean = false;

  /**
   * Hangman / ticking KO: during the attacker's next turn, if this Pokémon is
   * damaged by an attack (optionally filtered), it is Knocked Out.
   */
  public knockOutIfDamagedNextTurn: boolean = false;
  public knockOutIfDamagedNextTurnPending: boolean = false;
  public knockOutIfDamagedNextTurnAttackerId: number | undefined = undefined;
  public knockOutIfDamagedNextTurnFilter: PreventDamageFilter | null = null;
  /** Attack attribution for Mist-blockable hangman KO application. */
  public knockOutIfDamagedNextTurnAttack: Attack | undefined = undefined;
  public knockOutIfDamagedNextTurnSourceCard: PokemonCard | undefined = undefined;

  /** Survive at 10 HP during opponent's next turn (Endure / Bide / Gritty Claws). */
  public surviveOnTenHpNextTurn: SurviveOnTenHpOptions | null = null;
  public surviveOnTenHpNextTurnPending: SurviveOnTenHpOptions | null = null;

  /** Revenge trap during opponent's next turn (Shell Trap / Counter Press). */
  public retaliateOnDamageNextTurn: StoredRetaliateOnDamage | null = null;
  public retaliateOnDamageNextTurnPending: StoredRetaliateOnDamage | null = null;

  /**
   * Extra prizes if this (Defending) Pokémon is Knocked Out during the
   * attacker's next turn.
   */
  public extraPrizesIfKnockedOutNextTurn: number = 0;
  public extraPrizesIfKnockedOutNextTurnPending: boolean = false;
  public extraPrizesIfKnockedOutNextTurnAttackerId: number | undefined = undefined;

  /** If this Pokémon is Knocked Out during opponent's next turn, deny prizes. */
  public denyPrizesIfKnockedOutNextTurn: boolean = false;
  public denyPrizesIfKnockedOutNextTurnPending: boolean = false;

  /** If this Pokémon is Knocked Out during opponent's next turn, discard Energy from attacker. */
  public discardAttackerEnergyIfKnockedOutNextTurn: boolean = false;
  public discardAttackerEnergyIfKnockedOutNextTurnPending: boolean = false;
  public discardAttackerEnergyIfKnockedOutNextTurnAttack: Attack | undefined = undefined;
  public discardAttackerEnergyIfKnockedOutNextTurnSourceCard: PokemonCard | undefined = undefined;
  public discardAttackerEnergyIfKnockedOutNextTurnAttackerId: number | undefined = undefined;

  public cannotAttackNextTurn: boolean = false;
  public cannotAttackNextTurnPending: boolean = false;
  public cannotUseAttacksNextTurn: string[] = [];
  public cannotUseAttacksNextTurnPending: string[] = [];
  /**
   * Smokescreen / Sand-Attack style: when this Pokémon tries to attack, its owner
   * flips this many coins. If any is tails, that attack does nothing.
   * `0` = inactive. Set on the Defending Pokémon for the opponent's next turn.
   */
  public coinFlipCancelAttackNextTurn: number = 0;
  /**
   * Growl / Daunt style: this Pokémon's attacks do this many less damage
   * (before Weakness and Resistance). `0` = inactive.
   * Set on the Defending Pokémon for the opponent's next turn.
   */
  public attackDamageReductionNextTurn: number = 0;
  /**
   * Snarl style: this Pokémon's attacks do this many less damage
   * after Weakness and Resistance. `0` = inactive.
   * Set on the Defending Pokémon for the opponent's next turn.
   */
  public attackDamageReductionAfterWeaknessNextTurn: number = 0;
  public cannotRetreatNextTurn: boolean = false;
  public cannotRetreatNextTurnPending: boolean = false;
  /**
   * During the owner's next turn, Energy can't be attached from their hand to this Pokémon.
   * Set on the Defending Pokémon by Sand Tomb / Spit Glue / etc.
   */
  public cannotAttachEnergyFromHandNextTurn: boolean = false;
  public pendingEnergyAttachDamageCounters: PendingEnergyAttachDamageCounters | null = null;
  /** Asleep / end-turn consequences when Energy is attached from hand (Boo-Hoo / Lazy Howl). */
  public pendingEnergyAttachFromHandConsequence: PendingEnergyAttachFromHandConsequence | null = null;
  public pendingEnergyReturnToHand: Card[] = [];
  public blockedAttackNameNextTurn: string | undefined = undefined;
  public blockedAttackNameUntilLeavesActive: string | undefined = undefined;
  /**
   * Encore: during the owner's next turn, this Pokémon can only use this attack.
   */
  public onlyAllowedAttackNameNextTurn: string | undefined = undefined;
  /**
   * During the owner's next turn, Pokémon can't be played from hand to evolve this Pokémon.
   */
  public cannotEvolveNextTurn: boolean = false;
  /**
   * This Pokémon may evolve this turn even if it was put into play this turn
   * (e.g. Evolutionary Advantage). Cleared at end of turn / when leaving play.
   */
  public canEvolveThisTurn: boolean = false;
  /**
   * The Defending Pokémon has no Abilities until the end of the attacker's next turn
   * (Gastro Acid). Cleared with a two-phase arm on the attacker's EndTurns.
   */
  public noAbilities: boolean = false;
  public noAbilitiesAttackerId: number | undefined = undefined;
  public noAbilitiesClearArmed: boolean = false;
  public _preservedConditionsDuringEvolution?: SpecialCondition[];

  public static readonly CLEAR_KNOCKOUT_MARKER = 'CLEAR_KNOCKOUT_MARKER';
  public static readonly KNOCKOUT_MARKER = 'KNOCKOUT_MARKER';

  public getPokemons(): PokemonCard[] {
    const result: PokemonCard[] = [];
    for (const card of this.cards) {
      if (
        card.superType === SuperType.POKEMON &&
        !this.tools.includes(card) &&
        !this.energies.cards.includes(card)
      ) {
        result.push(card as PokemonCard);
      } else if (card.name === "Lillie's Poké Doll") {
        result.push(card as PokemonCard);
      } else if (card.name === 'Clefairy Doll') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Rare Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Robo Substitute') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Mysterious Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Unidentified Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Antique Plume Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Antique Cover Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Antique Skull Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Antique Armor Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Antique Jaw Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Antique Sail Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Antique Root Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Claw Fossil') {
        result.push(card as PokemonCard);
      } else if (card.name === 'Root Fossil') {
        result.push(card as PokemonCard);
      }
    }
    return result;
  }

  public getPokemonCard(): PokemonCard | undefined {
    const pokemons = this.getPokemons();
    if (pokemons.length > 0) {
      return pokemons[pokemons.length - 1];
    }
  }

  public isStage(stage: Stage): boolean {
    const pokemonCard = this.getPokemonCard();
    if (pokemonCard === undefined) {
      return false;
    }
    return pokemonCard.stage === stage;
  }

  public isEvolved(): boolean {
    const pokemons = this.getPokemons();
    const pokemonCard = this.getPokemonCard();

    // Single Pokémon (not evolved)
    if (pokemons.length === 1) {
      return false;
    }

    // LEGEND cards are not considered evolved
    if (pokemonCard?.stage === Stage.LEGEND) {
      return false;
    }

    // VUNION cards are not considered evolved
    if (pokemonCard?.stage === Stage.VUNION) {
      return false;
    }

    // LV_X placed on a Pokémon is not considered evolved
    if (pokemonCard?.stage === Stage.LV_X && pokemons.length === 2) {
      return false;
    }

    // Otherwise, it's evolved
    return true;
  }

  /**
   * Surgically remove only attack-sourced effects from this Pokemon.
   * Unlike `clearEffects()`, this preserves special conditions, ability markers,
   * and other non-attack state.
   */
  removeAttackEffects(): void {
    this.marker.removeAttackEffects();
    this.cannotAttackNextTurn = false;
    this.cannotAttackNextTurnPending = false;
    this.cannotUseAttacksNextTurn = [];
    this.cannotUseAttacksNextTurnPending = [];
    this.coinFlipCancelAttackNextTurn = 0;
    this.attackDamageReductionNextTurn = 0;
    this.attackDamageReductionAfterWeaknessNextTurn = 0;
    this.cannotRetreatNextTurn = false;
    this.cannotRetreatNextTurnPending = false;
    this.cannotAttachEnergyFromHandNextTurn = false;
    this.pendingEnergyAttachDamageCounters = null;
    this.pendingEnergyAttachFromHandConsequence = null;
    this.pendingEnergyReturnToHand = [];
    this.blockedAttackNameNextTurn = undefined;
    this.blockedAttackNameUntilLeavesActive = undefined;
    this.onlyAllowedAttackNameNextTurn = undefined;
    this.cannotEvolveNextTurn = false;
    this.noAbilities = false;
    this.noAbilitiesAttackerId = undefined;
    this.noAbilitiesClearArmed = false;
    this.damageReductionNextTurn = 0;
    this.damageReductionNextTurnFilter = null;
    this.damageReductionBeforeWeaknessNextTurn = 0;
    this.preventDamageNextTurn = null;
    this.preventDamageNextTurnPending = null;
    this.preventEffectsOfAttacksNextTurn = null;
    this.preventEffectsOfAttacksNextTurnPending = null;
    this.cannotBeHealedNextTurn = false;
    this.healedThisTurn = false;
    this.coinFlipPreventAttackDamageNextTurn = false;
    this.coinFlipPreventAttackDamageNextTurnPending = false;
    this.cannotBeSpecialConditionedNextTurn = false;
    this.cannotBeSpecialConditionedNextTurnPending = false;
    this.noWeaknessNextTurn = false;
    this.noWeaknessNextTurnPending = false;
    this.zeroRetreatCostNextTurn = false;
    this.zeroRetreatCostNextTurnPending = false;
    this.defendingPokemonExtraDamageNextTurn = 0;
    this.defendingPokemonExtraDamageAttackerId = undefined;
    this.defendingPokemonExtraDamagePending = false;
    this.defendingPokemonExtraDamageRearmAfterAttack = false;
    this.attackCostIncreaseNextTurn = 0;
    this.attackCostIncreaseNextTurnPending = 0;
    this.attackCostIncreaseNextTurnAttackerId = undefined;
    this.attackCostIncreaseWhileActive = 0;
    this.attackCostIncreaseWhileActiveSourceCard = undefined;
    this.whileActiveAttackDamageBonus = 0;
    this.outgoingAttackDamageBonusNextTurn = 0;
    this.outgoingAttackDamageBonusNextTurnPending = 0;
    this.nextTurnCoinFlipCount = null;
    this.nextTurnCoinFlipCountPending = null;
    this.retreatCostIncreaseNextTurn = 0;
    this.retreatCostIncreaseNextTurnPending = 0;
    this.retreatCostIncreaseNextTurnAttackerId = undefined;
    this.cannotRetreatWhileActive = false;
    this.cannotRetreatWhileActiveSourceCard = undefined;
    this.nextTurnAttackDamageBonus = null;
    this.nextTurnAttackDamageBonusPending = null;
    this.nextTurnAttackBaseDamage = null;
    this.nextTurnAttackBaseDamagePending = null;
    this.weaknessOverrideType = undefined;
    this.weaknessOverrideAttackerId = undefined;
    this.weaknessOverrideClearArmed = false;
    this.knockOutIfDamagedNextTurn = false;
    this.knockOutIfDamagedNextTurnPending = false;
    this.knockOutIfDamagedNextTurnAttackerId = undefined;
    this.knockOutIfDamagedNextTurnFilter = null;
    this.knockOutIfDamagedNextTurnAttack = undefined;
    this.knockOutIfDamagedNextTurnSourceCard = undefined;
    this.surviveOnTenHpNextTurn = null;
    this.surviveOnTenHpNextTurnPending = null;
    this.retaliateOnDamageNextTurn = null;
    this.retaliateOnDamageNextTurnPending = null;
    this.extraPrizesIfKnockedOutNextTurn = 0;
    this.extraPrizesIfKnockedOutNextTurnPending = false;
    this.extraPrizesIfKnockedOutNextTurnAttackerId = undefined;
    this.denyPrizesIfKnockedOutNextTurn = false;
    this.denyPrizesIfKnockedOutNextTurnPending = false;
    this.discardAttackerEnergyIfKnockedOutNextTurn = false;
    this.discardAttackerEnergyIfKnockedOutNextTurnPending = false;
    this.discardAttackerEnergyIfKnockedOutNextTurnAttack = undefined;
    this.discardAttackerEnergyIfKnockedOutNextTurnSourceCard = undefined;
    this.discardAttackerEnergyIfKnockedOutNextTurnAttackerId = undefined;
  }

  clearEffects(): void {
    // Nuclear option: wipe all markers (used by evolution/KO)
    this.marker.markers = [];

    this.triggerEvolutionAnimation = false;
    this.showBasicAnimation = false;
    this.triggerAttackAnimation = false;

    // Check if we're in an evolution context (preserved conditions are set)
    const preservedConditions = this._preservedConditionsDuringEvolution || [];

    // Only remove special conditions that are not preserved
    const conditionsToRemove = [
      SpecialCondition.POISONED,
      SpecialCondition.ASLEEP,
      SpecialCondition.BURNED,
      SpecialCondition.CONFUSED,
      SpecialCondition.PARALYZED,
    ].filter((condition) => !preservedConditions.includes(condition));

    conditionsToRemove.forEach((condition) => {
      this.removeSpecialCondition(condition);
    });

    this.poisonDamage = 10;
    this.burnDamage = 20;
    this.confusionDamage = 30;
    this.damageReductionNextTurn = 0;
    this.damageReductionNextTurnFilter = null;
    this.damageReductionBeforeWeaknessNextTurn = 0;
    this.attackDamageReductionAfterWeaknessNextTurn = 0;
    this.preventDamageNextTurn = null;
    this.preventDamageNextTurnPending = null;
    this.preventEffectsOfAttacksNextTurn = null;
    this.preventEffectsOfAttacksNextTurnPending = null;
    this.cannotBeHealedNextTurn = false;
    this.healedThisTurn = false;
    this.coinFlipPreventAttackDamageNextTurn = false;
    this.coinFlipPreventAttackDamageNextTurnPending = false;
    this.cannotBeSpecialConditionedNextTurn = false;
    this.cannotBeSpecialConditionedNextTurnPending = false;
    this.whileActiveAttackDamageBonus = 0;
    this.outgoingAttackDamageBonusNextTurn = 0;
    this.outgoingAttackDamageBonusNextTurnPending = 0;
    this.nextTurnCoinFlipCount = null;
    this.nextTurnCoinFlipCountPending = null;
    this.noWeaknessNextTurn = false;
    this.noWeaknessNextTurnPending = false;
    this.zeroRetreatCostNextTurn = false;
    this.zeroRetreatCostNextTurnPending = false;
    this.defendingPokemonExtraDamageNextTurn = 0;
    this.defendingPokemonExtraDamageAttackerId = undefined;
    this.defendingPokemonExtraDamagePending = false;
    this.defendingPokemonExtraDamageRearmAfterAttack = false;
    this.weaknessOverrideType = undefined;
    this.weaknessOverrideAttackerId = undefined;
    this.weaknessOverrideClearArmed = false;
    this.knockOutIfDamagedNextTurn = false;
    this.knockOutIfDamagedNextTurnPending = false;
    this.knockOutIfDamagedNextTurnAttackerId = undefined;
    this.knockOutIfDamagedNextTurnFilter = null;
    this.knockOutIfDamagedNextTurnAttack = undefined;
    this.knockOutIfDamagedNextTurnSourceCard = undefined;
    this.surviveOnTenHpNextTurn = null;
    this.surviveOnTenHpNextTurnPending = null;
    this.retaliateOnDamageNextTurn = null;
    this.retaliateOnDamageNextTurnPending = null;
    this.extraPrizesIfKnockedOutNextTurn = 0;
    this.extraPrizesIfKnockedOutNextTurnPending = false;
    this.extraPrizesIfKnockedOutNextTurnAttackerId = undefined;
    this.denyPrizesIfKnockedOutNextTurn = false;
    this.denyPrizesIfKnockedOutNextTurnPending = false;
    this.discardAttackerEnergyIfKnockedOutNextTurn = false;
    this.discardAttackerEnergyIfKnockedOutNextTurnPending = false;
    this.discardAttackerEnergyIfKnockedOutNextTurnAttack = undefined;
    this.discardAttackerEnergyIfKnockedOutNextTurnSourceCard = undefined;
    this.discardAttackerEnergyIfKnockedOutNextTurnAttackerId = undefined;
    this.cannotAttackNextTurn = false;
    this.cannotAttackNextTurnPending = false;
    this.cannotUseAttacksNextTurn = [];
    this.cannotUseAttacksNextTurnPending = [];
    this.coinFlipCancelAttackNextTurn = 0;
    this.attackDamageReductionNextTurn = 0;
    this.cannotRetreatNextTurn = false;
    this.cannotRetreatNextTurnPending = false;
    this.cannotAttachEnergyFromHandNextTurn = false;
    this.pendingEnergyAttachDamageCounters = null;
    this.pendingEnergyAttachFromHandConsequence = null;
    this.pendingEnergyReturnToHand = [];
    this.blockedAttackNameNextTurn = undefined;
    this.blockedAttackNameUntilLeavesActive = undefined;
    this.onlyAllowedAttackNameNextTurn = undefined;
    this.cannotEvolveNextTurn = false;
    this.canEvolveThisTurn = false;
    this.noAbilities = false;
    this.noAbilitiesAttackerId = undefined;
    this.noAbilitiesClearArmed = false;
    // if (this.cards.length === 0) {
    //   this.damage = 0;
    // }
    // if (this.tool && !this.cards.includes(this.tool)) {
    //   this.tool = undefined;
    // }
  }

  clearAllSpecialConditions(): void {
    this.removeSpecialCondition(SpecialCondition.POISONED);
    this.removeSpecialCondition(SpecialCondition.ASLEEP);
    this.removeSpecialCondition(SpecialCondition.BURNED);
    this.removeSpecialCondition(SpecialCondition.CONFUSED);
    this.removeSpecialCondition(SpecialCondition.PARALYZED);
  }

  removeSpecialCondition(sp: SpecialCondition): void {
    if (!this.specialConditions.includes(sp)) {
      return;
    }
    this.specialConditions = this.specialConditions.filter((s) => s !== sp);
  }

  addSpecialCondition(sp: SpecialCondition): void {
    if (this.cannotBeSpecialConditionedNextTurn) {
      return;
    }
    if (sp === SpecialCondition.POISONED) {
      this.poisonDamage = 10;
    }
    if (sp === SpecialCondition.BURNED) {
      this.burnDamage = 20;
    }
    if (sp === SpecialCondition.CONFUSED) {
      this.confusionDamage = 30;
    }
    if (this.specialConditions.includes(sp)) {
      return;
    }
    if (sp === SpecialCondition.POISONED || sp === SpecialCondition.BURNED) {
      this.specialConditions.push(sp);
      return;
    }
    this.specialConditions = this.specialConditions.filter(
      (s) =>
        [SpecialCondition.PARALYZED, SpecialCondition.CONFUSED, SpecialCondition.ASLEEP].includes(
          s,
        ) === false,
    );
    this.specialConditions.push(sp);
  }

  removeBoardEffect(sp: BoardEffect): void {
    if (!this.boardEffect.includes(sp)) {
      return;
    }
    this.boardEffect = this.boardEffect.filter((s) => s !== sp);
  }

  addBoardEffect(sp: BoardEffect): void {
    if (this.boardEffect.includes(sp)) {
      return;
    }
    this.boardEffect = this.boardEffect.filter(
      (s) =>
        [
          BoardEffect.ABILITY_USED,
          BoardEffect.POWER_GLOW,
          BoardEffect.POWER_NEGATED_GLOW,
          BoardEffect.POWER_RETURN,
        ].includes(s) === false,
    );
    this.boardEffect.push(sp);
  }

  //Rule-Box Pokemon

  hasRuleBox(): boolean {
    return this.cards.some((c) => c.hasRuleBox());
  }

  vPokemon(): boolean {
    return this.cards.some(
      (c) =>
        c.tags.includes(CardTag.POKEMON_V) ||
        c.tags.includes(CardTag.POKEMON_VMAX) ||
        c.tags.includes(CardTag.POKEMON_VSTAR) ||
        c.tags.includes(CardTag.POKEMON_VUNION),
    );
  }

  exPokemon(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.POKEMON_ex));
  }

  EXPokemon(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.POKEMON_EX));
  }

  isTera(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.POKEMON_TERA));
  }

  //Single/Rapid/Fusion Strike

  singleStrikePokemon(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.SINGLE_STRIKE));
  }

  rapidStrikePokemon(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.RAPID_STRIKE));
  }

  fusionStrikePokemon(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.FUSION_STRIKE));
  }

  //Future/Ancient

  futurePokemon(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.FUTURE));
  }

  ancientPokemon(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.ANCIENT));
  }

  //Trainer Pokemon

  isLillies(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.LILLIES));
  }

  isNs(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.NS));
  }

  isIonos(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.IONOS));
  }

  isHops(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.HOPS));
  }

  isEthans(): boolean {
    return this.cards.some((c) => c.tags.includes(CardTag.ETHANS));
  }

  getToolEffect(): Power | Attack | undefined {
    if (this.tools.length === 0) {
      return;
    }

    const toolCard = this.tools[0];

    if (toolCard instanceof PokemonCard) {
      return toolCard.powers[0] || toolCard.attacks[0];
    }

    // removeTool(tool: Card): void {
    //   const index = this.tools.indexOf(tool);
    //   if (index >= 0) {
    //     delete this.tools[index];
    //   }
    //   this.tools = this.tools.filter(c => c instanceof Card);
    // }
  }

  isPlayerActive(state: State): boolean {
    const player = state.players[state.activePlayer];
    return player.active === this;
  }

  isOpponentActive(state: State): boolean {
    const opponent = StateUtils.getOpponent(state, state.players[state.activePlayer]);
    return opponent.active === this;
  }

  isPlayerBench(state: State): boolean {
    const player = state.players[state.activePlayer];
    return player.bench.includes(this);
  }

  isOpponentBench(state: State): boolean {
    const opponent = StateUtils.getOpponent(state, state.players[state.activePlayer]);
    return opponent.bench.includes(this);
  }

  // Override the parent CardList's moveTo method to properly handle Pokemon acting as energy
  public moveTo(destination: CardList, count?: number): void {
    // Move energies CardList to destination before moving cards
    if (this.energies.cards.length > 0) {
      this.energies.moveTo(destination);
    }

    super.moveTo(destination, count);
  }

  public moveCardsTo(cards: Card[], destination: CardList): void {
    for (let i = 0; i < cards.length; i++) {
      let index = this.cards.indexOf(cards[i]);
      if (index !== -1) {
        const card = this.cards.splice(index, 1);
        // Remove the card from energies if it's there
        const energyIndex = this.energies.cards.indexOf(card[0]);
        if (energyIndex !== -1) {
          this.energies.cards.splice(energyIndex, 1);
        }
        destination.cards.push(card[0]);
        // If destination is a PokemonCardList and card is an energy card (not a Pokemon), add to energies.cards
        if (destination instanceof PokemonCardList) {
          // Only add actual energy cards (superType === ENERGY), not Pokemon cards that can act as energy
          const isEnergyCard = card[0].superType === SuperType.ENERGY;
          if (isEnergyCard && !destination.energies.cards.includes(card[0])) {
            destination.energies.cards.push(card[0]);
          }
        }
      } else {
        // If not found in cards, check energies
        index = this.energies.cards.indexOf(cards[i]);
        if (index !== -1) {
          const card = this.energies.cards.splice(index, 1);
          destination.cards.push(card[0]);
          // If destination is a PokemonCardList and card came from energies, add to destination energies.cards
          // (This handles both regular energy cards and Pokemon-as-energy cards)
          if (destination instanceof PokemonCardList) {
            if (!destination.energies.cards.includes(card[0])) {
              destination.energies.cards.push(card[0]);
            }
          }
        } else {
          // If not found in cards or energies, check tools
          index = this.tools.indexOf(cards[i]);
          if (index !== -1) {
            const card = this.tools.splice(index, 1);
            destination.cards.push(card[0]);
            // If destination is a PokemonCardList and card is an energy card, add to energies.cards
            if (destination instanceof PokemonCardList) {
              const isEnergyCard =
                card[0].superType === SuperType.ENERGY || (card[0] as any).energyType !== undefined;
              if (isEnergyCard && !destination.energies.cards.includes(card[0])) {
                destination.energies.cards.push(card[0]);
              }
            }
          }
        }
      }
    }
  }
}
