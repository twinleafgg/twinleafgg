import { GameError } from '../../game-error';
import { GameMessage, GameLog } from '../../game-message';
import { PlayerType, SlotType, CardTarget } from '../actions/play-card-action';
import { Card } from '../card/card';
import {
  CardType,
  BoardEffect,
  CardTag,
  SuperType,
  EnergyType,
  Stage,
  SpecialCondition,
} from '../card/card-types';
import { EnergyCard } from '../card/energy-card';
import { PokemonCard } from '../card/pokemon-card';
import { Attack, Power, PowerType } from '../card/pokemon-types';
import { TrainerCard } from '../card/trainer-card';
import { canPlayDualLegend } from '../dual-legend-utils';
import {
  DealDamageEffect,
  PutDamageEffect,
  HealTargetEffect,
  ApplyWeaknessEffect,
  AbstractAttackEffect,
  MoveCountersAttackEffect,
  AfterDamageEffect,
  DiscardCardsEffect,
  CardsToHandEffect,
  GustOpponentBenchEffect,
  SwitchOutOpponentsActiveEffect,
  AddSpecialConditionsEffect,
} from '../effects/attack-effects';
import {
  CheckProvidedEnergyEffect,
  CheckHpEffect,
  CheckPrizesDestinationEffect,
  AddSpecialConditionsPowerEffect,
  CheckTableStateEffect,
  CheckPokemonPowersEffect,
  CheckPokemonAttacksEffect,
} from '../effects/check-effects';
import { Effect } from '../effects/effect';
import {
  AttackEffect,
  PowerEffect,
  EvolveEffect,
  KnockOutEffect,
  MoveDamageCountersEffect,
  DrawPrizesEffect,
  MoveCardsEffect,
  SpecialEnergyEffect,
} from '../effects/game-effects';
import {
  AfterAttackEffect,
  BeforeDoingDamageEffect,
  EndTurnEffect,
} from '../effects/game-phase-effects';
import {
  PlayPokemonEffect,
  AttachEnergyEffect,
  PlayPokemonFromDeckEffect,
  CoinFlipEffect,
  CoinFlipSequenceEffect,
  ToolEffect,
} from '../effects/play-card-effects';
import { GameStatsTracker } from '../game-stats-tracker';
import { AttachEnergyOptions, AttachEnergyPrompt } from '../prompts/attach-energy-prompt';
import { ChooseCardsPrompt, ChooseCardsOptions, matchesPromptFilter } from '../prompts/choose-cards-prompt';
import { ChooseEnergyPrompt } from '../prompts/choose-energy-prompt';
import { ChoosePokemonPrompt } from '../prompts/choose-pokemon-prompt';
import { ChoosePrizePrompt } from '../prompts/choose-prize-prompt';
import { ConfirmPrompt } from '../prompts/confirm-prompt';
import { DamageMap, MoveDamagePrompt } from '../prompts/move-damage-prompt';
import { SelectPrompt } from '../prompts/select-prompt';
import { ShowCardsPrompt } from '../prompts/show-cards-prompt';
import { ShuffleDeckPrompt } from '../prompts/shuffle-prompt';
import { WaitPrompt } from '../prompts/wait-prompt';
import { StateUtils } from '../state-utils';
import { CardList } from '../state/card-list';
import { Player } from '../state/player';
import { PokemonCardList } from '../state/pokemon-card-list';
import { State, GamePhase } from '../state/state';
import { StoreLike } from '../store-like';
import {
  BOARD_ANIMATION_GATE_TIMEOUT_MS,
  DECK_SHUFFLE_ANIMATION_WAIT_MS,
} from './deck-shuffle-animation';
import { CAN_PLAY_TRAINER_CARD } from './trainer-prefabs';

export {
  IS_TRAINER_TARGET,
  BLOCK_TRAINER_TARGET,
  TRAINER_TARGET_BLOCKED,
  WAS_TRAINER_TARGET_BLOCKED,
} from './trainer-target';

// =============================================================================
// Effect type guards / turn hooks
// =============================================================================

/**
 * A basic effect for checking the use of attacks.
 * @returns whether or not a specific attack was used.
 */
export function WAS_ATTACK_USED(
  effect: Effect,
  index: number,
  user: PokemonCard,
): effect is AttackEffect {
  return effect instanceof AttackEffect && effect.attack === user.attacks[index];
}

/**
 * Returns true if the Pokémon can provide the attack's cost plus extra Colorless energy.
 * Use during AttackEffect or when resolving deferred attack effects (e.g. KO prize bonuses).
 */
export function HAS_EXTRA_ENERGY_BEYOND_ATTACK_COST(
  store: StoreLike,
  state: State,
  player: Player,
  attack: Attack,
  extraEnergyCount: number,
  source?: PokemonCardList,
): boolean {
  const checkEnergy = new CheckProvidedEnergyEffect(player, source);
  store.reduceEffect(state, checkEnergy);
  const requiredEnergy = [...attack.cost, ...Array(extraEnergyCount).fill(CardType.COLORLESS)];
  return StateUtils.checkEnoughEnergy(checkEnergy.energyMap, requiredEnergy);
}

export function DEAL_DAMAGE(effect: Effect): effect is DealDamageEffect {
  return effect instanceof DealDamageEffect;
}

export function PUT_DAMAGE(effect: Effect): effect is PutDamageEffect {
  return effect instanceof PutDamageEffect;
}

/**
 * A basic effect for checking the use of abilites.
 * @returns whether or not a specific ability was used.
 */
export function WAS_POWER_USED(
  effect: Effect,
  index: number,
  user: PokemonCard,
): effect is PowerEffect {
  return effect instanceof PowerEffect && effect.power === user.powers[index];
}

export const AFTER_ATTACK = (
  effect: Effect,
  index: number,
  user: PokemonCard,
): effect is AfterAttackEffect => {
  return effect instanceof AfterAttackEffect && effect.attack === user.attacks[index];
};

export const BEFORE_DAMAGE = (
  effect: Effect,
  index: number,
  user: PokemonCard,
): effect is BeforeDoingDamageEffect => {
  return effect instanceof BeforeDoingDamageEffect && effect.attack === user.attacks[index];
};

/**
 * Checks whether or not the Pokemon just evolved.
 * @returns whether or not `effect` is an evolve effect from this card.
 */
export function JUST_EVOLVED(effect: Effect, card: PokemonCard): effect is EvolveEffect {
  return effect instanceof EvolveEffect && effect.pokemonCard === card;
}

/**
 * Returns whether the given Pokemon moved from the player's Bench to the Active Spot this turn.
 * Uses engine-tracked player.movedToActiveThisTurn (cleared at turn start).
 */
export function MOVED_TO_ACTIVE_THIS_TURN(player: Player, pokemon: PokemonCard): boolean {
  return player.movedToActiveThisTurn.includes(pokemon.id);
}

/**
 * Returns whether the given Pokemon moved from the player's Active Spot to the Bench this turn.
 * Uses engine-tracked player.movedFromActiveToBenchThisTurn (cleared at turn start).
 */
export function MOVED_FROM_ACTIVE_TO_BENCH_THIS_TURN(
  player: Player,
  pokemon: PokemonCard,
): boolean {
  return player.movedFromActiveToBenchThisTurn.includes(pokemon.id);
}

/**
 * Adds the "ability used" board effect to the given Pokemon.
 */
export function ABILITY_USED(player: Player, card: PokemonCard) {
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
    if (cardList.getPokemonCard() === card) {
      cardList.addBoardEffect(BoardEffect.ABILITY_USED);
    }
  });
}

/**
 * A basic effect for checking whether or not a passive ability gets activated.
 * @returns whether or not a passive ability was activated.
 */
export function PASSIVE_ABILITY_ACTIVATED(effect: Effect, user: PokemonCard) {
  return effect instanceof KnockOutEffect && effect.target.cards.includes(user);
}

// =============================================================================
// Damage & healing
// =============================================================================

export function THIS_ATTACK_DOES_X_MORE_DAMAGE(
  effect: AttackEffect,
  store: StoreLike,
  state: State,
  damage: number,
) {
  effect.damage += damage;
  return state;
}

export function DEAL_MORE_DAMAGE_IF_OPPONENT_ACTIVE_HAS_CARD_TAG(
  effect: AttackEffect,
  state: State,
  damage: number,
  ...cardTags: CardTag[]
) {
  const opponent = StateUtils.getOpponent(state, effect.player);
  const opponentActive = opponent.active.getPokemonCard();
  let includesAnyTags = false;
  for (const tag of cardTags) {
    if (opponentActive && opponentActive.hasTag(tag)) {
      includesAnyTags = true;
    }
  }

  if (includesAnyTags) {
    effect.damage += damage;
  }
}

export function DEAL_MORE_DAMAGE_FOR_EACH_PRIZE_CARD_TAKEN(
  effect: AttackEffect,
  state: State,
  damage: number,
) {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  effect.damage = effect.attack.damage + opponent.prizesTaken * damage;
}

export function HEAL_X_DAMAGE_FROM_THIS_POKEMON(
  effect: AttackEffect,
  store: StoreLike,
  state: State,
  damage: number,
) {
  const player = effect.player;
  const healTargetEffect = new HealTargetEffect(effect, damage);
  healTargetEffect.target = player.active;
  state = store.reduceEffect(state, healTargetEffect);
  return state;
}

export function THIS_POKEMON_HAS_ANY_DAMAGE_COUNTERS_ON_IT(
  effect: AttackEffect,
  user: PokemonCard,
) {
  // TODO: Would like to check if Pokemon has damage without needing the effect
  const player = effect.player;
  const source = player.active;

  // Check if source Pokemon has damage
  const damage = source.damage;
  return damage > 0;
}

export function THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(
  damage: number,
  effect: AttackEffect,
  store: StoreLike,
  state: State,
  min: number,
  max: number,
  applyWeaknessAndResistance: boolean = false,
  slots?: SlotType[],
) {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const targets = opponent.bench.filter((b) => b.cards.length > 0);
  if (targets.length === 0 && !slots?.includes(SlotType.ACTIVE)) {
    return state;
  }

  return store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
      PlayerType.TOP_PLAYER,
      slots ?? [SlotType.BENCH],
      { min: min, max: max, allowCancel: false },
    ),
    (selected) => {
      selected.forEach((target) => {
        if (effect.target === effect.opponent.active) {
          const damageEffect = new DealDamageEffect(effect, damage);
          damageEffect.target = target;
          return store.reduceEffect(state, damageEffect);
        }
        const damageEffect = new PutDamageEffect(effect, damage);
        damageEffect.target = target;

        if (applyWeaknessAndResistance && damage > 0) {
          const applyWeakness = new ApplyWeaknessEffect(effect, damage);
          applyWeakness.target = target; // Fix: should be the current target, not effect.target
          state = store.reduceEffect(state, applyWeakness);
          damageEffect.damage = applyWeakness.damage; // Fix: update the damage for this damageEffect, not effect.damage
        }

        store.reduceEffect(state, damageEffect);
      });
    },
  );
}

export function THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON(
  damage: number,
  effect: AttackEffect,
  store: StoreLike,
  state: State,
  benchOnly: boolean = false,
) {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card) => {
    if (effect.target === effect.opponent.active && !benchOnly) {
      const damageEffect = new DealDamageEffect(effect, damage);
      damageEffect.target = cardList;
      return store.reduceEffect(state, damageEffect);
    }
    const damageEffect = new PutDamageEffect(effect, damage);
    damageEffect.target = cardList;

    store.reduceEffect(state, damageEffect);
  });
}

export function THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  amount: number,
) {
  const dealDamage = new DealDamageEffect(effect, amount);
  dealDamage.target = effect.source;
  return store.reduceEffect(state, dealDamage);
}

export function DAMAGE_OPPONENT_POKEMON(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  damage: number,
  targets: PokemonCardList[],
) {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  targets.forEach((target) => {
    // Use DealDamageEffect if target is opponent's active Pokémon (applies Weakness/Resistance)
    if (target === opponent.active) {
      const damageEffect = new DealDamageEffect(effect, damage);
      damageEffect.target = target;
      store.reduceEffect(state, damageEffect);
    } else {
      // Use PutDamageEffect for benched Pokémon (doesn't apply Weakness/Resistance)
      const damageEffect = new PutDamageEffect(effect, damage);
      damageEffect.target = target;
      store.reduceEffect(state, damageEffect);
    }
  });
}

export interface MoveDamageCountersOptions {
  playerType?: PlayerType;
  slots?: SlotType[];
  min?: number;
  max?: number;
  allowCancel?: boolean;
  blockedFrom?: CardTarget[];
  blockedTo?: CardTarget[];
  singleSourceTarget?: boolean;
  singleDestinationTarget?: boolean;
  damageMultiple?: number;
}

/**
 * Generic helper for text like:
 * "Move X damage counters from Y to Z."
 */
export function MOVE_DAMAGE_COUNTERS(
  store: StoreLike,
  state: State,
  player: Player,
  options: MoveDamageCountersOptions = {},
): State {
  const moveEffect = new MoveDamageCountersEffect(player);
  state = store.reduceEffect(state, moveEffect);
  if (moveEffect.preventDefault) {
    return state;
  }
  const {
    playerType = PlayerType.BOTTOM_PLAYER,
    slots = [SlotType.ACTIVE, SlotType.BENCH],
    min = 1,
    max = undefined,
    allowCancel = false,
    blockedFrom = [],
    blockedTo = [],
    singleSourceTarget = false,
    singleDestinationTarget = false,
    damageMultiple = 10,
  } = options;

  const opponent = StateUtils.getOpponent(state, player);
  const maxAllowedDamage: DamageMap[] = [];
  const computedBlockedFrom: CardTarget[] = [...blockedFrom];

  const collectTargets = (targetPlayer: Player, targetPlayerType: PlayerType) => {
    targetPlayer.forEachPokemon(targetPlayerType, (cardList, card, target) => {
      maxAllowedDamage.push({ target, damage: 9999 });
      if (cardList.damage === 0) {
        computedBlockedFrom.push(target);
      }
    });
  };

  if (playerType === PlayerType.BOTTOM_PLAYER || playerType === PlayerType.ANY) {
    collectTargets(player, PlayerType.BOTTOM_PLAYER);
  }
  if (playerType === PlayerType.TOP_PLAYER || playerType === PlayerType.ANY) {
    collectTargets(opponent, PlayerType.TOP_PLAYER);
  }

  if (maxAllowedDamage.length === 0) {
    return state;
  }

  return store.prompt(
    state,
    new MoveDamagePrompt(player.id, GameMessage.MOVE_DAMAGE, playerType, slots, maxAllowedDamage, {
      allowCancel,
      min,
      max,
      blockedFrom: computedBlockedFrom,
      blockedTo,
      singleSourceTarget,
      singleDestinationTarget,
      damageMultiple,
    }),
    (transfers) => {
      transfers = transfers || [];
      for (const transfer of transfers) {
        const source = StateUtils.getTarget(state, player, transfer.from);
        const target = StateUtils.getTarget(state, player, transfer.to);
        if (source.damage < damageMultiple) {
          continue;
        }
        source.damage -= damageMultiple;
        target.damage += damageMultiple;
      }
    },
  );
}

/**
 * Fixed (no move-UI) attack helper for text like:
 * "Move all damage counters from 1 of your Benched Pokemon to your opponent's Active Pokemon."
 *
 * Prompts for 1 damaged Benched Pokemon, then moves ALL of its damage onto the
 * opponent's Active Pokemon. Respects "damage counters can't be moved" effects
 * (via MoveDamageCountersEffect) and lets other cards intercept the move via
 * MoveCountersAttackEffect.
 */
export function MOVE_DAMAGE_FROM_YOUR_BENCH_TO_OPPONENTS_ACTIVE(
  store: StoreLike,
  state: State,
  effect: AttackEffect | AbstractAttackEffect,
): State {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const blocked: CardTarget[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
    if (cardList === player.active || cardList.damage === 0) {
      blocked.push(target);
    }
  });

  const hasDamagedBench = player.bench.some((b) => b.cards.length > 0 && b.damage > 0);
  if (!hasDamagedBench) {
    return state;
  }

  return store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.BENCH],
      { min: 1, max: 1, allowCancel: false, blocked },
    ),
    (selected) => {
      if (!selected || selected.length === 0) {
        return;
      }
      const source = selected[0];
      const damageToMove = source.damage;
      if (damageToMove <= 0) {
        return;
      }

      // "Damage counters can't be moved" (e.g. Patrat) cancels the whole move:
      // the counters stay on the source Pokemon and nothing is placed.
      const moveCheck = new MoveDamageCountersEffect(player);
      state = store.reduceEffect(state, moveCheck);
      if (moveCheck.preventDefault) {
        return;
      }

      const moveEffect = new MoveCountersAttackEffect(
        effect,
        source,
        opponent.active,
        damageToMove,
      );
      state = store.reduceEffect(state, moveEffect);

      // The counters always leave the source Pokemon once the move is allowed...
      moveEffect.source.damage -= moveEffect.damage;
      if (moveEffect.source.damage < 0) {
        moveEffect.source.damage = 0;
      }

      // ...but a target that prevents effects of attacks (e.g. Mist Energy)
      // does not receive them.
      if (!moveEffect.preventDefault) {
        moveEffect.target.damage += moveEffect.damage;
      }
    },
  );
}

/**
 * Checks if the a Pokemon is at full HP and that the damage dealt is enough to knock it out.
 * TODO: This doesn't work if the an attack changes the result of a CheckHpEffect (e.g. discards an hp-modifying stadium)
 */
export function DAMAGED_FROM_FULL_HP(
  store: StoreLike,
  state: State,
  effect: PutDamageEffect,
  player: Player,
  target: PokemonCardList,
): boolean {
  if (effect.target.damage != 0) {
    return false;
  }
  const checkHpEffect = new CheckHpEffect(player, target);
  store.reduceEffect(state, checkHpEffect);
  return effect.damage >= checkHpEffect.hp;
}

export interface OnDamagedByOpponentAttackEvenIfKnockedOutOptions {
  source: PokemonCard;
  requireActiveSpot?: boolean;
  requireAttackPhase?: boolean;
}

/**
 * Compound helper for text like:
 * "If this Pokémon is in the Active Spot and is damaged by an opponent's attack
 * (even if this Pokémon is Knocked Out)..."
 */
export function ON_DAMAGED_BY_OPPONENT_ATTACK_EVEN_IF_KNOCKED_OUT(
  state: State,
  effect: Effect,
  options: OnDamagedByOpponentAttackEvenIfKnockedOutOptions,
): effect is AfterDamageEffect {
  if (!(effect instanceof AfterDamageEffect)) {
    return false;
  }

  const { source, requireActiveSpot = true, requireAttackPhase = true } = options;

  if (effect.damage <= 0 || !effect.target.cards.includes(source)) {
    return false;
  }

  const targetOwner = StateUtils.findOwner(state, effect.target);
  if (targetOwner === effect.player) {
    return false;
  }

  if (requireActiveSpot && targetOwner.active !== effect.target) {
    return false;
  }

  if (requireAttackPhase && state.phase !== GamePhase.ATTACK) {
    return false;
  }

  return true;
}

// =============================================================================
// Energy
// =============================================================================

export function GET_TOTAL_ENERGY_ATTACHED_TO_PLAYERS_POKEMON(
  player: Player,
  store: StoreLike,
  state: State,
) {
  let totalEnergy = 0;
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
    const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, cardList);
    store.reduceEffect(state, checkProvidedEnergyEffect);
    checkProvidedEnergyEffect.energyMap.forEach((energy) => {
      totalEnergy += 1;
    });
  });

  return totalEnergy;
}

/**
 * Checks whether a Pokémon has any Energy card attached.
 */
export function THIS_POKEMON_HAS_ANY_ENERGY_ATTACHED(target: PokemonCardList): boolean {
  return target.cards.some((card) => card instanceof EnergyCard);
}

export function ATTACH_ENERGY_PROMPT(
  store: StoreLike,
  state: State,
  player: Player,
  playerType: PlayerType,
  sourceSlot: SlotType,
  destinationSlots: SlotType[],
  filter: Partial<EnergyCard> = {},
  options: Partial<AttachEnergyOptions> = {},
): State {
  filter.superType = SuperType.ENERGY;
  const source = player.getSlot(sourceSlot);

  return store.prompt(
    state,
    new AttachEnergyPrompt(
      player.id,
      GameMessage.ATTACH_ENERGY_CARDS,
      source,
      playerType,
      destinationSlots,
      filter,
      options,
    ),
    (transfers) => {
      transfers = transfers || [];
      for (const transfer of transfers) {
        const target = StateUtils.getTarget(state, player, transfer.to);
        const energyCard = transfer.card as EnergyCard;
        const attachEnergyEffect = new AttachEnergyEffect(player, energyCard, target);
        store.reduceEffect(state, attachEnergyEffect);
      }
      if (sourceSlot === SlotType.DECK) {
        SHUFFLE_DECK(store, state, player);
      }
    },
  );
}

export function DISCARD_X_ENERGY_FROM_YOUR_HAND(
  effect: PowerEffect,
  store: StoreLike,
  state: State,
  minAmount: number,
  maxAmount: number,
): State {
  const player = effect.player;
  const hasEnergyInHand = player.hand.cards.some((c) => {
    return c instanceof EnergyCard;
  });
  if (!hasEnergyInHand) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }

  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DISCARD,
      player.hand,
      { superType: SuperType.ENERGY },
      { allowCancel: false, min: minAmount, max: maxAmount },
    ),
    (cards) => {
      cards = cards || [];
      if (cards.length === 0) {
        return;
      }
      player.hand.moveCardsTo(cards, player.discard);
    },
  );
}

/**
 * Discard a specific set of Energies of the player's choice from this Pokémon (e.g. 3 [R] energy). Not restricted to Basics.
 * @param energyMap The Energies that must be discarded.
 */
export function DISCARD_SPECIFIC_ENERGY_FROM_THIS_POKEMON(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  energyMap: CardType[],
) {
  const player = effect.player;

  const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
  state = store.reduceEffect(state, checkProvidedEnergy);

  state = store.prompt(
    state,
    new ChooseEnergyPrompt(
      player.id,
      GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
      checkProvidedEnergy.energyMap,
      energyMap,
      { allowCancel: false },
    ),
    (energy) => {
      const cards: Card[] = (energy || []).map((e) => e.card);
      const discardEnergy = new DiscardCardsEffect(effect, cards);
      discardEnergy.target = player.active;
      store.reduceEffect(state, discardEnergy);
    },
  );
}

export function PUT_SPECIFIC_ENERGY_FROM_THIS_POKEMON_INTO_HAND(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  energyMap: CardType[],
  options?: { onEnergyMoved?: () => void },
): State {
  const player = effect.player;

  const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
  state = store.reduceEffect(state, checkProvidedEnergy);

  return store.prompt(
    state,
    new ChooseEnergyPrompt(
      player.id,
      GameMessage.CHOOSE_CARD_TO_HAND,
      checkProvidedEnergy.energyMap,
      energyMap,
      { allowCancel: false },
    ),
    (energy) => {
      const cards: Card[] = (energy || []).map((e) => e.card);
      if (cards.length > 0) {
        const toHandEffect = new CardsToHandEffect(effect, cards);
        toHandEffect.target = player.active;
        store.reduceEffect(state, toHandEffect);
        options?.onEnergyMoved?.();
      }
    },
  );
}

export function DISCARD_ALL_ENERGY_FROM_POKEMON(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  card: Card,
) {
  const player = effect.player;
  const cardList = StateUtils.findCardList(state, card);
  if (!(cardList instanceof PokemonCardList)) throw new GameError(GameMessage.INVALID_TARGET);

  const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
  state = store.reduceEffect(state, checkProvidedEnergy);

  const cards: Card[] = checkProvidedEnergy.energyMap.map((e) => e.card);
  const discardEnergy = new DiscardCardsEffect(effect, cards);
  discardEnergy.target = cardList;
  store.reduceEffect(state, discardEnergy);
}

const BASIC_ENERGY_NAME_BY_CARD_TYPE: Partial<Record<CardType, string>> = {
  [CardType.GRASS]: 'Grass Energy',
  [CardType.FIRE]: 'Fire Energy',
  [CardType.WATER]: 'Water Energy',
  [CardType.LIGHTNING]: 'Lightning Energy',
  [CardType.PSYCHIC]: 'Psychic Energy',
  [CardType.FIGHTING]: 'Fighting Energy',
  [CardType.DARK]: 'Darkness Energy',
  [CardType.METAL]: 'Metal Energy',
  [CardType.DRAGON]: 'Dragon Energy',
  [CardType.FAIRY]: 'Fairy Energy',
};

function getBasicEnergyNameByType(cardType: CardType): string | undefined {
  return BASIC_ENERGY_NAME_BY_CARD_TYPE[cardType];
}

function getBlockedTargetsFromFilter(
  player: Player,
  targetFilter?: (target: PokemonCardList, pokemonCard: PokemonCard) => boolean,
): CardTarget[] {
  if (targetFilter === undefined) {
    return [];
  }

  const blockedTargets: CardTarget[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, pokemonCard, target) => {
    if (!targetFilter(cardList, pokemonCard)) {
      blockedTargets.push(target);
    }
  });

  return blockedTargets;
}

export interface AsOftenAsYouLikeAttachBasicTypeEnergyFromHandOptions {
  destinationSlots?: SlotType[];
  targetFilter?: (target: PokemonCardList, pokemonCard: PokemonCard) => boolean;
  promptOptions?: Partial<AttachEnergyOptions>;
}

/**
 * Compound helper for text like:
 * "As often as you like during your turn, attach a basic [type] Energy card from your hand to 1 of your Pokémon."
 *
 * This helper does not include "once per turn" tracking. Pair it with
 * `USE_ABILITY_ONCE_PER_TURN` when card text requires that limit.
 */
export function AS_OFTEN_AS_YOU_LIKE_ATTACH_BASIC_TYPE_ENERGY_FROM_HAND(
  store: StoreLike,
  state: State,
  player: Player,
  cardType: CardType,
  options: AsOftenAsYouLikeAttachBasicTypeEnergyFromHandOptions = {},
): State {
  const {
    destinationSlots = [SlotType.BENCH, SlotType.ACTIVE],
    targetFilter,
    promptOptions = {},
  } = options;

  const basicEnergyName = getBasicEnergyNameByType(cardType);
  if (basicEnergyName === undefined) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }

  const hasMatchingEnergyInHand = player.hand.cards.some(
    (card) =>
      card instanceof EnergyCard &&
      card.energyType === EnergyType.BASIC &&
      card.name === basicEnergyName,
  );
  if (!hasMatchingEnergyInHand) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }

  const blockedTo = getBlockedTargetsFromFilter(player, targetFilter);

  return store.prompt(
    state,
    new AttachEnergyPrompt(
      player.id,
      GameMessage.ATTACH_ENERGY_CARDS,
      player.hand,
      PlayerType.BOTTOM_PLAYER,
      destinationSlots,
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: basicEnergyName },
      { allowCancel: true, min: 1, max: 1, blockedTo, ...promptOptions },
    ),
    (transfers) => {
      transfers = transfers || [];
      for (const transfer of transfers) {
        const target = StateUtils.getTarget(state, player, transfer.to);
        const energyCard = transfer.card as EnergyCard;
        const attachEnergyEffect = new AttachEnergyEffect(player, energyCard, target);
        store.reduceEffect(state, attachEnergyEffect);
      }
    },
  );
}

export interface AttachXTypeEnergyFromDiscardToOnePokemonOptions {
  destinationSlots?: SlotType[];
  targetFilter?: (target: PokemonCardList, pokemonCard: PokemonCard) => boolean;
  energyFilter?: Partial<EnergyCard>;
  min?: number;
  allowCancel?: boolean;
  onAttached?: (transfers: { to: CardTarget; card: Card }[]) => void;
}

/**
 * Compound helper for text like:
 * "Attach up to X [type] Energy cards from your discard pile to 1 of your Pokémon."
 *
 * `cardType` is optional. When omitted, any Energy is legal.
 */
export function ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON(
  store: StoreLike,
  state: State,
  player: Player,
  amount: number,
  cardType?: CardType,
  options: AttachXTypeEnergyFromDiscardToOnePokemonOptions = {},
): State {
  const {
    destinationSlots = [SlotType.BENCH, SlotType.ACTIVE],
    targetFilter,
    energyFilter = {},
    min = 1,
    allowCancel = false,
    onAttached,
  } = options;

  if (player.discard.cards.length === 0 || amount <= 0) {
    return state;
  }

  const blockedTo = getBlockedTargetsFromFilter(player, targetFilter);
  const promptEnergyFilter = { superType: SuperType.ENERGY, ...energyFilter };
  const promptOptions: Partial<AttachEnergyOptions> = {
    allowCancel,
    min: Math.max(0, min),
    max: amount,
    sameTarget: true,
    blockedTo,
  };

  if (cardType !== undefined) {
    promptOptions.validCardTypes = [cardType];
  }

  return store.prompt(
    state,
    new AttachEnergyPrompt(
      player.id,
      GameMessage.ATTACH_ENERGY_CARDS,
      player.discard,
      PlayerType.BOTTOM_PLAYER,
      destinationSlots,
      promptEnergyFilter,
      promptOptions,
    ),
    (transfers) => {
      transfers = transfers || [];
      for (const transfer of transfers) {
        const target = StateUtils.getTarget(state, player, transfer.to);
        const energyCard = transfer.card as EnergyCard;
        const attachEnergyEffect = new AttachEnergyEffect(player, energyCard, target);
        store.reduceEffect(state, attachEnergyEffect);
      }
      if (onAttached !== undefined) {
        onAttached(transfers);
      }
    },
  );
}

export interface AttachUpToXEnergyFromDeckToYOfYourPokemonOptions {
  destinationSlots?: SlotType[];
  targetFilter?: (target: PokemonCardList, pokemonCard: PokemonCard) => boolean;
  energyFilter?: Partial<EnergyCard>;
  min?: number;
  allowCancel?: boolean;
  differentTypes?: boolean;
  differentTargets?: boolean;
  sameTarget?: boolean;
  validCardTypes?: CardType[];
  maxPerType?: number;
  onAttached?: (transfers: { to: CardTarget; card: Card }[]) => void;
}

/**
 * Compound helper for text like:
 * "Attach up to X Energy cards from your deck to Y of your Pokémon."
 *
 * - `maxEnergyCards` controls how many Energy cards may be attached.
 * - `maxPokemonTargets` controls how many different Pokémon may receive those attachments.
 * - For Mirage Gate-style behavior, pass:
 *   `differentTypes: true`, `energyFilter: { energyType: EnergyType.BASIC }`.
 */
export function ATTACH_UP_TO_X_ENERGY_FROM_DECK_TO_Y_OF_YOUR_POKEMON(
  store: StoreLike,
  state: State,
  player: Player,
  maxEnergyCards: number,
  maxPokemonTargets: number,
  options: AttachUpToXEnergyFromDeckToYOfYourPokemonOptions = {},
): State {
  const {
    destinationSlots = [SlotType.BENCH, SlotType.ACTIVE],
    targetFilter,
    energyFilter = {},
    min = 0,
    allowCancel = false,
    differentTypes = false,
    differentTargets = false,
    sameTarget = false,
    validCardTypes,
    maxPerType,
    onAttached,
  } = options;

  if (player.deck.cards.length === 0 || maxEnergyCards <= 0 || maxPokemonTargets <= 0) {
    return state;
  }

  const blockedTo = getBlockedTargetsFromFilter(player, targetFilter);

  return store.prompt(
    state,
    new AttachEnergyPrompt(
      player.id,
      GameMessage.ATTACH_ENERGY_CARDS,
      player.deck,
      PlayerType.BOTTOM_PLAYER,
      destinationSlots,
      { superType: SuperType.ENERGY, ...energyFilter },
      {
        allowCancel,
        min: Math.max(0, min),
        max: maxEnergyCards,
        blockedTo,
        differentTypes,
        differentTargets,
        sameTarget,
        validCardTypes,
        maxPerType,
      },
    ),
    (transfers) => {
      transfers = transfers || [];

      const uniqueTargets = new Set(
        transfers.map(
          (transfer) => `${transfer.to.player}-${transfer.to.slot}-${transfer.to.index}`,
        ),
      );
      if (uniqueTargets.size > maxPokemonTargets) {
        throw new GameError(GameMessage.INVALID_PROMPT_RESULT);
      }

      for (const transfer of transfers) {
        const target = StateUtils.getTarget(state, player, transfer.to);
        const energyCard = transfer.card as EnergyCard;
        const attachEnergyEffect = new AttachEnergyEffect(player, energyCard, target);
        store.reduceEffect(state, attachEnergyEffect);
      }

      if (onAttached !== undefined) {
        onAttached(transfers);
      }

      SHUFFLE_DECK(store, state, player);
    },
  );
}

// =============================================================================
// Prizes & KO prize bonuses
// =============================================================================

export function YOUR_OPPONENTS_POKEMON_IS_KNOCKED_OUT_BY_DAMAGE_FROM_THIS_ATTACK(
  effect: Effect,
  state: State,
): effect is KnockOutEffect {
  // TODO: this shouldn't work for attacks with damage counters, but I think it will
  return effect instanceof KnockOutEffect;
}

export interface TakeSpecificPrizesOptions {
  destination?: CardList;
  skipReduce?: boolean;
}

export interface TakeXPrizesOptions extends TakeSpecificPrizesOptions {
  promptOptions?: {
    allowCancel?: boolean;
    blocked?: number[];
  };
}

export function TAKE_SPECIFIC_PRIZES(
  store: StoreLike,
  state: State,
  player: Player,
  prizes: CardList[],
  options: TakeSpecificPrizesOptions = {},
): void {
  let { destination = player.hand } = options;
  const { skipReduce = false } = options;
  let preventDefault: boolean = false;

  if (!skipReduce) {
    const drawPrizesEffect = new DrawPrizesEffect(player, prizes, destination);

    // Reduce the prizes destination for effects that override it and take place before any
    // DrawPrizesEffect is processed (e.g. Barbaracle LOR)
    const prizesDestinationEffect = new CheckPrizesDestinationEffect(
      player,
      drawPrizesEffect.destination,
    );
    store.reduceEffect(state, prizesDestinationEffect);

    // If nothing prevented the override, apply the new destination
    if (!prizesDestinationEffect.preventDefault) {
      drawPrizesEffect.destination = prizesDestinationEffect.destination;
    }

    // Process the actual DrawPrizesEffect
    store.reduceEffect(state, drawPrizesEffect);

    preventDefault = drawPrizesEffect.preventDefault;
    destination = drawPrizesEffect.destination;
  } else {
    destination = player.hand;
  }

  if (!preventDefault) {
    let prizesTakenCount = 0;
    prizes.forEach((prize) => {
      if (player.prizes.includes(prize)) {
        prize.moveTo(destination);

        if (destination === player.hand) {
          // If the destination is the hand, we've "taken" a prize
          player.prizesTaken += 1;
          player.prizesTakenThisTurn += 1;
          prizesTakenCount += 1;
        }
      }
    });

    // Track accurate prize count using GameStatsTracker
    if (prizesTakenCount > 0) {
      GameStatsTracker.trackPrizeTaken(player, prizesTakenCount);
    }
  }
}

export function TAKE_X_PRIZES(
  store: StoreLike,
  state: State,
  player: Player,
  count: number,
  options: TakeXPrizesOptions = {},
  callback?: (chosenPrizes: CardList[]) => void,
): State {
  const { promptOptions = {}, ...takeOptions } = options;
  const prizeLeft = player.getPrizeLeft();
  const takeCount = Math.min(count, prizeLeft);

  if (takeCount <= 0) {
    return state;
  }

  // Taking all remaining prizes — auto-resolve so clients never get an unsolvable prompt
  // (e.g. KO awards 2 prizes with only 1 left). checkState/checkWinner will end the game.
  if (count >= prizeLeft) {
    const prizes = player.prizes.filter((p) => p.cards.length > 0).slice(0, takeCount);
    TAKE_SPECIFIC_PRIZES(store, state, player, prizes, takeOptions);
    if (callback) {
      callback(prizes);
    }
    return state;
  }

  state = store.prompt(
    state,
    new ChoosePrizePrompt(player.id, GameMessage.CHOOSE_PRIZE_CARD, {
      count: takeCount,
      allowCancel: false,
      ...promptOptions,
    }),
    (result) => {
      TAKE_SPECIFIC_PRIZES(store, state, player, result, takeOptions);
      if (callback) callback(result);
    },
  );

  return state;
}

export function TAKE_X_MORE_PRIZE_CARDS(effect: KnockOutEffect, state: State) {
  effect.prizeCount += 1;
  return state;
}

export interface TakeMorePrizesOnKnockOutOptions {
  /** Only award bonus prizes if this attack was used (via state.playerLastAttack). */
  attackName?: string;
  /** Check IS_ABILITY_BLOCKED on the attacker before awarding (for Abilities like Overflow). */
  checkAbilityBlocked?: boolean;
  /** Check IS_POKEBODY_BLOCKED on the attacker before awarding (for Poké-Bodies like Space Virus). */
  checkPokebodyBlocked?: boolean;
  /** Extra validation after standard checks pass. */
  validate?: (
    store: StoreLike,
    state: State,
    effect: KnockOutEffect,
    attacker: Player,
    knockedOutOwner: Player,
  ) => boolean;
  /** Number of extra prizes to award (default 1). Ignored when getExtraPrizes is set. */
  extraPrizes?: number;
  /** Dynamic prize bonus; overrides extraPrizes when provided. */
  getExtraPrizes?: (
    store: StoreLike,
    state: State,
    effect: KnockOutEffect,
    attacker: Player,
    knockedOutOwner: Player,
  ) => number;
  /** Called after bonus prizes are added to effect.prizeCount. */
  onAwarded?: (
    store: StoreLike,
    state: State,
    effect: KnockOutEffect,
    attacker: Player,
    knockedOutOwner: Player,
    extraPrizesAwarded: number,
  ) => void;
}

/**
 * If your opponent's Pokemon is Knocked Out by damage from an attack of this Pokemon,
 * take more Prize card(s). Valid for Active or Bench KOs.
 *
 * Use `attackName` for attack-specific bonus prizes (uses playerLastAttack, not boolean flags).
 * Use `checkAbilityBlocked` for Ability-based versions (e.g. Lugia-EX Overflow).
 */
export function IF_OPPONENTS_POKEMON_KO_BY_ATTACK_DAMAGE_TAKE_MORE_PRIZES(
  store: StoreLike,
  state: State,
  effect: Effect,
  source: PokemonCard,
  options: TakeMorePrizesOnKnockOutOptions = {},
): State {
  if (!(effect instanceof KnockOutEffect)) {
    return state;
  }

  const {
    attackName,
    checkAbilityBlocked = false,
    checkPokebodyBlocked = false,
    validate,
    extraPrizes = 1,
    getExtraPrizes,
    onAwarded,
  } = options;

  const knockedOutOwner = effect.player;
  const attacker = StateUtils.getOpponent(state, knockedOutOwner);

  const isDefendingPokemon =
    knockedOutOwner.active === effect.target || knockedOutOwner.bench.includes(effect.target);

  if (!isDefendingPokemon) {
    return state;
  }

  if (state.phase !== GamePhase.ATTACK || state.players[state.activePlayer] !== attacker) {
    return state;
  }

  if (!knockedOutOwner.marker.hasMarker(knockedOutOwner.DAMAGE_DEALT_MARKER)) {
    return state;
  }

  const lastAttackInfo = state.playerLastAttack?.[attacker.id];
  if (!lastAttackInfo || lastAttackInfo.sourceCard !== source) {
    return state;
  }

  if (attackName !== undefined && lastAttackInfo.attack.name !== attackName) {
    return state;
  }

  if (checkAbilityBlocked && IS_ABILITY_BLOCKED(store, state, attacker, source)) {
    return state;
  }

  if (checkPokebodyBlocked && IS_POKEBODY_BLOCKED(store, state, attacker, source)) {
    return state;
  }

  if (validate && !validate(store, state, effect, attacker, knockedOutOwner)) {
    return state;
  }

  if (effect.prizeCount > 0) {
    const prizeBonus = getExtraPrizes
      ? getExtraPrizes(store, state, effect, attacker, knockedOutOwner)
      : extraPrizes;

    if (prizeBonus > 0) {
      effect.prizeCount += prizeBonus;
      onAwarded?.(store, state, effect, attacker, knockedOutOwner, prizeBonus);
    }
  }

  return state;
}

/** Delta Plus Ancient Trait: take 1 more Prize card when you KO an opponent's Pokemon with this Pokemon's attack. */
export function DELTA_PLUS(
  store: StoreLike,
  state: State,
  effect: Effect,
  source: PokemonCard,
): State {
  return IF_OPPONENTS_POKEMON_KO_BY_ATTACK_DAMAGE_TAKE_MORE_PRIZES(store, state, effect, source);
}

/**
 * A getter for the player's prize slots.
 * @returns A list of card lists containing the player's prize slots.
 */
export function GET_PLAYER_PRIZES(player: Player): CardList[] {
  return player.prizes.filter((p) => p.cards.length > 0);
}

/**
 * A getter for all of a player's prizes.
 * @returns A Card[] of all the player's prize cards.
 */
export function GET_PRIZES_AS_CARD_ARRAY(player: Player): Card[] {
  const prizes = player.prizes.filter((p) => p.cards.length > 0);
  const allPrizeCards: Card[] = [];
  prizes.forEach((p) => allPrizeCards.push(...p.cards));
  return allPrizeCards;
}

// =============================================================================
// Search / deck / discard / draw / shuffle
// =============================================================================

/**
 * @param state is the game state.
 * @returns the game state after discarding a stadium card in play.
 */
export function DISCARD_A_STADIUM_CARD_IN_PLAY(state: State) {
  const stadiumCard = StateUtils.getStadiumCard(state);
  if (stadiumCard !== undefined) {
    const cardList = StateUtils.findCardList(state, stadiumCard);
    const player = StateUtils.findOwner(state, cardList);
    cardList.moveTo(player.discard);
  }
}

/**
 * Search deck for Pokemon, show it to the opponent, put it into `player`'s hand, and shuffle `player`'s deck.
 * A `filter` can be provided for the prompt as well.
 */
export function SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(
  store: StoreLike,
  state: State,
  player: Player,
  filter: Partial<PokemonCard> = {},
  options: Partial<ChooseCardsOptions> = {},
) {
  BLOCK_IF_DECK_EMPTY(player);
  const slots = GET_PLAYER_BENCH_SLOTS(player);
  BLOCK_IF_NO_SLOTS(slots);
  filter.superType = SuperType.POKEMON;

  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
      player.deck,
      filter,
      options,
    ),
    (selected) => {
      const cards = selected || [];
      cards.forEach((card, index) => {
        const playPokemonFromDeckEffect = new PlayPokemonFromDeckEffect(
          player,
          card as any,
          slots[index],
        );
        store.reduceEffect(state, playPokemonFromDeckEffect);
      });
      SHUFFLE_DECK(store, state, player);
    },
  );
}

/**
 * Search deck for Pokemon, show it to the opponent, put it into `player`'s hand, and shuffle `player`'s deck.
 * A `filter` can be provided for the prompt as well.
 */
export function SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
  store: StoreLike,
  state: State,
  player: Player,
  filter: Partial<PokemonCard> = {},
  options: Partial<ChooseCardsOptions> = {},
) {
  BLOCK_IF_DECK_EMPTY(player);
  const opponent = StateUtils.getOpponent(state, player);
  filter.superType = SuperType.POKEMON;

  return store.prompt(
    state,
    new ChooseCardsPrompt(player, GameMessage.CHOOSE_CARD_TO_HAND, player.deck, filter, options),
    (selected) => {
      const cards = selected || [];
      SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
      cards.forEach((card) => MOVE_CARD_TO(state, card, player.hand));
      SHUFFLE_DECK(store, state, player);
    },
  );
}

/**
 * Discards the top `amount` cards of a player's deck.
 */
export function DISCARD_TOP_X_CARDS_FROM_YOUR_DECK(
  store: StoreLike,
  state: State,
  player: Player,
  amount: number,
  card: Card,
  sourceEffect: any,
): State {
  return MOVE_CARDS(store, state, player.deck, player.discard, {
    count: amount,
    sourceCard: card,
    sourceEffect,
  });
}

/**
 * Discards the top `amount` cards of the opponent's deck (commonly called "milling").
 * @param player The player ***using*** this effect. Their opponent will be milled.
 * @param amount The number of cards to discard.
 * @param card The card causing the effect.
 * @param sourceEffect The attack or ability causing the effect.
 */
export function DISCARD_TOP_X_OF_OPPONENTS_DECK(
  store: StoreLike,
  state: State,
  player: Player,
  amount: number,
  card: Card,
  sourceEffect: any,
) {
  const opponent = StateUtils.getOpponent(state, player);

  MOVE_CARDS(store, state, opponent.deck, opponent.discard, {
    count: amount,
    sourceCard: card,
    sourceEffect: sourceEffect,
  });
}

export type CountCardsZone = 'discard' | 'lostzone';

/**
 * Counts cards in one of your zones using a partial field filter and/or predicate.
 * Useful for effects like Night March / United Wings that need custom matching logic.
 */
export function COUNT_MATCHING_CARDS_IN_ZONE(
  player: Player,
  zone: CountCardsZone,
  filter: Partial<Card> = {},
  predicate: (card: Card) => boolean = () => true,
): number {
  const cards = zone === 'discard' ? player.discard.cards : player.lostzone.cards;

  return cards.reduce((count, card) => {
    for (const key in filter) {
      if ((card as any)[key] !== (filter as any)[key]) {
        return count;
      }
    }
    if (!predicate(card)) {
      return count;
    }
    return count + 1;
  }, 0);
}

/**
 * Checks whether the player has at least one card in their discard pile matching the given filter and/or predicate.
 *
 * The `filter` is a partial card match (e.g. `{ superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' }`
 * for a basic Fire Energy, or `{ superType: SuperType.POKEMON }` for any Pokémon, or `{ superType: SuperType.TRAINER }` for any Trainer).
 * A custom `predicate` can be supplied for more complex matching that the partial filter can't express.
 *
 * @param player The player whose discard pile to check.
 * @param filter A partial card filter to match against.
 * @param predicate An optional custom predicate for additional matching logic.
 * @returns `true` if at least one matching card exists in the discard pile, `false` otherwise.
 */
export function HAS_CARD_IN_DISCARD(
  player: Player,
  filter: Partial<Card> = {},
  predicate: (card: Card) => boolean = () => true,
): boolean {
  return player.discard.cards.some((card) => {
    for (const key in filter) {
      if ((card as any)[key] !== (filter as any)[key]) {
        return false;
      }
    }
    return predicate(card);
  });
}

/**
 * Shuffles the player's deck.
 * After order is applied, a silent WaitPrompt gates follow-up draws so the 3D
 * shuffle animation (triggered via Game arbiter socket emit) can finish.
 */
export function SHUFFLE_DECK(store: StoreLike, state: State, player: Player): State {
  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
    store.prompt(
      state,
      new WaitPrompt(player.id, DECK_SHUFFLE_ANIMATION_WAIT_MS, 'Deck shuffle animation', false),
      () => {},
    );
  });
}

/**
 * Shuffle hand into deck, then draw. Uses MOVE_CARDS / DRAW_CARDS so the board
 * animation framework sees normal hand diffs. Sequencing WaitPrompts live here
 * (not on individual cards); clients resolve hand→deck / shuffle waits when
 * animations finish (server duration is a safety timeout except shuffle).
 */
export function SHUFFLE_HAND_INTO_DECK_THEN_DRAW(
  store: StoreLike,
  state: State,
  player: Player,
  options: {
    excludeCard?: Card;
    /** Override which cards leave the hand (default: all except excludeCard). */
    cards?: Card[];
    sourceCard?: Card;
    drawCount?: number;
    /** Custom draw step after shuffle (e.g. coin flip). Overrides drawCount. */
    resolveDraw?: (store: StoreLike, state: State, player: Player) => void;
    /** Runs after the draw (e.g. end turn / next player's sequence). */
    afterDraw?: (store: StoreLike, state: State, player: Player) => void;
  },
): State {
  const exclude = options.excludeCard;
  const cards = options.cards ?? player.hand.cards.filter((c) => c !== exclude);

  const shuffleThenDraw = (): void => {
    store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
      player.deck.applyOrder(order);
      store.prompt(
        state,
        new WaitPrompt(player.id, DECK_SHUFFLE_ANIMATION_WAIT_MS, 'Deck shuffle animation', false),
        () => {
          if (options.resolveDraw) {
            options.resolveDraw(store, state, player);
          } else {
            DRAW_CARDS(store, state, player, options.drawCount ?? 0);
            options.afterDraw?.(store, state, player);
          }
        },
      );
    });
  };

  if (cards.length > 0) {
    const moveEffect = new MoveCardsEffect(player.hand, player.deck, {
      cards,
      sourceCard: options.sourceCard,
    });
    state = store.reduceEffect(state, moveEffect);
    if (moveEffect.preventDefault) {
      return state;
    }
    return store.prompt(
      state,
      new WaitPrompt(player.id, BOARD_ANIMATION_GATE_TIMEOUT_MS, 'Hand to deck animation', false),
      () => shuffleThenDraw(),
    );
  }

  shuffleThenDraw();
  return state;
}

/**
 * Put hand cards onto the deck (append = bottom), wait for hand→deck animation,
 * then draw. No deck shuffle — Iono / Marnie style.
 */
export function MOVE_HAND_TO_DECK_THEN_DRAW(
  store: StoreLike,
  state: State,
  player: Player,
  options: {
    cards: Card[];
    drawCount: number;
    sourceCard?: Card;
    /** If the hand move is prevented, skip draw (and afterDraw). Default true. */
    skipDrawIfMovePrevented?: boolean;
    afterDraw?: (store: StoreLike, state: State, player: Player) => void;
    /** Called when the hand move is prevented (e.g. still draw the other player). */
    onMovePrevented?: (store: StoreLike, state: State, player: Player) => void;
  },
): State {
  const doDraw = (): void => {
    DRAW_CARDS(store, state, player, options.drawCount);
    options.afterDraw?.(store, state, player);
  };

  if (options.cards.length > 0) {
    const moveEffect = new MoveCardsEffect(player.hand, player.deck, {
      cards: options.cards,
      sourceCard: options.sourceCard,
    });
    state = store.reduceEffect(state, moveEffect);
    if (moveEffect.preventDefault) {
      if (options.skipDrawIfMovePrevented === false) {
        doDraw();
      } else {
        options.onMovePrevented?.(store, state, player);
      }
      return state;
    }
    return store.prompt(
      state,
      new WaitPrompt(player.id, BOARD_ANIMATION_GATE_TIMEOUT_MS, 'Hand to deck animation', false),
      () => doDraw(),
    );
  }

  doDraw();
  return state;
}

/**
 * Puts a list of cards into the deck, then shuffles the deck.
 */
export function SHUFFLE_CARDS_INTO_DECK(
  store: StoreLike,
  state: State,
  player: Player,
  cards: Card[],
) {
  cards.forEach((card) => {
    player.deck.cards.unshift(card);
  });
  SHUFFLE_DECK(store, state, player);
}

/**
 * Shuffle the prize cards into the deck.
 */
export function SHUFFLE_PRIZES_INTO_DECK(store: StoreLike, state: State, player: Player) {
  SHUFFLE_CARDS_INTO_DECK(store, state, player, GET_PRIZES_AS_CARD_ARRAY(player));
  GET_PLAYER_PRIZES(player).forEach((p) => (p.cards = []));
}

/**
 * Draws `count` cards, putting them into your hand.
 */
export function DRAW_CARDS(store: StoreLike, state: State, player: Player, count: number): State {
  const drawCount = Math.min(count, player.deck.cards.length);
  if (drawCount <= 0) {
    return state;
  }
  return MOVE_CARDS(store, state, player.deck, player.hand, { count: drawCount });
}

/**
 * Draws up to `count` cards, letting the player choose to draw fewer than the maximum.
 *
 * TODO: this should also allow the player to draw them 1 by 1 if they want
 */
export function DRAW_UP_TO_X_CARDS(store: StoreLike, state: State, player: Player, count: number) {
  if (count > 0) {
    const options: { message: string; value: number }[] = [];
    for (let i = count; i >= 0; i--) {
      options.push({ message: `Draw ${i} card(s)`, value: i });
    }

    store.prompt(
      state,
      new SelectPrompt(
        player.id,
        GameMessage.WANT_TO_DRAW_CARDS,
        options.map((c) => c.message),
        { allowCancel: false },
      ),
      (choice) => {
        const numCardsToDraw = options[choice].value;
        DRAW_CARDS(store, state, player, numCardsToDraw);
      },
    );
  }
}

/**
 * Draws cards until you have `count` cards in hand.
 */
export function DRAW_CARDS_UNTIL_CARDS_IN_HAND(player: Player, count: number) {
  player.deck.moveTo(player.hand, Math.max(count - player.hand.cards.length, 0));
}

/**
 * Draws `count` cards from the top of your deck as face down prize cards.
 */
export function DRAW_CARDS_AS_FACE_DOWN_PRIZES(player: Player, count: number) {
  // Draw cards from the top of the deck to the prize cards
  for (let i = 0; i < count; i++) {
    const card = player.deck.cards.pop();
    if (card) {
      const prize = player.prizes.find((p) => p.cards.length === 0);
      if (prize) {
        prize.cards.push(card);
      } else {
        player.deck.cards.push(card);
      }
    }
  }

  // Set the new prize cards to be face down
  player.prizes.forEach((p) => (p.isSecret = true));
}

export function SEARCH_DECK_FOR_CARDS_TO_HAND(
  store: StoreLike,
  state: State,
  player: Player,
  sourceCard: Card,
  filter: Partial<Card> = {},
  options: Partial<ChooseCardsOptions> = {},
  sourceEffect?: any,
) {
  if (player.deck.cards.length === 0) return;
  const opponent = StateUtils.getOpponent(state, player);

  store.prompt(
    state,
    new ChooseCardsPrompt(player, GameMessage.CHOOSE_CARD_TO_HAND, player.deck, filter, options),
    (selected) => {
      const cards = selected || [];
      if (Object.keys(filter).length > 0) {
        SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
      }
      MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard, sourceEffect });
      SHUFFLE_DECK(store, state, player);
    },
  );
}

/**
 * Search discard pile for card, show it to the opponent, put it into `player`'s hand.
 * A `filter` can be provided for the prompt as well.
 */
export function SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND(
  store: StoreLike,
  state: State,
  player: Player,
  sourceCard: Card,
  filter: Partial<Card> = {},
  options: Partial<ChooseCardsOptions> = {},
  sourceEffect?: any,
) {
  if (player.discard.cards.length === 0) return;
  const opponent = StateUtils.getOpponent(state, player);

  store.prompt(
    state,
    new ChooseCardsPrompt(player, GameMessage.CHOOSE_CARD_TO_HAND, player.discard, filter, options),
    (selected) => {
      const cards = selected || [];

      if (cards.length === 0) {
        return state;
      }

      // Create the move effect and reduce it to check if it will be prevented
      const moveEffect = new MoveCardsEffect(player.discard, player.hand, {
        cards,
        sourceCard,
        sourceEffect,
      });
      state = store.reduceEffect(state, moveEffect);

      if (!moveEffect.preventDefault) {
        SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
      }

      return state;
    },
  );
}

export function GET_CARDS_ON_BOTTOM_OF_DECK(player: Player, amount: number = 1): Card[] {
  const start = player.deck.cards.length < amount ? 0 : player.deck.cards.length - amount;
  const end = player.deck.cards.length;
  return player.deck.cards.slice(start, end);
}

/**
 * Finds `card` and moves it from its current CardList to `destination`.
 */
export function MOVE_CARD_TO(state: State, card: Card, destination: CardList) {
  StateUtils.findCardList(state, card).moveCardTo(card, destination);
}

//#endregion

export function MOVE_CARDS(
  store: StoreLike,
  state: State,
  source: CardList | PokemonCardList,
  destination: CardList | PokemonCardList,
  options: {
    cards?: Card[];
    count?: number;
    toTop?: boolean;
    toBottom?: boolean;
    skipCleanup?: boolean;
    sourceCard?: Card;
    sourceEffect?: any;
  } = {},
): State {
  return store.reduceEffect(state, new MoveCardsEffect(source, destination, options));
}

/**
 * Move a Pokémon (and its attachments) off a board slot.
 * When `attachedDestination` differs from `pokemonDestination`, attachments go to
 * the attached destination first, then Pokémon move to their destination.
 * Slot cleanup (damage, markers, tools array, etc.) is handled by MoveCardsEffect
 * when the slot is vacated — callers should not manually clearEffects/damage=0.
 */
export function MOVE_POKEMON_OFF_BOARD(
  store: StoreLike,
  state: State,
  slot: PokemonCardList,
  options: {
    pokemonDestination: CardList;
    attachedDestination?: CardList;
    sourceCard?: Card;
    sourceEffect?: any;
  },
): State {
  const pokemonDestination = options.pokemonDestination;
  const attachedDestination = options.attachedDestination ?? pokemonDestination;
  const sourceCard = options.sourceCard;
  const sourceEffect = options.sourceEffect;

  // Same destination: full-stack move handles tools + slot reset in the engine.
  if (attachedDestination === pokemonDestination) {
    return MOVE_CARDS(store, state, slot, pokemonDestination, { sourceCard, sourceEffect });
  }

  const pokemons = slot.getPokemons();
  const tools = [...slot.tools];
  const otherCards = slot.cards.filter(
    card =>
      !(card instanceof PokemonCard) &&
      !pokemons.includes(card as PokemonCard) &&
      !tools.includes(card),
  );

  // Attachments first so vacating via Pokémon move does not orphan them.
  if (otherCards.length > 0) {
    state = MOVE_CARDS(store, state, slot, attachedDestination, {
      cards: otherCards,
      sourceCard,
      sourceEffect,
    });
  }
  for (const tool of tools) {
    state = MOVE_CARDS(store, state, slot, attachedDestination, {
      cards: [tool],
      sourceCard,
      sourceEffect,
    });
  }
  if (pokemons.length > 0) {
    state = MOVE_CARDS(store, state, slot, pokemonDestination, {
      cards: pokemons,
      sourceCard,
      sourceEffect,
    });
  }

  return state;
}

export function MOVE_CARDS_TO_HAND(store: StoreLike, state: State, player: Player, cards: Card[]) {
  cards.forEach((card, index) => {
    player.deck.moveCardTo(card, player.hand);
    store.log(state, GameLog.LOG_PLAYER_PUTS_CARD_IN_HAND, { name: player.name, card: card.name });
  });
}

export type TopDeckRemainderDestination = 'shuffle' | 'bottom' | 'discard' | 'lostzone';

function cardMatchesPartialFilter(card: Card, filter: Partial<Card>): boolean {
  return matchesPromptFilter(card, filter);
}

function moveRemainingTopDeckCards(
  store: StoreLike,
  state: State,
  player: Player,
  topCards: CardList,
  remainderDestination: TopDeckRemainderDestination,
) {
  if (topCards.cards.length === 0) {
    return;
  }

  if (remainderDestination === 'discard') {
    topCards.moveTo(player.discard);
    return;
  }

  if (remainderDestination === 'lostzone') {
    topCards.moveTo(player.lostzone);
    return;
  }

  if (remainderDestination === 'bottom') {
    player.deck.cards.push(...topCards.cards);
    topCards.cards = [];
    return;
  }

  player.deck.cards = [...topCards.cards, ...player.deck.cards];
  topCards.cards = [];
  SHUFFLE_DECK(store, state, player);
}

export interface LookAtTopXCardsAndDoWithMatchingOptions {
  topCount: number;
  maxMatches: number;
  filter?: Partial<Card>;
  predicate?: (card: Card) => boolean;
  chooseMessage?: GameMessage;
  allowCancel?: boolean;
  remainderDestination?: TopDeckRemainderDestination;
  onCardsChosen: (chosenCards: Card[], topCards: CardList) => void;
}

/**
 * Core engine for "Look at the top X cards..." effects.
 *
 * Note: `onCardsChosen` is intended for synchronous card moves. If your effect
 * needs additional prompts (for example target selection), use the dedicated
 * wrapper helpers below instead.
 */
export function LOOK_AT_TOP_X_CARDS_AND_DO_WITH_MATCHING(
  store: StoreLike,
  state: State,
  player: Player,
  options: LookAtTopXCardsAndDoWithMatchingOptions,
): State {
  const {
    topCount,
    maxMatches,
    filter = {},
    predicate = () => true,
    chooseMessage = GameMessage.CHOOSE_CARD_TO_HAND,
    allowCancel = false,
    remainderDestination = 'shuffle',
    onCardsChosen,
  } = options;

  if (player.deck.cards.length === 0 || topCount <= 0 || maxMatches < 0) {
    return state;
  }

  const topCards = new CardList();
  player.deck.moveTo(topCards, Math.min(topCount, player.deck.cards.length));

  const blocked: number[] = [];
  let matchingCount = 0;
  topCards.cards.forEach((card, index) => {
    const matches = cardMatchesPartialFilter(card, filter) && predicate(card);
    if (matches) {
      matchingCount += 1;
    } else {
      blocked.push(index);
    }
  });

  const selectable = Math.min(maxMatches, matchingCount);
  if (selectable === 0) {
    moveRemainingTopDeckCards(store, state, player, topCards, remainderDestination);
    return state;
  }

  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      chooseMessage,
      topCards,
      {},
      { min: 0, max: selectable, allowCancel, blocked },
    ),
    (selected) => {
      const chosenCards = selected || [];
      onCardsChosen(chosenCards, topCards);
      moveRemainingTopDeckCards(store, state, player, topCards, remainderDestination);
    },
  );
}

export interface LookAtTopXCardsAndPutUpToYMatchingCardsIntoHandOptions {
  filter?: Partial<Card>;
  predicate?: (card: Card) => boolean;
  revealChosenCards?: boolean;
  remainderDestination?: TopDeckRemainderDestination;
  sourceCard?: Card;
  sourceEffect?: any;
}

/**
 * Compound helper for text like:
 * "Look at the top X cards of your deck, put up to Y matching cards into your hand,
 * and move the rest [shuffle/bottom/discard/lostzone]."
 */
export function LOOK_AT_TOP_X_CARDS_AND_PUT_UP_TO_Y_MATCHING_CARDS_INTO_HAND(
  store: StoreLike,
  state: State,
  player: Player,
  topCount: number,
  maxToHand: number,
  options: LookAtTopXCardsAndPutUpToYMatchingCardsIntoHandOptions = {},
): State {
  const {
    filter = {},
    predicate = () => true,
    revealChosenCards = false,
    remainderDestination = 'shuffle',
    sourceCard,
    sourceEffect,
  } = options;

  return LOOK_AT_TOP_X_CARDS_AND_DO_WITH_MATCHING(store, state, player, {
    topCount,
    maxMatches: maxToHand,
    filter,
    predicate,
    chooseMessage: GameMessage.CHOOSE_CARD_TO_HAND,
    remainderDestination,
    onCardsChosen: (chosenCards, topCards) => {
      const opponent = StateUtils.getOpponent(state, player);

      if (revealChosenCards && chosenCards.length > 0) {
        SHOW_CARDS_TO_PLAYER(store, state, opponent, chosenCards);
      }

      MOVE_CARDS(store, state, topCards, player.hand, {
        cards: chosenCards,
        sourceCard,
        sourceEffect,
      });
    },
  });
}

export interface LookAtTopXCardsAndAttachUpToYEnergyOptions {
  destinationSlots?: SlotType[];
  targetFilter?: (target: PokemonCardList, pokemonCard: PokemonCard) => boolean;
  energyFilter?: Partial<EnergyCard>;
  remainderDestination?: TopDeckRemainderDestination;
  differentTypes?: boolean;
  differentTargets?: boolean;
  sameTarget?: boolean;
  validCardTypes?: CardType[];
  maxPerType?: number;
  maxPokemonTargets?: number;
}

/**
 * Compound helper for text like:
 * "Look at the top X cards of your deck and attach up to Y matching Energy cards
 * to your Pokémon in play."
 */
export function LOOK_AT_TOP_X_CARDS_AND_ATTACH_UP_TO_Y_ENERGY(
  store: StoreLike,
  state: State,
  player: Player,
  topCount: number,
  maxEnergyToAttach: number,
  options: LookAtTopXCardsAndAttachUpToYEnergyOptions = {},
): State {
  const {
    destinationSlots = [SlotType.BENCH, SlotType.ACTIVE],
    targetFilter,
    energyFilter = {},
    remainderDestination = 'shuffle',
    differentTypes = false,
    differentTargets = false,
    sameTarget = false,
    validCardTypes,
    maxPerType,
    maxPokemonTargets = maxEnergyToAttach,
  } = options;

  if (player.deck.cards.length === 0 || topCount <= 0 || maxEnergyToAttach <= 0) {
    return state;
  }

  const topCards = new CardList();
  player.deck.moveTo(topCards, Math.min(topCount, player.deck.cards.length));

  const matchingEnergyCount = topCards.cards.filter(
    (card) =>
      card instanceof EnergyCard && cardMatchesPartialFilter(card, energyFilter as Partial<Card>),
  ).length;
  const maxAttach = Math.min(maxEnergyToAttach, matchingEnergyCount);

  const blockedTo = getBlockedTargetsFromFilter(player, targetFilter);

  return store.prompt(
    state,
    new AttachEnergyPrompt(
      player.id,
      GameMessage.ATTACH_ENERGY_CARDS,
      topCards,
      PlayerType.BOTTOM_PLAYER,
      destinationSlots,
      { superType: SuperType.ENERGY, ...energyFilter },
      {
        allowCancel: false,
        min: 0,
        max: maxAttach,
        blockedTo,
        differentTypes,
        differentTargets,
        sameTarget,
        validCardTypes,
        maxPerType,
      },
    ),
    (transfers) => {
      transfers = transfers || [];

      const uniqueTargets = new Set(
        transfers.map(
          (transfer) => `${transfer.to.player}-${transfer.to.slot}-${transfer.to.index}`,
        ),
      );
      if (uniqueTargets.size > maxPokemonTargets) {
        throw new GameError(GameMessage.INVALID_PROMPT_RESULT);
      }

      for (const transfer of transfers) {
        const target = StateUtils.getTarget(state, player, transfer.to);
        const energyCard = transfer.card as EnergyCard;
        const attachEnergyEffect = new AttachEnergyEffect(player, energyCard, target);
        store.reduceEffect(state, attachEnergyEffect);
      }

      moveRemainingTopDeckCards(store, state, player, topCards, remainderDestination);
    },
  );
}

export interface LookAtTopXCardsAndBenchUpToYMatchingPokemonOptions {
  filter?: Partial<PokemonCard>;
  predicate?: (card: PokemonCard) => boolean;
  remainderDestination?: TopDeckRemainderDestination;
}

/**
 * Compound helper for text like:
 * "Look at the top X cards of your deck and put up to Y matching Pokémon onto your Bench."
 */
export function LOOK_AT_TOP_X_CARDS_AND_BENCH_UP_TO_Y_POKEMON(
  store: StoreLike,
  state: State,
  player: Player,
  topCount: number,
  maxToBench: number,
  options: LookAtTopXCardsAndBenchUpToYMatchingPokemonOptions = {},
): State {
  const { filter = {}, predicate = () => true, remainderDestination = 'shuffle' } = options;

  if (player.deck.cards.length === 0 || topCount <= 0 || maxToBench <= 0) {
    return state;
  }

  const benchSlots = GET_PLAYER_BENCH_SLOTS(player);
  if (benchSlots.length === 0) {
    return state;
  }

  const topCards = new CardList();
  player.deck.moveTo(topCards, Math.min(topCount, player.deck.cards.length));

  const blocked: number[] = [];
  let matchingPokemonCount = 0;
  topCards.cards.forEach((card, index) => {
    const pokemonCard = card instanceof PokemonCard ? card : undefined;
    const matches =
      pokemonCard !== undefined &&
      cardMatchesPartialFilter(pokemonCard, filter as Partial<Card>) &&
      predicate(pokemonCard);
    if (matches) {
      matchingPokemonCount += 1;
    } else {
      blocked.push(index);
    }
  });

  const selectable = Math.min(maxToBench, benchSlots.length, matchingPokemonCount);
  if (selectable === 0) {
    moveRemainingTopDeckCards(store, state, player, topCards, remainderDestination);
    return state;
  }

  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
      topCards,
      {},
      { min: 0, max: selectable, allowCancel: false, blocked },
    ),
    (selected) => {
      const chosenPokemon = selected || [];
      chosenPokemon.forEach((card, index) => {
        topCards.moveCardTo(card, benchSlots[index]);
        benchSlots[index].pokemonPlayedTurn = state.turn;
      });

      moveRemainingTopDeckCards(store, state, player, topCards, remainderDestination);
    },
  );
}

export function LOOK_AT_TOPDECK_AND_DISCARD_OR_RETURN(
  store: StoreLike,
  state: State,
  choosingPlayer: Player,
  deckPlayer: Player,
) {
  {
    BLOCK_IF_DECK_EMPTY(deckPlayer);
    const deckTop = new CardList();
    deckPlayer.deck.moveTo(deckTop, 1);
    SHOW_CARDS_TO_PLAYER(store, state, choosingPlayer, deckTop.cards);
    SELECT_PROMPT_WITH_OPTIONS(store, state, choosingPlayer, GameMessage.CHOOSE_OPTION, [
      {
        message: GameMessage.DISCARD_FROM_TOP_OF_DECK,
        action: () => deckTop.moveToTopOfDestination(deckPlayer.discard),
      },
      {
        message: GameMessage.RETURN_TO_TOP_OF_DECK,
        action: () => deckTop.moveToTopOfDestination(deckPlayer.deck),
      },
    ]);
  }
}

// =============================================================================
// Play Pokemon / devolve / evolve
// =============================================================================

export function PLAY_POKEMON_FROM_HAND_TO_BENCH(
  state: State,
  player: Player,
  card: Card,
  benchSlot?: PokemonCardList,
) {
  const slot = benchSlot ?? GET_FIRST_PLAYER_BENCH_SLOT(player);
  if (slot.cards.length > 0) {
    throw new GameError(GameMessage.INVALID_TARGET);
  }
  player.hand.moveCardTo(card, slot);
  slot.pokemonPlayedTurn = state.turn;
}

export function DEVOLVE_POKEMON(
  store: StoreLike,
  state: State,
  target: PokemonCardList,
  destination: CardList,
) {
  const pokemons = target.getPokemons();
  const pokemonCard = target.getPokemonCard();

  // Weird ass lv.x stuff (yes this is actually the way it works: https://www.pokebeach.com/forums/threads/devolving-lvl-x.34943/)
  if (pokemonCard?.hasTag(CardTag.POKEMON_LV_X)) {
    // The lv.x is on a basic -> do nothing
    if (pokemons.length === 2 && pokemons.some((p) => p.stage === Stage.BASIC)) {
      return state;
    } else {
      const cardsToDevolve = pokemons.filter((p) => p.name === pokemonCard.name);
      MOVE_CARDS(store, state, target, destination, { cards: cardsToDevolve });
      target.clearEffects();
      target.pokemonPlayedTurn = state.turn;
    }
    return state;
  }

  // Handle normal devolutions
  if (
    pokemons.length > 1 &&
    !pokemonCard?.hasTag(CardTag.POKEMON_VUNION) &&
    !pokemonCard?.hasTag(CardTag.LEGEND)
  ) {
    MOVE_CARD_TO(state, pokemonCard as Card, destination);
    target.clearEffects();
    target.pokemonPlayedTurn = state.turn;
  }
}

export type DevolutionDestination = 'hand' | 'deck' | 'discard' | 'lostzone';

/**
 * Compound helper for text like:
 * "Devolve the Defending Pokemon and put the highest Stage Evolution card on it into your opponent's hand/deck/discard/Lost Zone."
 */
export function DEVOLVE_DEFENDING_AFTER_ATTACK(
  store: StoreLike,
  state: State,
  effect: Effect,
  index: number,
  user: PokemonCard,
  destination: DevolutionDestination = 'hand',
): State {
  if (!AFTER_ATTACK(effect, index, user)) {
    return state;
  }

  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  let destinationList: CardList = opponent.hand;
  if (destination === 'deck') {
    destinationList = opponent.deck;
  } else if (destination === 'discard') {
    destinationList = opponent.discard;
  } else if (destination === 'lostzone') {
    destinationList = opponent.lostzone;
  }

  DEVOLVE_POKEMON(store, state, opponent.active, destinationList);
  return state;
}

export function CAN_EVOLVE_ON_FIRST_TURN_GOING_SECOND(
  state: State,
  player: Player,
  pokemon: PokemonCardList,
) {
  if (state.turn === 2) {
    player.canEvolve = true;
    pokemon.canEvolveThisTurn = true;
  }
}

/**
 * Evolutionary Advantage: "If you go second, this Pokémon can evolve during your first turn."
 * Uses CheckTableState so any put-into-play path works. Only applies when `card` is
 * the active Pokémon of a board slot belonging to the turn player (not hand/deck/etc.).
 */
export function EVOLUTIONARY_ADVANTAGE(
  store: StoreLike,
  state: State,
  effect: Effect,
  card: PokemonCard,
): State {
  if (!(effect instanceof CheckTableStateEffect) || state.turn !== 2) {
    return state;
  }

  const cardList = StateUtils.findPokemonSlot(state, card);
  if (!cardList || cardList.getPokemonCard() !== card) {
    return state;
  }

  const owner = StateUtils.findOwner(state, cardList);
  if (owner !== state.players[state.activePlayer]) {
    return state;
  }

  if (IS_ABILITY_BLOCKED(store, state, owner, card)) {
    cardList.canEvolveThisTurn = false;
    return state;
  }

  CAN_EVOLVE_ON_FIRST_TURN_GOING_SECOND(state, owner, cardList);
  return state;
}

export interface AdaptiveEvolutionOptions {
  /** Boosted Evolution: only while this Pokémon is Active. */
  requireActive?: boolean;
  /** Extra condition (partner in play, opponent Active is ex, etc.). */
  canActivate?: (
    store: StoreLike,
    state: State,
    player: Player,
    card: PokemonCard,
  ) => boolean;
}

/**
 * Adaptive / Boosted Evolution: "can evolve during your first turn or the turn you play it."
 * Board-scoped CheckTableState; uses canEvolve + canEvolveThisTurn (no played-turn rewrite).
 */
export function ADAPTIVE_EVOLUTION(
  store: StoreLike,
  state: State,
  effect: Effect,
  card: PokemonCard,
  options: AdaptiveEvolutionOptions = {},
): State {
  if (!(effect instanceof CheckTableStateEffect)) {
    return state;
  }

  const cardList = StateUtils.findPokemonSlot(state, card);
  if (!cardList || cardList.getPokemonCard() !== card) {
    return state;
  }

  const owner = StateUtils.findOwner(state, cardList);
  if (owner !== state.players[state.activePlayer]) {
    return state;
  }

  const clear = () => {
    cardList.canEvolveThisTurn = false;
  };

  if (options.requireActive && owner.active !== cardList) {
    clear();
    return state;
  }

  if (IS_ABILITY_BLOCKED(store, state, owner, card)) {
    clear();
    return state;
  }

  if (options.canActivate && !options.canActivate(store, state, owner, card)) {
    clear();
    return state;
  }

  const isFirstTurn = state.turn <= 2;
  const playedThisTurn = cardList.pokemonPlayedTurn === state.turn;
  if (!isFirstTurn && !playedThisTurn) {
    clear();
    return state;
  }

  owner.canEvolve = true;
  cardList.canEvolveThisTurn = true;
  return state;
}

// =============================================================================
// Switching / gust
// =============================================================================

export function SWITCH_ACTIVE_WITH_BENCHED(store: StoreLike, state: State, player: Player) {
  const hasBenched = player.bench.some((b) => b.cards.length > 0);
  if (!hasBenched) return state;

  store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_NEW_ACTIVE_POKEMON,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.BENCH],
      { allowCancel: false },
    ),
    (selected) => {
      if (!selected || selected.length === 0) return state;
      const target = selected[0];
      player.switchPokemon(target, store, state);
    },
  );
}

export interface SwitchInOpponentBenchedPokemonOptions {
  allowCancel?: boolean;
  blocked?: CardTarget[];
  onSwitched?: (target: PokemonCardList) => void;
  sourceEffect?: AttackEffect | AfterAttackEffect;
}

/**
 * Compound helper for "switch in" effects:
 * "Switch 1 of your opponent's Benched Pokémon with their Active Pokémon."
 */
export function SWITCH_IN_OPPONENT_BENCHED_POKEMON(
  store: StoreLike,
  state: State,
  player: Player,
  options: SwitchInOpponentBenchedPokemonOptions = {},
): State {
  const { allowCancel = false, blocked = [], onSwitched, sourceEffect } = options;
  const opponent = StateUtils.getOpponent(state, player);
  const hasBenchedPokemon = opponent.bench.some((bench) => bench.cards.length > 0);
  if (!hasBenchedPokemon) {
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
      if (sourceEffect) {
        const gustEffect = new GustOpponentBenchEffect(sourceEffect, selected[0]);
        store.reduceEffect(state, gustEffect);
        if (!gustEffect.preventDefault && onSwitched !== undefined) {
          onSwitched(selected[0]);
        }
      } else {
        opponent.switchPokemon(selected[0], store, state);
        if (onSwitched !== undefined) {
          onSwitched(selected[0]);
        }
      }
    },
  );
}

export interface SwitchOutOpponentActivePokemonOptions {
  allowCancel?: boolean;
  blocked?: CardTarget[];
  onSwitched?: (target: PokemonCardList) => void;
  sourceEffect?: AttackEffect | AfterAttackEffect;
}

/**
 * Compound helper for text like:
 * "Switch out your opponent's Active Pokémon to the Bench.
 * (Your opponent chooses the new Active Pokémon.)"
 *
 * Common on effects like Repel and the opponent-facing part of Escape Rope.
 */
export function SWITCH_OUT_OPPONENT_ACTIVE_POKEMON(
  store: StoreLike,
  state: State,
  player: Player,
  options: SwitchOutOpponentActivePokemonOptions = {},
): State {
  const { allowCancel = false, blocked = [], onSwitched, sourceEffect } = options;
  const opponent = StateUtils.getOpponent(state, player);
  const hasBenchedPokemon = opponent.bench.some((bench) => bench.cards.length > 0);
  if (!hasBenchedPokemon) {
    return state;
  }

  if (sourceEffect) {
    const switchOutEffect = new SwitchOutOpponentsActiveEffect(sourceEffect);
    store.reduceEffect(state, switchOutEffect);
    if (switchOutEffect.preventDefault) {
      return state;
    }
  }

  return store.prompt(
    state,
    new ChoosePokemonPrompt(
      opponent.id,
      GameMessage.CHOOSE_POKEMON_TO_SWITCH,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.BENCH],
      { min: 1, max: 1, allowCancel, blocked },
    ),
    (selected) => {
      if (!selected || selected.length === 0) {
        return;
      }
      if (sourceEffect) {
        const switchOutEffect = new SwitchOutOpponentsActiveEffect(sourceEffect);
        switchOutEffect.benchTarget = selected[0];
        store.reduceEffect(state, switchOutEffect);
        if (!switchOutEffect.preventDefault && onSwitched !== undefined) {
          onSwitched(selected[0]);
        }
      } else {
        opponent.switchPokemon(selected[0], store, state);
        if (onSwitched !== undefined) {
          onSwitched(selected[0]);
        }
      }
    },
  );
}

/**
 * Backward-compatible alias for `SWITCH_OUT_OPPONENT_ACTIVE_POKEMON`.
 */
export function OPPONENT_SWITCHES_THEIR_ACTIVE_POKEMON(
  store: StoreLike,
  state: State,
  player: Player,
  options: SwitchOutOpponentActivePokemonOptions = {},
): State {
  return SWITCH_OUT_OPPONENT_ACTIVE_POKEMON(store, state, player, options);
}

/**
 * Backward-compatible alias for `SwitchInOpponentBenchedPokemonOptions`.
 */
export type GustOpponentBenchedPokemonOptions = SwitchInOpponentBenchedPokemonOptions;

/**
 * Backward-compatible alias for `SWITCH_IN_OPPONENT_BENCHED_POKEMON`.
 */
export function GUST_OPPONENT_BENCHED_POKEMON(
  store: StoreLike,
  state: State,
  player: Player,
  options: SwitchInOpponentBenchedPokemonOptions = {},
): State {
  return SWITCH_IN_OPPONENT_BENCHED_POKEMON(store, state, player, options);
}

/**
 * Backward-compatible alias for `SwitchOutOpponentActivePokemonOptions`.
 */
export type OpponentSwitchesTheirActivePokemonOptions = SwitchOutOpponentActivePokemonOptions;

export function GET_FIRST_PLAYER_BENCH_SLOT(player: Player): PokemonCardList {
  const slots = GET_PLAYER_BENCH_SLOTS(player);
  BLOCK_IF_NO_SLOTS(slots);
  return slots[0];
}

export function GET_PLAYER_BENCH_SLOTS(player: Player): PokemonCardList[] {
  return player.bench.filter((b) => b.cards.length === 0);
}

// =============================================================================
// Prompts & coin flips
// =============================================================================

export function SHOW_CARDS_TO_PLAYER(
  store: StoreLike,
  state: State,
  player: Player,
  cards: Card[],
): State {
  if (cards.length === 0) return state;
  return store.prompt(
    state,
    new ShowCardsPrompt(player.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
    () => {},
  );
}

export function SELECT_PROMPT(
  store: StoreLike,
  state: State,
  player: Player,
  values: string[],
  callback: (result: number) => void,
): State {
  return store.prompt(
    state,
    new SelectPrompt(player.id, GameMessage.CHOOSE_OPTION, values, { allowCancel: false }),
    callback,
  );
}

export function SELECT_PROMPT_WITH_OPTIONS(
  store: StoreLike,
  state: State,
  player: Player,
  message: GameMessage,
  options: { message: GameMessage; action: () => void }[],
) {
  return store.prompt(
    state,
    new SelectPrompt(
      player.id,
      message,
      options.map((opt) => opt.message),
      { allowCancel: false },
    ),
    (choice) => {
      const option = options[choice];
      option.action();
    },
  );
}

export function CONFIRMATION_PROMPT(
  store: StoreLike,
  state: State,
  player: Player,
  callback: (result: boolean) => void,
  message: GameMessage = GameMessage.WANT_TO_USE_ABILITY,
): State {
  return store.prompt(state, new ConfirmPrompt(player.id, message), callback);
}

export function COIN_FLIP_PROMPT(
  store: StoreLike,
  state: State,
  player: Player,
  callback: (result: boolean) => void,
): State {
  const coinFlip = new CoinFlipEffect(player, callback);
  return store.reduceEffect(state, coinFlip);
}

export function MULTIPLE_COIN_FLIPS_PROMPT(
  store: StoreLike,
  state: State,
  player: Player,
  amount: number,
  callback: (results: boolean[]) => void,
): State {
  const sequenceEffect = new CoinFlipSequenceEffect(player, amount, callback);
  return store.reduceEffect(state, sequenceEffect);
}

/**
 * Reusable "flip coins until tails" helper.
 * Returns the number of heads via callback.
 */
export function FLIP_UNTIL_TAILS_AND_COUNT_HEADS(
  store: StoreLike,
  state: State,
  player: Player,
  callback: (heads: number) => void,
): State {
  const sequenceEffect = new CoinFlipSequenceEffect(player, 'untilTails', (results: boolean[]) => {
    const headsCount = results.filter((r) => r).length;
    callback(headsCount);
  });
  return store.reduceEffect(state, sequenceEffect);
}

// =============================================================================
// Guards / block helpers
// =============================================================================

export function BLOCK_IF_NO_SLOTS(slots: PokemonCardList[]) {
  if (slots.length === 0) throw new GameError(GameMessage.NO_BENCH_SLOTS_AVAILABLE);
}

export function BLOCK_IF_DECK_EMPTY(player: Player) {
  if (player.deck.cards.length === 0) throw new GameError(GameMessage.NO_CARDS_IN_DECK);
}

export function BLOCK_IF_DISCARD_EMPTY(player: Player) {
  if (player.discard.cards.length === 0) throw new GameError(GameMessage.NO_CARDS_IN_DISCARD);
}

export function BLOCK_IF_GX_ATTACK_USED(player: Player) {
  if (player.usedGX === true) throw new GameError(GameMessage.LABEL_GX_USED);
}

/**
 * Convenience guard for cards that can only be used if your VSTAR Power is still available.
 */
export function BLOCK_IF_VSTAR_POWER_USED(player: Player) {
  if (player.usedVSTAR === true) {
    throw new GameError(GameMessage.LABEL_VSTAR_USED);
  }
}

/**
 * Returns true if the given player has already used their VSTAR Power this game.
 */
export function PLAYER_HAS_USED_VSTAR_POWER(player: Player): boolean {
  return player.usedVSTAR === true;
}

/**
 * Returns true if your opponent has already used their VSTAR Power this game.
 */
export function OPPONENT_HAS_USED_VSTAR_POWER(state: State, player: Player): boolean {
  const opponent = StateUtils.getOpponent(state, player);
  return opponent.usedVSTAR === true;
}

export function BLOCK_IF_HAS_SPECIAL_CONDITION(player: Player, source: Card) {
  if (player.active.getPokemonCard() === source && player.active.specialConditions.length > 0)
    throw new GameError(GameMessage.CANNOT_USE_POWER);
}

export function BLOCK_IF_ASLEEP_CONFUSED_PARALYZED(player: Player, source: Card) {
  // "any Pokemon Power on any Pokemon that says it stops working if the Pokemon is Paralyzed, Asleep, or Confused,
  // now should ALSO include Poisoned, or Burned as well." - (Jan 17, 2002 WotC Chat, Q1278 & Q1284)
  // I was unaware of this errata when I originally made this and BLOCK_IF_HAS_SPECIAL_CONDITION, so I updated it to do the same thing.
  if (player.active.getPokemonCard() === source && player.active.specialConditions.length > 0)
    throw new GameError(GameMessage.CANNOT_USE_POWER);
}

/**
 * Helper for text like:
 * "This Pokémon can't use [Attack Name] during your next turn."
 *
 * Uses the built-in pending attack lock list, so no marker cleanup is required.
 */
export function THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(
  player: Player,
  attack: Attack | string,
) {
  const attackName = typeof attack === 'string' ? attack : attack.name;
  if (!player.active.cannotUseAttacksNextTurnPending.includes(attackName)) {
    player.active.cannotUseAttacksNextTurnPending.push(attackName);
  }
}

/**
 * Helper for text like:
 * "This Pokémon can't attack during your next turn."
 */
export function THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(player: Player) {
  player.active.cannotAttackNextTurnPending = true;
}

// =============================================================================
// Special conditions
// =============================================================================

//#region Special Conditions
export function ADD_SPECIAL_CONDITIONS_TO_PLAYER_ACTIVE(
  store: StoreLike,
  state: State,
  player: Player,
  source: Card,
  specialConditions: SpecialCondition[],
  poisonDamage: number = 10,
  burnDamage: number = 20,
  sleepFlips: number = 1,
  confusionDamage: number = 30,
) {
  store.reduceEffect(
    state,
    new AddSpecialConditionsPowerEffect(
      player,
      source,
      player.active,
      specialConditions,
      poisonDamage,
      burnDamage,
      sleepFlips,
      confusionDamage,
    ),
  );
}

export function ADD_SLEEP_TO_PLAYER_ACTIVE(
  store: StoreLike,
  state: State,
  player: Player,
  source: Card,
  sleepFlips: number = 1,
) {
  ADD_SPECIAL_CONDITIONS_TO_PLAYER_ACTIVE(
    store,
    state,
    player,
    source,
    [SpecialCondition.ASLEEP],
    10,
    20,
    sleepFlips,
  );
}

export function ADD_POISON_TO_PLAYER_ACTIVE(
  store: StoreLike,
  state: State,
  player: Player,
  source: Card,
  poisonDamage: number = 10,
) {
  ADD_SPECIAL_CONDITIONS_TO_PLAYER_ACTIVE(
    store,
    state,
    player,
    source,
    [SpecialCondition.POISONED],
    poisonDamage,
  );
}

export function ADD_BURN_TO_PLAYER_ACTIVE(
  store: StoreLike,
  state: State,
  player: Player,
  source: Card,
  burnDamage: number = 20,
) {
  ADD_SPECIAL_CONDITIONS_TO_PLAYER_ACTIVE(
    store,
    state,
    player,
    source,
    [SpecialCondition.BURNED],
    10,
    burnDamage,
  );
}

export function ADD_PARALYZED_TO_PLAYER_ACTIVE(
  store: StoreLike,
  state: State,
  player: Player,
  source: Card,
) {
  ADD_SPECIAL_CONDITIONS_TO_PLAYER_ACTIVE(store, state, player, source, [
    SpecialCondition.PARALYZED,
  ]);
}

export function ADD_CONFUSION_TO_PLAYER_ACTIVE(
  store: StoreLike,
  state: State,
  player: Player,
  source: Card,
  confusionDamage: number = 30,
) {
  ADD_SPECIAL_CONDITIONS_TO_PLAYER_ACTIVE(
    store,
    state,
    player,
    source,
    [SpecialCondition.CONFUSED],
    10,
    20,
    1,
    confusionDamage,
  );
}

export interface PreventAndClearSpecialConditionsOptions {
  shouldApply: (target: PokemonCardList, owner: Player) => boolean;
  clearDuringCheckTableState?: boolean;
}

/**
 * Compound helper for text like:
 * "Pokémon that meet [condition] can't be affected by Special Conditions, and recover from them."
 *
 * Call this in reduceEffect and pass card-specific matching logic via `shouldApply`.
 */
export function PREVENT_AND_CLEAR_SPECIAL_CONDITIONS(
  state: State,
  effect: Effect,
  options: PreventAndClearSpecialConditionsOptions,
): void {
  const { shouldApply, clearDuringCheckTableState = true } = options;

  if (
    effect instanceof AddSpecialConditionsEffect ||
    effect instanceof AddSpecialConditionsPowerEffect
  ) {
    const owner = StateUtils.findOwner(state, effect.target);
    if (shouldApply(effect.target, owner)) {
      effect.preventDefault = true;
    }
    return;
  }

  if (clearDuringCheckTableState && effect instanceof CheckTableStateEffect) {
    state.players.forEach((player) => {
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList.specialConditions.length > 0 && shouldApply(cardList, player)) {
          cardList.clearAllSpecialConditions();
        }
      });
    });
  }
}

// =============================================================================
// Markers & tags
// =============================================================================

export function ADD_MARKER(
  marker: string,
  owner: Player | Card | PokemonCard | PokemonCardList,
  source: Card,
) {
  owner.marker.addMarker(marker, source);
}

export function REMOVE_MARKER(
  marker: string,
  owner: Player | Card | PokemonCard | PokemonCardList,
  source?: Card,
) {
  return owner.marker.removeMarker(marker, source);
}

export function HAS_MARKER(
  marker: string,
  owner: Player | Card | PokemonCard | PokemonCardList,
  source?: Card,
): boolean {
  return owner.marker.hasMarker(marker, source);
}

/**
 * Enforce "Once during your turn" for activated abilities.
 * Call this after all card-specific validation, right before applying the ability effect.
 * Pair with REMOVE_MARKER_AT_END_OF_TURN(effect, marker, source) in reduceEffect.
 */
export function USE_ABILITY_ONCE_PER_TURN(player: Player, marker: string, source: Card) {
  if (HAS_MARKER(marker, player, source)) {
    throw new GameError(GameMessage.POWER_ALREADY_USED);
  }
  ADD_MARKER(marker, player, source);
}

export function BLOCK_EFFECT_IF_MARKER(
  marker: string,
  owner: Player | Card | PokemonCard | PokemonCardList,
  source?: Card,
) {
  if (HAS_MARKER(marker, owner, source)) throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
}

export function PREVENT_DAMAGE_IF_TARGET_HAS_MARKER(effect: Effect, marker: string, source?: Card) {
  if (effect instanceof PutDamageEffect && HAS_MARKER(marker, effect.target, source))
    effect.preventDefault = true;
}

export function PREVENT_DAMAGE_IF_SOURCE_HAS_TAG(effect: Effect, tag: CardTag, source: Card) {
  if (effect instanceof PutDamageEffect && source.hasTag(tag)) effect.preventDefault = true;
}

export function REMOVE_MARKER_AT_END_OF_TURN(effect: Effect, marker: string, source: Card) {
  if (effect instanceof EndTurnEffect && HAS_MARKER(marker, effect.player, source))
    REMOVE_MARKER(marker, effect.player, source);
}

export interface PokemonKnockedOutLastTurnFilter {
  /** Require KO from attack damage during the opponent's attack. */
  byAttackDamage?: boolean;
  /** Knocked-out Pokemon must have all of these tags. */
  tags?: CardTag[];
}

export function WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN(
  player: Player,
  filter?: PokemonKnockedOutLastTurnFilter,
): boolean {
  if (filter?.byAttackDamage) {
    if (!player.pokemonKnockedOutByAttackDuringOpponentsLastTurn) {
      return false;
    }
  } else if (!player.pokemonKnockedOutDuringOpponentsLastTurn) {
    return false;
  }

  if (filter?.tags?.length) {
    return player.pokemonKnockedOutLastTurnEntries.some((entry) =>
      filter.tags!.every((tag) => entry.includes(tag)),
    );
  }

  return true;
}

/**
 * Clear markers that track events from "your opponent's last turn" (e.g. a KO).
 * Skipped when the player has an additional turn pending (Dialga-GX Timeless, etc.)
 * so both consecutive player turns can still use those effects.
 */
export function REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN(
  effect: Effect,
  marker: string,
  source?: Card,
  owner?: Player | Card | PokemonCard | PokemonCardList,
) {
  if (!(effect instanceof EndTurnEffect) || effect.player.usedTurnSkip) {
    return;
  }
  const markerOwner = owner ?? effect.player;
  if (HAS_MARKER(marker, markerOwner, source)) {
    REMOVE_MARKER(marker, markerOwner, source);
  }
}

export function REMOVE_MARKER_FROM_ACTIVE_AT_END_OF_TURN(
  effect: Effect,
  marker: string,
  source: Card,
) {
  if (effect instanceof EndTurnEffect && HAS_MARKER(marker, effect.player.active, source))
    REMOVE_MARKER(marker, effect.player.active, source);
}

export function REPLACE_MARKER_AT_END_OF_TURN(
  effect: Effect,
  oldMarker: string,
  newMarker: string,
  source: Card,
) {
  if (effect instanceof EndTurnEffect && HAS_MARKER(oldMarker, effect.player, source)) {
    REMOVE_MARKER(oldMarker, effect.player, source);
    ADD_MARKER(newMarker, effect.player, source);
  }
}

/**
 * If an EndTurnEffect is given, will check for `clearerMarker` on the player whose turn it is,
 * and clear all of the player or opponent's `pokemonMarker`s.
 * Useful for "During your opponent's next turn" effects.
 */
export function CLEAR_MARKER_AND_OPPONENTS_POKEMON_MARKER_AT_END_OF_TURN(
  state: State,
  effect: Effect,
  clearerMarker: string,
  pokemonMarker: string,
  source: Card,
) {
  if (effect instanceof EndTurnEffect && HAS_MARKER(clearerMarker, effect.player, source)) {
    REMOVE_MARKER(clearerMarker, effect.player, source);
    const opponent = StateUtils.getOpponent(state, effect.player);
    REMOVE_MARKER(pokemonMarker, opponent, source);
    opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) =>
      REMOVE_MARKER(pokemonMarker, cardList, source),
    );
  }
}

// =============================================================================
// Ability / power / tool / energy blocked checks & play-card guards
// =============================================================================

/**
 * Checks if abilities are blocked on `card` for `player`.
 * @returns `true` if the ability is blocked, `false` if the ability is able to go thru.
 *
 * Ability-locking cards (Hex Maniac, Silent Lab, Garbodor, etc.) should implement their
 * lock via `HANDLE_ABILITY_LOCK` in `prefabs/ability-lock.ts` so Check + PowerEffect stay in sync.
 * Ability owners must still call this before applying ability effects.
 */
export function IS_ABILITY_BLOCKED(
  store: StoreLike,
  state: State,
  player: Player,
  card: PokemonCard,
  /** When probing a specific power (e.g. useFromHand), pass it so allowUseFromHand locks match. */
  power?: Partial<Power>,
): boolean {
  // Try to reduce PowerEffect, to check if something is blocking our ability
  try {
    store.reduceEffect(
      state,
      new PowerEffect(
        player,
        {
          name: 'test',
          powerType: power?.powerType ?? PowerType.ABILITY,
          text: '',
          exemptFromAbilityLock: power?.exemptFromAbilityLock,
          exemptFromInitialize: power?.exemptFromInitialize,
          knocksOutSelf: power?.knocksOutSelf,
          useFromHand: power?.useFromHand,
          useFromDiscard: power?.useFromDiscard,
        },
        card,
      ),
    );
  } catch {
    return true;
  }
  return false;
}

/**
 * Checks if pokebodies are blocked on `card` for `player`.
 * @returns `true` if the pokebody is blocked, `false` if the pokebody is able to go thru.
 */
export function IS_POKEBODY_BLOCKED(
  store: StoreLike,
  state: State,
  player: Player,
  card: PokemonCard,
): boolean {
  // Try to reduce PowerEffect, to check if something is blocking our pokebody
  try {
    store.reduceEffect(
      state,
      new PowerEffect(
        player,
        {
          name: 'test',
          powerType: PowerType.POKEBODY,
          text: '',
        },
        card,
      ),
    );
  } catch {
    return true;
  }
  try {
    store.reduceEffect(
      state,
      new PowerEffect(
        player,
        {
          name: 'test',
          powerType: PowerType.POKEMON_POWER,
          text: '',
        },
        card,
      ),
    );
  } catch {
    return true;
  }
  return false;
}

/**
 * Checks if pokepowers are blocked on `card` for `player`.
 * @returns `true` if the pokepower is blocked, `false` if the pokepower is able to go thru.
 */
export function IS_POKEPOWER_BLOCKED(
  store: StoreLike,
  state: State,
  player: Player,
  card: PokemonCard,
): boolean {
  // Try to reduce PowerEffect, to check if something is blocking our pokepower
  try {
    store.reduceEffect(
      state,
      new PowerEffect(
        player,
        {
          name: 'test',
          powerType: PowerType.POKEPOWER,
          text: '',
        },
        card,
      ),
    );
  } catch {
    return true;
  }
  try {
    store.reduceEffect(
      state,
      new PowerEffect(
        player,
        {
          name: 'test',
          powerType: PowerType.POKEMON_POWER,
          text: '',
        },
        card,
      ),
    );
  } catch {
    return true;
  }
  return false;
}

/**
 * Checks if pokemon powers are blocked on `card` for `player`.
 * @returns `true` if the pokemon power is blocked, `false` if the pokepower is able to go thru.
 */
export function IS_POKEMON_POWER_BLOCKED(
  store: StoreLike,
  state: State,
  player: Player,
  card: PokemonCard,
): boolean {
  // Try to reduce PowerEffect for POKEMON_POWER
  try {
    store.reduceEffect(
      state,
      new PowerEffect(
        player,
        {
          name: 'test',
          powerType: PowerType.POKEMON_POWER,
          text: '',
        },
        card,
      ),
    );
  } catch {
    return true;
  }
  // Try both POKEPOWER and POKEBODY, return true only if BOTH are blocked
  let pokePowerBlocked = false;
  let pokeBodyBlocked = false;
  try {
    store.reduceEffect(
      state,
      new PowerEffect(
        player,
        {
          name: 'test',
          powerType: PowerType.POKEPOWER,
          text: '',
        },
        card,
      ),
    );
  } catch {
    pokePowerBlocked = true;
  }
  try {
    store.reduceEffect(
      state,
      new PowerEffect(
        player,
        {
          name: 'test',
          powerType: PowerType.POKEBODY,
          text: '',
        },
        card,
      ),
    );
  } catch {
    pokeBodyBlocked = true;
  }
  // Return true only if both POKEPOWER and POKEBODY are blocked
  return pokePowerBlocked && pokeBodyBlocked;
  // Ruling: if both pokePower and pokeBody are blocked, then the pokemon power is blocked.
}

/**
 * Checks if a tool's effect is being blocked
 * @returns `true` if the tool's effect is blocked, `false` if the tool's effect is able to activate.
 */
export function IS_TOOL_BLOCKED(
  store: StoreLike,
  state: State,
  player: Player,
  card: TrainerCard,
): boolean {
  if (state.players.some((p) => p.stadiumAndToolHaveNoEffectTurnsRemaining > 0)) {
    return true;
  }
  // Try to reduce ToolEffect, to check if something is blocking the tool from working
  try {
    const stub = new ToolEffect(player, card);
    store.reduceEffect(state, stub);
  } catch {
    return true;
  }
  return false;
}

export { IS_STADIUM_EFFECT_BLOCKED } from './stadium-effect';

/**
 * True when an attack effect originated from the target owner's opponent's Pokémon.
 * Used for text like "Prevent effects of attacks from your opponent's Pokémon done to …"
 */
export function IS_ATTACK_EFFECT_FROM_OPPONENTS_POKEMON(
  state: State,
  effect: AbstractAttackEffect,
): boolean {
  const targetOwner = StateUtils.findOwner(state, effect.target);
  const sourceOwner = StateUtils.findOwner(state, effect.source);
  return sourceOwner === StateUtils.getOpponent(state, targetOwner);
}

/**
 * Checks if a special energy's effect is being blocked for the given player and Pokemon it is attached to. Do not use in CheckProvidedEnergyEffect.
 * @returns `true` if the special energy's effect is blocked, `false` if the special energy's effect is able to activate.
 */
export function IS_SPECIAL_ENERGY_BLOCKED(
  store: StoreLike,
  state: State,
  player: Player,
  card: EnergyCard,
  attachedTo: PokemonCardList,
  exemptFromOpponentsSpecialEnergyBlockingAbility = false,
): boolean {
  // Try to reduce SpecialEnergyEffect, to check if something is blocking the effect
  try {
    const stub = new SpecialEnergyEffect(
      player,
      card,
      attachedTo,
      exemptFromOpponentsSpecialEnergyBlockingAbility,
    );
    store.reduceEffect(state, stub);
  } catch {
    return true;
  }
  return false;
}

/**
 * Validates if an energy card can be played under current game conditions
 * NOTE: This only checks basic conditions, not card-specific requirements
 * @param store The store instance
 * @param state The current game state
 * @param player The player attempting to play the card
 * @param energyCard The energy card to validate
 * @returns true if the card can be played, false otherwise
 */
export function CAN_PLAY_ENERGY_CARD(
  store: StoreLike,
  state: State,
  player: Player,
  energyCard: EnergyCard,
): boolean {
  try {
    // Only check during player's turn
    if (
      state.phase !== GamePhase.PLAYER_TURN ||
      state.players[state.activePlayer].id !== player.id
    ) {
      return false;
    }

    if (player.cannotPlayEnergyCards) {
      return false;
    }
    if (energyCard.energyType === EnergyType.SPECIAL && player.cannotPlaySpecialEnergyCards) {
      return false;
    }

    // Check if player has any Pokemon in play to attach energy to
    const hasActivePokemon = player.active.cards.length > 0;
    const hasBenchPokemon = player.bench.some((bench) => bench.cards.length > 0);

    if (!hasActivePokemon && !hasBenchPokemon) {
      return false;
    }

    // Check if energy was already played this turn (unless unlimited)
    if (!player.usedDragonsWish && !state.rules.unlimitedEnergyAttachments) {
      if (player.energyPlayedTurn === state.turn) {
        return false;
      }
    }

    // Basic validation passed - return true
    // Card-specific requirements will be validated when actually playing
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * True when a hand Pokémon with useFromHandToBench can be played onto an open Bench slot.
 * Hand-affecting ability locks (Wobbuffet, Greninja, Hex Maniac, Silent Lab, etc.) fail this
 * the same way item lock fails {@link CAN_PLAY_TRAINER_CARD}.
 */
export function CAN_USE_FROM_HAND_TO_BENCH_POWER(
  store: StoreLike,
  state: State,
  player: Player,
  pokemonCard: PokemonCard,
): boolean {
  try {
    const power = pokemonCard.powers?.find((p) => p.useFromHandToBench === true);
    if (!power) {
      return false;
    }

    if (
      state.phase !== GamePhase.PLAYER_TURN ||
      state.players[state.activePlayer].id !== player.id
    ) {
      return false;
    }

    const benchCount = player.bench.filter((b) => b.cards.length > 0).length;
    if (benchCount >= player.bench.length) {
      return false;
    }

    // Probe with the real power's hand flags so Path-style allowUseFromHand still works,
    // while Wobbuffet / Greninja / Hex Maniac (hand locks) block playability.
    if (IS_ABILITY_BLOCKED(store, state, player, pokemonCard, power)) {
      return false;
    }

    // Remove-mode locks strip the power from discovery — treat as unusable for canPlay.
    const powersEffect = new CheckPokemonPowersEffect(player, pokemonCard);
    store.reduceEffect(state, powersEffect);
    if (!powersEffect.powers.some((p) => p.name === power.name && p.useFromHandToBench === true)) {
      return false;
    }

    if (pokemonCard.canUseFromHandToBench) {
      return pokemonCard.canUseFromHandToBench(store, state, player) === true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validates if a pokemon card can be played under current game conditions
 * Checks basic conditions and evolution requirements
 * @param store The store instance
 * @param state The current game state
 * @param player The player attempting to play the card
 * @param pokemonCard The pokemon card to validate
 * @returns true if the card can be played, false otherwise
 */
export function CAN_PLAY_POKEMON_CARD(
  store: StoreLike,
  state: State,
  player: Player,
  pokemonCard: PokemonCard,
): boolean {
  try {
    // Only check during player's turn
    if (
      state.phase !== GamePhase.PLAYER_TURN ||
      state.players[state.activePlayer].id !== player.id
    ) {
      return false;
    }

    if (player.cannotPlayPokemonCards) {
      return false;
    }
    if (
      player.cannotPlayPokemonWithAbilities &&
      pokemonCard.powers.some((power) => power.powerType === PowerType.ABILITY)
    ) {
      return false;
    }

    // Check if there's space on bench (capacity follows stadiums like Area Zero → 8)
    const benchCount = player.bench.filter((b) => b.cards.length > 0).length;
    const benchCapacity = player.bench.length;
    const sandboxAllBasic = Boolean(
      state.gameSettings?.sandboxMode && state.gameSettings?.sandboxAllPokemonBasic,
    );
    if (sandboxAllBasic && benchCount < benchCapacity) {
      return true;
    }

    if (benchCount >= benchCapacity && pokemonCard.stage === Stage.BASIC) {
      return false;
    }

    if (CAN_USE_FROM_HAND_TO_BENCH_POWER(store, state, player, pokemonCard)) {
      return true;
    }

    if (canPlayDualLegend(store, state, player, pokemonCard)) {
      const legendPower = pokemonCard.powers?.find(
        (p) => p.useFromHand === true && p.powerType === PowerType.LEGEND_ASSEMBLY,
      );
      if (!IS_ABILITY_BLOCKED(store, state, player, pokemonCard, legendPower)) {
        return true;
      }
    }

    // For evolution cards, check if base Pokemon is in play AND can be evolved
    if (pokemonCard.stage !== Stage.BASIC) {
      // Check active Pokemon
      const activePokemon = player.active.getPokemonCard();
      let canEvolveActive = false;
      if (activePokemon) {
        const matchesEvolution =
          activePokemon.name === pokemonCard.evolvesFrom ||
          activePokemon.evolvesTo.includes(pokemonCard.name) ||
          activePokemon.evolvesToStage.includes(pokemonCard.stage) ||
          (Array.isArray(activePokemon.evolvesFromBase) &&
            activePokemon.evolvesFromBase.length > 0 &&
            activePokemon.evolvesFromBase.includes(pokemonCard.evolvesFrom));
        if (matchesEvolution) {
          // Check if Pokemon was played this turn (can't evolve if played this turn)
          // unless an effect (e.g. Evolutionary Advantage) granted canEvolveThisTurn
          if (player.active.pokemonPlayedTurn < state.turn || player.active.canEvolveThisTurn) {
            canEvolveActive = true;
          }
        }
      }

      // Check bench Pokemon
      let canEvolveBench = false;
      for (const bench of player.bench) {
        const benchPokemon = bench.getPokemonCard();
        if (benchPokemon) {
          const matchesEvolution =
            benchPokemon.name === pokemonCard.evolvesFrom ||
            benchPokemon.evolvesTo.includes(pokemonCard.name) ||
            benchPokemon.evolvesToStage.includes(pokemonCard.stage) ||
            (Array.isArray(benchPokemon.evolvesFromBase) &&
              benchPokemon.evolvesFromBase.length > 0 &&
              benchPokemon.evolvesFromBase.includes(pokemonCard.evolvesFrom));
          if (matchesEvolution) {
            // Check if Pokemon was played this turn (can't evolve if played this turn)
            // unless an effect (e.g. Evolutionary Advantage) granted canEvolveThisTurn
            if (bench.pokemonPlayedTurn < state.turn || bench.canEvolveThisTurn) {
              canEvolveBench = true;
              break;
            }
          }
        }
      }

      if (!canEvolveActive && !canEvolveBench) {
        return false;
      }
    }

    // Basic validation passed
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Universal function to check if any card can be played
 * @param store The store instance
 * @param state The current game state
 * @param player The player attempting to play the card
 * @param card The card to validate
 * @returns true if the card can be played, false otherwise
 */
export function CAN_PLAY_CARD(store: StoreLike, state: State, player: Player, card: Card): boolean {
  try {
    if (card instanceof TrainerCard) {
      return CAN_PLAY_TRAINER_CARD(store, state, player, card);
    } else if (card instanceof EnergyCard) {
      return CAN_PLAY_ENERGY_CARD(store, state, player, card);
    } else if (card instanceof PokemonCard) {
      return CAN_PLAY_POKEMON_CARD(store, state, player, card);
    }
    return false;
  } catch (error) {
    return false;
  }
}

// =============================================================================
// Misc rules
// =============================================================================

/**
 * Tera Rule: Prevents damage effects from being applied to non-active Pokémon.
 * This is commonly used by Tera Pokémon to prevent damage to benched Pokémon.
 * @param effect The effect being processed
 * @param state The current game state
 * @param source The source card that created this effect
 */
export function TERA_RULE(effect: Effect, state: State, source: Card): void {
  if (
    effect instanceof PutDamageEffect &&
    effect.target.cards.includes(source) &&
    effect.target.getPokemonCard() === source
  ) {
    const player = effect.player;
    const opponent = StateUtils.getOpponent(state, player);

    // Target is not Active
    if (effect.target === player.active || effect.target === opponent.active) {
      return;
    }

    effect.preventDefault = true;
  }
}

/**
 * Break Rule: This Pokémon retains the attacks, Abilities, Weakness, Resistance, and Retreat Cost of its previous Evolution.
 * @param effect The effect being processed
 * @param state The current game state
 * @param source The source card that created this effect
 */
export function BREAK_RULE(effect: Effect, state: State, source: PokemonCard): State {
  // Weakness, Resistance, and Retreat Cost
  if (effect instanceof PlayPokemonEffect && effect.pokemonCard === source) {
    const cardList = effect.target;
    const previousPokemon = cardList.getPokemonCard();

    if (previousPokemon) {
      source.weakness = [...previousPokemon.weakness];
      source.resistance = [...previousPokemon.resistance];
      source.retreat = [...previousPokemon.retreat];
    }
  }

  // Attacks
  if (effect instanceof CheckTableStateEffect) {
    const player = effect.player;
    const cardList = StateUtils.findCardList(state, source);
    const owner = StateUtils.findOwner(state, cardList);

    if (owner !== player) {
      return state;
    }

    let isThisInPlay = false;
    owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
      if (card === source) {
        isThisInPlay = true;
        player.showAllStageAbilities = true;
      }
    });

    if (!isThisInPlay) {
      return state;
    }
  }

  if (effect instanceof CheckPokemonAttacksEffect) {
    const player = effect.player;
    const cardList = StateUtils.findCardList(state, source);
    const owner = StateUtils.findOwner(state, cardList);

    if (owner !== player) {
      return state;
    }

    let isThisInPlay = false;
    owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
      if (card === source) {
        isThisInPlay = true;
      }
    });

    if (!isThisInPlay) {
      return state;
    }

    // Add attacks from the previous stage to this one
    for (const evolutionCard of cardList.cards) {
      if (
        evolutionCard.superType === SuperType.POKEMON &&
        evolutionCard !== source &&
        evolutionCard.name === source.evolvesFrom
      ) {
        // Create a deep copy of each attack to ensure we don't modify the original
        const inheritedAttacks = evolutionCard.attacks.map((attack) => ({
          name: attack.name,
          cost: [...attack.cost],
          damage: attack.damage,
          text: attack.text,
        }));
        effect.attacks.push(...inheritedAttacks);
      }
    }
  }

  // Abilities
  if (effect instanceof CheckPokemonPowersEffect) {
    const player = effect.player;
    const cardList = StateUtils.findCardList(state, source);
    const owner = StateUtils.findOwner(state, cardList);

    if (owner !== player) {
      return state;
    }

    let isThisInPlay = false;
    owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
      if (card === source) {
        isThisInPlay = true;
      }
    });

    if (!isThisInPlay) {
      return state;
    }

    // Add this card's own powers
    effect.powers.push(...source.powers);

    // Adds the powers from the previous stage
    for (const evolutionCard of cardList.cards) {
      if (
        evolutionCard.superType === SuperType.POKEMON &&
        evolutionCard !== source &&
        evolutionCard.name === source.evolvesFrom
      ) {
        effect.powers.push(...(evolutionCard.powers || []));
      }
    }
  }
  return state;
}

//#endregion

//#region Markers

// export function REMOVE_TOOL(store: StoreLike, state: State, source: PokemonCardList, tool: Card, destinationSlot: SlotType): State {
//   if (!source.cards.includes(tool)) {
//     return state;
//   }
//   const owner = StateUtils.findOwner(state, source);
//   state = MOVE_CARDS(store, state, source, owner.getSlot(destinationSlot), { cards: [tool] });
//   source.removeTool(tool);
//   return state;
// }

// export function REMOVE_TOOLS_FROM_POKEMON_PROMPT(store: StoreLike, state: State, player: Player, target: PokemonCardList, destinationSlot: SlotType, min: number, max: number): State {
//   if (target.tools.length === 0) {
//     return state;
//   }
//   if (target.tools.length === 1) {
//     return REMOVE_TOOL(store, state, target, target.tools[0], destinationSlot);
//   } else {
//     const blocked: number[] = [];
//     target.cards.forEach((card, index) => {
//       if (!target.tools.includes(card)) {
//         blocked.push(index);
//       }
//     });
//     let tools: Card[] = [];
//     return store.prompt(state, new ChooseCardsPrompt(
//       player,
//       GameMessage.CHOOSE_CARD_TO_DISCARD,
//       target,
//       {},
//       { min, max, allowCancel: false, blocked }
//     ), selected => {
//       tools = selected || [];
//       for (const tool of tools) {
//         return REMOVE_TOOL(store, state, target, tool, destinationSlot);
//       }
//     });
//   }
// }

// export function CHOOSE_TOOLS_TO_REMOVE_PROMPT(store: StoreLike, state: State, player: Player, playerType: PlayerType, destinationSlot: SlotType, min: number, max: number): State {
//   const opponent = StateUtils.getOpponent(state, player);

//   let hasPokemonWithTool = false;
//   let players: Player[] = [];
//   switch (playerType) {
//     case PlayerType.TOP_PLAYER:
//       players = [opponent];
//       break;
//     case PlayerType.BOTTOM_PLAYER:
//       players = [player];
//       break;
//     case PlayerType.ANY:
//       players = [player, opponent];
//       break;
//   }
//   const blocked: CardTarget[] = [];

//   for (const p of players) {
//     let pt: PlayerType = PlayerType.BOTTOM_PLAYER;
//     if (p === opponent) {
//       pt = PlayerType.TOP_PLAYER;
//     }
//     p.forEachPokemon(pt, (cardList, card, target) => {
//       if (cardList.tools.length > 0) {
//         hasPokemonWithTool = true;
//       } else {
//         blocked.push(target);
//       }
//     });
//   }

//   if (!hasPokemonWithTool) {
//     return state;
//   }

//   let targets: PokemonCardList[] = [];
//   return store.prompt(state, new ChoosePokemonPrompt(
//     player.id,
//     GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
//     playerType,
//     [SlotType.ACTIVE, SlotType.BENCH],
//     { min, max, allowCancel: false, blocked }
//   ), results => {
//     targets = results || [];
//     if (targets.length === 0) {
//       return state;
//     }
//     let toolsRemoved = 0;
//     for (const target of targets) {
//       if (target.tools.length === 0 || toolsRemoved >= max) {
//         continue;
//       }
//       if (target.tools.length === 1) {
//         REMOVE_TOOL(store, state, target, target.tools[0], destinationSlot);
//         toolsRemoved += 1;
//       } else {
//         const blocked: number[] = [];
//         target.cards.forEach((card, index) => {
//           if (!target.tools.includes(card)) {
//             blocked.push(index);
//           }
//         });
//         let tools: Card[] = [];
//         return store.prompt(state, new ChooseCardsPrompt(
//           player,
//           GameMessage.CHOOSE_CARD_TO_DISCARD,
//           target,
//           {},
//           { min: Math.min(min, max - toolsRemoved), max: max - toolsRemoved, allowCancel: false, blocked }
//         ), selected => {
//           tools = selected || [];
//           for (const tool of tools) {
//             REMOVE_TOOL(store, state, target, tool, destinationSlot);
//             toolsRemoved += 1;
//           }
//         });
//       }
//     }
//   });
