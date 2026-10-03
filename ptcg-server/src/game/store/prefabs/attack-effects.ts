import { Card, CardTarget, ChooseCardsPrompt, ChooseEnergyPrompt, ChoosePokemonPrompt, ConfirmPrompt, DamageMap, GameMessage, MoveEnergyPrompt, PlayerType, PutDamagePrompt, ShuffleDeckPrompt, SlotType, State, StateUtils, StoreLike } from '../..';
import { CardType, SpecialCondition, SuperType, TrainerType } from '../card/card-types';
import { EnergyCard } from '../card/energy-card';
import { PokemonCard } from '../card/pokemon-card';
import { AddSpecialConditionsEffect, AfterDamageEffect, ApplyWeaknessEffect, CardsToHandEffect, DealDamageEffect, DiscardCardsEffect, DiscardCardsFromOpponentsActivePokemonEffect, DiscardDefendingPokemonEffect, HealTargetEffect, KnockOutOpponentEffect, KnockOutPlayerEffect, MoveOpponentEnergyEffect, PutCountersEffect, PutDamageEffect } from '../effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../effects/check-effects';
import { AttackEffect } from '../effects/game-effects';
import { AfterAttackEffect, BeforeDoingDamageEffect, EndTurnEffect } from '../effects/game-phase-effects';
import { Effect } from '../effects/effect';
import { PokemonCardList } from '../state/pokemon-card-list';
import { AttachEnergyEffect } from '../effects/play-card-effects';
import { PendingEndOfTurnEffect, PendingEndOfTurnEffectBase } from '../state/pending-end-of-turn-effects';
import { Player } from '../state/player';
import { FLIP_UNTIL_TAILS_AND_COUNT_HEADS, MOVE_POKEMON_OFF_BOARD, ADD_MARKER, HAS_MARKER, REMOVE_MARKER } from './prefabs';
import { CoinFlipEffect } from '../effects/play-card-effects';
import { scheduleDefendingPokemonEndOfTurnEffect, nextTurnAttackDamageBonusEffect, armNextTurnAttackDamageBonus, nextTurnAttackBaseDamageEffect } from '../effects/effect-of-attack-effects';
import { GameError } from '../../game-error';
import { CardTag } from '../card/card-types';
import { Attack } from '../card/pokemon-types';
import { ChooseAttackPrompt } from '../prompts/choose-attack-prompt';
import { runDelegatedCopiedAttackGenerator } from './copy-attack-delegation';
import { blockCannotUseAttacksNextTurn } from './copy-attack-prefabs';

export {
  cloneAttack,
  cloneAttacks,
  findAttackIndex,
  withTemporaryDelegatedAttacks,
  runDelegatedCopiedAttack,
  runDelegatedCopiedAttackGenerator,
} from './copy-attack-delegation';
export type { DelegatedCopiedAttackContext } from './copy-attack-delegation';
export {
  COPY_ATTACK_FROM_POKEMON_LIST,
  COPY_OPPONENT_ACTIVE_AND_BENCH_ATTACK,
  COPY_OPPONENT_ACTIVE_ATTACK_WITH_RETRY,
  COPY_BENCH_ATTACK_FROM_LIST,
  COPY_ATTACK_VIA_ABILITY,
  buildAttackListWithEnergyBlocking,
  findPokemonCardForAttack,
} from './copy-attack-prefabs';
export type {
  CopyAttackFromListOptions,
  CopyOpponentActiveAndBenchOptions,
  CopyBenchAttackViaListOptions,
  BuildAttackListOptions,
  CopyAttackViaAbilityOptions,
} from './copy-attack-prefabs';


// =============================================================================
// Draw / heal / stadium
// =============================================================================

/**
 * These prefabs are for general attack effects.
 */

/** Canonical definition lives in prefabs.ts (general-use). */
export { DISCARD_A_STADIUM_CARD_IN_PLAY } from './prefabs';

export function DRAW_CARDS_UNTIL_YOU_HAVE_X_CARDS_IN_HAND(
  x: number,
  effect: AttackEffect,
  state: State
) {
  const player = effect.player;

  const cardsToDraw = x - player.hand.cards.length;
  if (cardsToDraw <= 0) {
    return state;
  }

  player.deck.moveTo(player.hand, cardsToDraw);
}

export function HEAL_X_DAMAGE_FROM_THIS_POKEMON(
  damage: number,
  effect: AttackEffect,
  store: StoreLike,
  state: State
) {
  const player = effect.player;
  const healTargetEffect = new HealTargetEffect(effect, damage);
  healTargetEffect.target = player.active;
  state = store.reduceEffect(state, healTargetEffect);
}

export function PUT_X_CARDS_FROM_YOUR_DISCARD_PILE_INTO_YOUR_HAND(
  x: number,
  filterFn: (card: Card) => boolean = () => true,
  store: StoreLike,
  state: State,
  effect: AttackEffect
) {
  const player = effect.player;

  const cardCount = player.discard.cards.filter(filterFn).length;

  if (cardCount === 0) {
    return state;
  }

  const max = Math.min(x, cardCount);
  const min = max;

  return store.prompt(state, [
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      // TODO: Make this work for more than just Items!
      player.discard,
      { superType: SuperType.TRAINER, trainerType: TrainerType.ITEM },
      { min, max, allowCancel: false }
    )], selected => {
      const cards = selected || [];
      player.discard.moveCardsTo(cards, player.hand);
    });
}

// =============================================================================
// Knock out / discard Pokémon
// =============================================================================

export function KNOCK_OUT_OPPONENTS_ACTIVE_POKEMON(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  target?: PokemonCardList,
): State {
  const knockOutEffect = new KnockOutOpponentEffect(effect);
  knockOutEffect.target = target ?? effect.opponent.active;
  return store.reduceEffect(state, knockOutEffect);
}

/**
 * Knock Out your Active Pokémon (or another of your Pokémon via target).
 * Your opponent takes the Prize cards. Blockable by effects like Mist Energy.
 */
export function KNOCK_OUT_PLAYERS_ACTIVE_POKEMON(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  target?: PokemonCardList,
): State {
  const knockOutEffect = new KnockOutPlayerEffect(effect);
  knockOutEffect.target = target ?? effect.player.active;
  return store.reduceEffect(state, knockOutEffect);
}

/**
 * Discard the opponent's Active Pokémon and all cards attached to it.
 * Not a KO — no prizes are taken. Blockable by effects like Mist Energy.
 */
export function DISCARD_OPPONENTS_ACTIVE_POKEMON(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  target?: PokemonCardList,
): State {
  const discardEffect = new DiscardDefendingPokemonEffect(effect);
  discardEffect.target = target ?? effect.opponent.active;
  return store.reduceEffect(state, discardEffect);
}

// =============================================================================
// End-of-turn schedules
// =============================================================================

/**
 * "At the end of your opponent's next turn, the Defending Pokémon will be Knocked Out."
 * Schedules a blockable KnockOutOpponentEffect to resolve when that turn ends.
 * Arming is an EffectOfAttack (Mist Energy can prevent it).
 */
export function KNOCK_OUT_DEFENDING_POKEMON_AT_END_OF_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: PokemonCard,
  target?: PokemonCardList,
): State {
  return store.reduceEffect(
    state,
    scheduleDefendingPokemonEndOfTurnEffect(effect, source, { type: 'knock_out' }, target),
  );
}

/**
 * "At the end of your opponent's next turn, discard the Defending Pokémon and all cards attached to it."
 * Not a KO — no prizes are taken.
 */
export function DISCARD_DEFENDING_POKEMON_AT_END_OF_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: PokemonCard,
  target?: PokemonCardList,
): State {
  return store.reduceEffect(
    state,
    scheduleDefendingPokemonEndOfTurnEffect(effect, source, { type: 'discard' }, target),
  );
}

/**
 * "Put X damage counters on the Defending Pokémon at the end of your opponent's next turn."
 * Damage is specified in counter units (10 per counter).
 */
export function PUT_DAMAGE_COUNTERS_ON_DEFENDING_POKEMON_AT_END_OF_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: PokemonCard,
  damage: number,
  target?: PokemonCardList,
): State {
  return store.reduceEffect(
    state,
    scheduleDefendingPokemonEndOfTurnEffect(
      effect, source, { type: 'damage_counters', damage }, target,
    ),
  );
}

/**
 * "At the end of your opponent's next turn, the Defending Pokémon is now [condition]."
 */
export function APPLY_SPECIAL_CONDITION_TO_DEFENDING_POKEMON_AT_END_OF_OPPONENTS_NEXT_TURN(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  source: PokemonCard,
  specialCondition: SpecialCondition,
  target?: PokemonCardList,
): State {
  return store.reduceEffect(
    state,
    scheduleDefendingPokemonEndOfTurnEffect(
      effect, source, { type: 'special_condition', specialCondition }, target,
    ),
  );
}

// =============================================================================
// Pending effect resolvers
// =============================================================================

function buildAttackEffectFromSource(
  state: State,
  defendingPlayer: Player,
  item: Pick<PendingEndOfTurnEffectBase, 'attack' | 'sourceCard' | 'attackerPlayerId'>,
): AttackEffect | null {
  const attacker = state.players.find(p => p.id === item.attackerPlayerId);
  if (!attacker) {
    return null;
  }

  let sourceList = attacker.active;
  attacker.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
    if (card === item.sourceCard) {
      sourceList = cardList;
    }
  });

  const attackEffect = new AttackEffect(attacker, defendingPlayer, item.attack);
  attackEffect.source = sourceList;
  return attackEffect;
}

function buildAttackEffectFromPending(
  state: State,
  defendingPlayer: Player,
  item: PendingEndOfTurnEffect,
): AttackEffect | null {
  return buildAttackEffectFromSource(state, defendingPlayer, item);
}

/**
 * Places pending damage counters on the Defending Pokémon when Energy is attached from hand.
 */
export function RESOLVE_PENDING_ENERGY_ATTACH_DAMAGE_COUNTERS(
  store: StoreLike,
  state: State,
  attachEffect: AttachEnergyEffect,
): State {
  const pending = attachEffect.target.pendingEnergyAttachDamageCounters;
  if (!pending) {
    return state;
  }
  if (!attachEffect.player.hand.cards.includes(attachEffect.energyCard)) {
    return state;
  }

  const attackEffect = buildAttackEffectFromSource(state, attachEffect.player, pending);
  if (!attackEffect) {
    return state;
  }

  const putCounters = new PutCountersEffect(attackEffect, pending.damage);
  putCounters.target = attachEffect.target;
  return store.reduceEffect(state, putCounters);
}

/**
 * Resolves pending end-of-turn effects for the player whose turn just ended.
 * Called automatically from the EndTurnEffect reducer.
 */
export function RESOLVE_PENDING_END_OF_OPPONENTS_NEXT_TURN_EFFECTS(
  store: StoreLike,
  state: State,
  effect: Effect,
): State {
  if (!(effect instanceof EndTurnEffect)) {
    return state;
  }

  const pending = effect.player.pendingEndOfTurnEffects.splice(0);
  for (const item of pending) {
    if (!item.target.getPokemonCard()) {
      continue;
    }

    const attackEffect = buildAttackEffectFromPending(state, effect.player, item);
    if (!attackEffect) {
      continue;
    }

    switch (item.type) {
      case 'knock_out': {
        const ko = new KnockOutOpponentEffect(attackEffect);
        ko.target = item.target;
        state = store.reduceEffect(state, ko);
        break;
      }
      case 'discard': {
        const discard = new DiscardDefendingPokemonEffect(attackEffect);
        discard.target = item.target;
        state = store.reduceEffect(state, discard);
        break;
      }
      case 'damage_counters': {
        const putCounters = new PutCountersEffect(attackEffect, item.damage);
        putCounters.target = item.target;
        state = store.reduceEffect(state, putCounters);
        break;
      }
      case 'special_condition': {
        const sc = new AddSpecialConditionsEffect(attackEffect, [item.specialCondition]);
        sc.target = item.target;
        state = store.reduceEffect(state, sc);
        break;
      }
    }
  }

  return state;
}

/** @deprecated Use RESOLVE_PENDING_END_OF_OPPONENTS_NEXT_TURN_EFFECTS */
export const RESOLVE_PENDING_END_OF_OPPONENTS_NEXT_TURN_KNOCK_OUTS =
  RESOLVE_PENDING_END_OF_OPPONENTS_NEXT_TURN_EFFECTS;

// =============================================================================
// Damage counters
// =============================================================================

export function PUT_X_DAMAGE_COUNTERS_ON_ALL_YOUR_OPPONENTS_POKEMON(
  x: number,
  store: StoreLike,
  state: State,
  effect: AttackEffect
) {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const activeDamageEffect = new PutCountersEffect(effect, 10 * x);
  activeDamageEffect.target = opponent.active;
  store.reduceEffect(state, activeDamageEffect);

  opponent.bench.forEach((bench, index) => {
    if (bench.cards.length > 0) {
      const damageEffect = new PutCountersEffect(effect, 10 * x);
      damageEffect.target = bench;
      store.reduceEffect(state, damageEffect);
    }
  });
}

export function PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON(
  x: number,
  store: StoreLike,
  state: State,
  effect: AttackEffect
) {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const putCounters = new PutCountersEffect(effect, 10 * x);
  putCounters.target = opponent.active;
  return store.reduceEffect(state, putCounters);
}

export function PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE(
  x: number,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  slotTypes: SlotType[] = [SlotType.ACTIVE, SlotType.BENCH]
) {
  const player = effect.player;
  const opponent = effect.opponent;

  const hasBenched = opponent.bench.some(b => b.cards.length > 0);
  if (!hasBenched && !slotTypes.includes(SlotType.ACTIVE)) {
    return state;
  }

  const maxAllowedDamage: DamageMap[] = [];
  opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
    maxAllowedDamage.push({ target, damage: 9999 });
  });

  return store.prompt(state, new PutDamagePrompt(
    effect.player.id,
    GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
    PlayerType.TOP_PLAYER,
    slotTypes,
    10 * x,
    maxAllowedDamage,
    { allowCancel: false }
  ), targets => {
    const results = targets || [];
    for (const result of results) {
      const target = StateUtils.getTarget(state, player, result.target);
      const putCountersEffect = new PutCountersEffect(effect, result.damage);
      putCountersEffect.target = target;
      store.reduceEffect(state, putCountersEffect);
    }
  });
}

// =============================================================================
// Return Pokémon to deck / hand
// =============================================================================

export function SHUFFLE_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_DECK(
  store: StoreLike,
  state: State,
  effect: AfterAttackEffect) {
  const player = effect.player;

  state = MOVE_POKEMON_OFF_BOARD(store, state, player.active, {
    pokemonDestination: player.deck,
  });

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export function PUT_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_HAND(
  store: StoreLike,
  state: State,
  effect: AfterAttackEffect) {
  const player = effect.player;

  return MOVE_POKEMON_OFF_BOARD(store, state, player.active, {
    pokemonDestination: player.hand,
  });
}

// =============================================================================
// Coin flip damage
// =============================================================================

export function FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  amount: number
): State {
  const coinFlip = new CoinFlipEffect(effect.player, (result: boolean) => {
    if (result) {
      effect.damage += amount;
    }
  });
  return store.reduceEffect(state, coinFlip);
}

export function FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_DAMAGE_PER_HEADS(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  damagePerHeads: number
): State {
  return FLIP_UNTIL_TAILS_AND_COUNT_HEADS(store, state, effect.player, heads => {
    effect.damage = damagePerHeads * heads;
  });
}

export function FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_MORE_DAMAGE_PER_HEADS(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  damagePerHeads: number
): State {
  return FLIP_UNTIL_TAILS_AND_COUNT_HEADS(store, state, effect.player, heads => {
    effect.damage += damagePerHeads * heads;
  });
}

// =============================================================================
// Damage calculation & targeting
// =============================================================================

export function THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  amount: number,
) {

  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const applyWeakness = new ApplyWeaknessEffect(effect, effect.damage);
  store.reduceEffect(state, applyWeakness);
  const damage = applyWeakness.damage;

  effect.damage = 0;

  if (damage > 0) {
    opponent.active.damage += damage;
    const afterDamage = new AfterDamageEffect(effect, damage);
    state = store.reduceEffect(state, afterDamage);
  }
}

export function THIS_ATTACK_DOES_X_DAMAGE_FOR_EACH_POKEMON_IN_YOUR_DISCARD_PILE(
  damage: number,
  filterFn: (card: PokemonCard) => boolean = () => true,
  effect: AttackEffect
) {
  const player = effect.player;

  let pokemonCount = 0;
  player.discard.cards.forEach(c => {
    if (c instanceof PokemonCard && filterFn(c)) {
      pokemonCount += 1;
    }
  });

  effect.damage = pokemonCount * damage;
}

export function THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(
  damage: number,
  effect: AttackEffect,
  store: StoreLike,
  state: State
) {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const targets = opponent.getPokemonInPlay();
  if (targets.length === 0)
    return state;

  return store.prompt(state, new ChoosePokemonPrompt(
    player.id,
    GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
    PlayerType.TOP_PLAYER,
    [SlotType.BENCH, SlotType.ACTIVE],
  ), selected => {
    const target = selected[0];
    let damageEffect: DealDamageEffect | PutDamageEffect;
    if (target === opponent.active) {
      damageEffect = new DealDamageEffect(effect, damage);
    } else {
      damageEffect = new PutDamageEffect(effect, damage);
    }
    damageEffect.target = target;
    store.reduceEffect(state, damageEffect);
  });
}

export function THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(
  damage: number,
  effect: AttackEffect,
  store: StoreLike,
  state: State
) {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const targets = opponent.bench.filter(b => b.cards.length > 0);
  if (targets.length === 0) {
    return state;
  }

  return store.prompt(state, new ChoosePokemonPrompt(
    player.id,
    GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
    PlayerType.TOP_PLAYER,
    [SlotType.BENCH],
  ), selected => {
    const target = selected[0];
    const damageEffect = new PutDamageEffect(effect, damage);
    damageEffect.target = target;
    store.reduceEffect(state, damageEffect);
  });
}

// =============================================================================
// Special conditions
// =============================================================================

export function YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(
  store: StoreLike,
  state: State,
  effect: AttackEffect
) {
  const specialConditionEffect = new AddSpecialConditionsEffect(
    effect, [SpecialCondition.ASLEEP]
  );
  store.reduceEffect(state, specialConditionEffect);

}

export function YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(
  store: StoreLike,
  state: State,
  effect: AttackEffect
) {
  const specialConditionEffect = new AddSpecialConditionsEffect(
    effect, [SpecialCondition.BURNED]
  );
  store.reduceEffect(state, specialConditionEffect);

}

export function YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(
  store: StoreLike,
  state: State,
  effect: AttackEffect
) {
  const specialConditionEffect = new AddSpecialConditionsEffect(
    effect, [SpecialCondition.CONFUSED]
  );
  store.reduceEffect(state, specialConditionEffect);

}

export function YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(
  store: StoreLike,
  state: State,
  effect: AttackEffect
) {
  const specialConditionEffect = new AddSpecialConditionsEffect(
    effect, [SpecialCondition.PARALYZED]
  );
  store.reduceEffect(state, specialConditionEffect);

}

export function YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(
  store: StoreLike,
  state: State,
  effect: AttackEffect
) {
  const specialConditionEffect = new AddSpecialConditionsEffect(
    effect, [SpecialCondition.POISONED]
  );
  store.reduceEffect(state, specialConditionEffect);

}

// =============================================================================
// Opponent energy discard / move
// =============================================================================

export function DISCARD_CARDS_FROM_OPPONENTS_ACTIVE_POKEMON(
  store: StoreLike,
  state: State,
  effect: BeforeDoingDamageEffect,
  cards: Card[]
): State {
  if (cards.length === 0) {
    return state;
  }

  const discardEffect = new DiscardCardsFromOpponentsActivePokemonEffect(effect.attackEffect, cards);
  return store.reduceEffect(state, discardEffect);
}

export function DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  allowedEnergyTypes?: CardType[],
  count = 1,
) {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  if (count <= 0) {
    return state;
  }

  const blocked: number[] = [];
  const energyCards = opponent.active.cards.filter((card, index) => {
    if (card.superType !== SuperType.ENERGY) {
      if (allowedEnergyTypes) blocked.push(index);
      return false;
    }
    if (!allowedEnergyTypes) return true;
    const energy = card as EnergyCard;
    const allowed = allowedEnergyTypes.some(type => energy.provides.includes(type));
    if (!allowed) blocked.push(index);
    return allowed;
  });
  if (energyCards.length === 0) {
    return state;
  }

  const cardsToDiscard = Math.min(count, energyCards.length);
  return store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_DISCARD,
    opponent.active,
    { superType: SuperType.ENERGY },
    { min: cardsToDiscard, max: cardsToDiscard, allowCancel: false, blocked }
  ), selected => {
    const cards = selected || [];
    if (cards.length > 0) {
      const discardEnergy = new DiscardCardsEffect(effect, cards);
      discardEnergy.target = opponent.active;
      store.reduceEffect(state, discardEnergy);
    }
  });
}

/**
 * You may put up to X Energy attached to your opponent's Active Pokémon into their hand.
 * Uses CardsToHandEffect (AbstractAttackEffect) so abilities like Charmeleon's Flare Veil can block it.
 */
export function PUT_ENERGY_FROM_OPPONENTS_ACTIVE_INTO_THEIR_HAND(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  options?: { count?: number }
): State {
  const count = options?.count ?? 1;
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const checkEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
  state = store.reduceEffect(state, checkEnergy);

  if (checkEnergy.energyMap.length === 0) {
    return state;
  }

  const cost = Array(count).fill(CardType.COLORLESS);

  return store.prompt(state, new ConfirmPrompt(
    player.id,
    GameMessage.WANT_TO_USE_ABILITY,
  ), wantToUse => {
    if (wantToUse) {
      const selectCount = Math.min(count, checkEnergy.energyMap.length);
      store.prompt(state, new ChooseEnergyPrompt(
        player.id,
        GameMessage.CHOOSE_ENERGIES_TO_HAND,
        checkEnergy.energyMap,
        cost.slice(0, selectCount),
        { allowCancel: false }
      ), energy => {
        const cards = (energy || []).slice(0, selectCount).map(e => e.card);
        if (cards.length > 0) {
          const toHandEffect = new CardsToHandEffect(effect, cards);
          toHandEffect.target = opponent.active;
          store.reduceEffect(state, toHandEffect);
        }
      });
    }
  });
}

export interface MoveOpponentEnergyOptions {
  min?: number;
  max?: number;
  allowCancel?: boolean;
  blockedFrom?: CardTarget[];
  blockedTo?: CardTarget[];
}

/**
 * Move an Energy from 1 of your opponent's Pokémon to another of their Pokémon.
 * Uses MoveOpponentEnergyEffect (AbstractAttackEffect) so abilities like Charmeleon's Flare Veil can block it.
 */
export function MOVE_AN_ENERGY_FROM_OPPONENTS_POKEMON_TO_ANOTHER(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  options?: MoveOpponentEnergyOptions
): State {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  let hasEnergy = false;
  let pokemonCount = 0;

  opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
    pokemonCount += 1;
    const energyAttached = cardList.cards.some(c => c instanceof EnergyCard);
    hasEnergy = hasEnergy || energyAttached;
  });

  if (!hasEnergy || pokemonCount <= 1) {
    return state;
  }

  const min = options?.min ?? 1;
  const max = options?.max ?? 1;
  const allowCancel = options?.allowCancel ?? false;
  const blockedFrom = options?.blockedFrom ?? [];
  const blockedTo = options?.blockedTo ?? [];

  return store.prompt(state, new MoveEnergyPrompt(
    player.id,
    GameMessage.MOVE_ENERGY_CARDS,
    PlayerType.TOP_PLAYER,
    [SlotType.ACTIVE, SlotType.BENCH],
    { superType: SuperType.ENERGY },
    { min, max, allowCancel, blockedFrom, blockedTo }
  ), result => {
    const transfers = result || [];
    transfers.forEach(transfer => {
      const source = StateUtils.getTarget(state, player, transfer.from);
      const destination = StateUtils.getTarget(state, player, transfer.to);
      const moveEffect = new MoveOpponentEnergyEffect(effect, transfer.card, source, destination);
      store.reduceEffect(state, moveEffect);
    });
  });
}

// =============================================================================
// Next-turn attack bonuses / copy attacks
// =============================================================================

export interface NextTurnAttackBonusOptions {
  /** Attack that receives the bonus next turn. */
  attack: Attack;
  source: Card;
  bonusDamage: number;
  /**
   * Attack that arms the bonus. Defaults to `attack` (Echoed Voice style).
   * Use a different setup attack for Hone Claws → Slash patterns.
   */
  setupAttack?: Attack;
  bonusMarker?: string;
  clearMarker?: string;
}

/**
 * Standard lifecycle for:
 * "During your next turn, this Pokemon's [Attack Name] attack does [N] more damage."
 *
 * Call unconditionally from reduceEffect. Applies any active bonus for `attack`,
 * and arms on `setupAttack` (or `attack` when omitted).
 */
export function NEXT_TURN_ATTACK_BONUS(effect: Effect, options: NextTurnAttackBonusOptions): void {
  if (!(effect instanceof AttackEffect)) {
    return;
  }
  // Guard against other copies of the same card in either deck applying the bonus.
  if (options.source instanceof PokemonCard && effect.source.getPokemonCard() !== options.source) {
    return;
  }

  nextTurnAttackDamageBonusEffect(
    effect,
    options.attack.name,
    options.bonusDamage,
    options.source instanceof PokemonCard ? options.source.fullName : undefined,
    options.setupAttack?.name,
  );
}

/**
 * "During your next turn, this Pokemon's attacks do [N] more damage."
 * Call unconditionally from reduceEffect with the setup attack that arms the bonus.
 */
export function NEXT_TURN_ATTACK_BONUS_ALL_ATTACKS(
  effect: Effect,
  options: { source: Card; bonusDamage: number; setupAttack: Attack },
): void {
  if (!(effect instanceof AttackEffect)) {
    return;
  }
  // Guard against other copies of the same card in either deck applying the bonus.
  if (options.source instanceof PokemonCard && effect.source.getPokemonCard() !== options.source) {
    return;
  }

  nextTurnAttackDamageBonusEffect(
    effect,
    '*',
    options.bonusDamage,
    options.source instanceof PokemonCard ? options.source.fullName : undefined,
    options.setupAttack.name,
  );
}

export function ARM_NEXT_TURN_ATTACK_BONUS_ALL_ATTACKS(
  source: PokemonCardList,
  sourceCard: PokemonCard,
  bonusDamage: number,
): void {
  armNextTurnAttackDamageBonus(source, '*', bonusDamage, sourceCard.fullName);
}

export interface NextTurnAttackBaseDamageOptions {
  setupAttack: Attack;
  boostedAttack: Attack;
  source: Card;
  baseDamage: number;
  bonusMarker: string;
  clearMarker: string;
}

/**
 * Standard marker lifecycle for:
 * "During your next turn, this Pokemon's [Attack Name] attack's base damage is [N]."
 *
 * `setupAttack` is the attack that applies the marker and `boostedAttack` is the attack
 * whose base damage is overridden during the next turn.
 */
export function NEXT_TURN_ATTACK_BASE_DAMAGE(
  effect: Effect,
  options: NextTurnAttackBaseDamageOptions,
): void {
  const { setupAttack, boostedAttack, source, baseDamage, bonusMarker, clearMarker } = options;

  if (effect instanceof AttackEffect) {
    // Guard against copied attacks: only apply when this source card is the attacker.
    if (source instanceof PokemonCard && effect.source.getPokemonCard() !== source) {
      return;
    }

    if (effect.attack === boostedAttack && HAS_MARKER(bonusMarker, effect.player, source)) {
      effect.damage = baseDamage;
    }

    if (effect.attack === setupAttack) {
      REMOVE_MARKER(clearMarker, effect.player, source);
      ADD_MARKER(bonusMarker, effect.player, source);
    }
  }

  if (effect instanceof EndTurnEffect && HAS_MARKER(bonusMarker, effect.player, source)) {
    if (HAS_MARKER(clearMarker, effect.player, source)) {
      REMOVE_MARKER(bonusMarker, effect.player, source);
      REMOVE_MARKER(clearMarker, effect.player, source);
    } else {
      ADD_MARKER(clearMarker, effect.player, source);
    }
  }
}

export function NEXT_TURN_ATTACK_BASE_DAMAGE_EFFECT(
  effect: Effect,
  options: {
    setupAttack: Attack;
    boostedAttack: Attack;
    source: Card;
    baseDamage: number;
  },
): void {
  nextTurnAttackBaseDamageEffect(
    effect,
    options.setupAttack.name,
    options.boostedAttack.name,
    options.baseDamage,
    options.source instanceof PokemonCard ? options.source.fullName : undefined,
  );
}

export interface CopyBenchAttackOptions {
  allowCancel?: boolean;
  throwIfNoBenchedPokemon?: boolean;
  disallowCopycatAttack?: boolean;
}

function* copyBenchAttackGenerator(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  options: CopyBenchAttackOptions,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  const {
    allowCancel = false,
    throwIfNoBenchedPokemon = true,
    disallowCopycatAttack = true,
  } = options;

  const hasBenchedPokemon = player.bench.some((b) => b.cards.length > 0);
  if (!hasBenchedPokemon) {
    if (throwIfNoBenchedPokemon) {
      throw new GameError(GameMessage.CANNOT_USE_ATTACK);
    }
    return state;
  }

  let targets: PokemonCardList[] = [];
  yield store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.BENCH],
      { allowCancel },
    ),
    (results) => {
      targets = results || [];
      next();
    },
  );

  if (targets.length === 0) {
    return state;
  }

  const benchedPokemon = targets[0];
  const benchedCard = benchedPokemon.getPokemonCard();
  if (benchedCard === undefined || benchedCard.attacks.length === 0) {
    return state;
  }

  let selected: Attack | null = null;
  yield store.prompt(
    state,
    new ChooseAttackPrompt(player.id, GameMessage.CHOOSE_ATTACK_TO_COPY, [benchedCard], {
      allowCancel,
      blocked: blockCannotUseAttacksNextTurn(player, [benchedCard]),
    }),
    (result) => {
      selected = result;
      next();
    },
  );

  const copiedAttack = selected as Attack | null;
  if (copiedAttack === null) {
    return state;
  }

  if ((player.active.cannotUseAttacksNextTurn || []).includes(copiedAttack.name)) {
    return state;
  }

  if (disallowCopycatAttack && copiedAttack.copycatAttack === true) {
    return state;
  }

  const copycatCard = effect.source.getPokemonCard();
  if (copycatCard === undefined) {
    return state;
  }

  return yield* runDelegatedCopiedAttackGenerator(next, {
    store,
    state,
    player,
    opponent,
    copycatCard,
    sourceCard: benchedCard,
    selectedAttack: copiedAttack,
    sourceSlot: effect.source,
  });
}

/**
 * Generic implementation for:
 * "Choose 1 of your Benched Pokemon's attacks and use it as this attack."
 *
 * Call this inside your WAS_ATTACK_USED(...) block (optionally coin-gated).
 */
export function COPY_BENCH_ATTACK(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  options: CopyBenchAttackOptions = {},
): State {
  const generator = copyBenchAttackGenerator(() => generator.next(), store, state, effect, options);
  return generator.next().value;
}

/**
 * "Choose 1 of your opponent's Active Pokemon's attacks and use it as this attack."
 * Used by: Zoroark (Foul Play), Krookodile (Foul Play), Mew ex (Genome Hacking), etc.
 */
export interface CopyOpponentActiveAttackOptions {
  allowCancel?: boolean;
  disallowCopycatAttack?: boolean;
}

function* copyOpponentActiveAttackGenerator(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  options: CopyOpponentActiveAttackOptions = {},
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  const { allowCancel = false, disallowCopycatAttack = true } = options;
  const pokemonCard = opponent.active.getPokemonCard();

  if (pokemonCard === undefined || pokemonCard.attacks.length === 0) {
    return state;
  }

  let selected: any;
  yield store.prompt(
    state,
    new ChooseAttackPrompt(player.id, GameMessage.CHOOSE_ATTACK_TO_COPY, [pokemonCard], {
      allowCancel,
      blocked: blockCannotUseAttacksNextTurn(player, [pokemonCard]),
    }),
    (result) => {
      selected = result;
      next();
    },
  );

  const attack: Attack | null = selected;

  if (attack === null || (disallowCopycatAttack && attack.copycatAttack === true)) {
    return state;
  }

  if ((player.active.cannotUseAttacksNextTurn || []).includes(attack.name)) {
    return state;
  }

  const copycatCard = effect.source.getPokemonCard();
  if (copycatCard === undefined) {
    return state;
  }

  return yield* runDelegatedCopiedAttackGenerator(next, {
    store,
    state,
    player,
    opponent,
    copycatCard,
    sourceCard: pokemonCard,
    selectedAttack: attack,
    sourceSlot: effect.source,
  });
}

export function COPY_OPPONENT_ACTIVE_ATTACK(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
  options: CopyOpponentActiveAttackOptions = {},
): State {
  const generator = copyOpponentActiveAttackGenerator(
    () => generator.next(), store, state, effect, options,
  );
  return generator.next().value;
}

/**
 * "If your opponent's Pokemon used an attack during their last turn, use it as this attack."
 * Used by: Mimikyu (Copycat), Sudowoodo (Watch and Learn), etc.
 */
function* copyOpponentsLastAttackGenerator(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const lastAttackInfo = state.playerLastAttack[opponent.id];

  if (!lastAttackInfo) {
    return state;
  }

  const { attack: lastAttack, sourceCard } = lastAttackInfo;

  if (lastAttack.copycatAttack === true || lastAttack.gxAttack === true) {
    return state;
  }

  const copycatCard = effect.source.getPokemonCard();
  if (copycatCard === undefined) {
    return state;
  }

  return yield* runDelegatedCopiedAttackGenerator(next, {
    store,
    state,
    player,
    opponent,
    copycatCard,
    sourceCard,
    selectedAttack: lastAttack,
    sourceSlot: effect.source,
  });
}

export function COPY_OPPONENTS_LAST_ATTACK(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): State {
  const generator = copyOpponentsLastAttackGenerator(() => generator.next(), store, state, effect);
  return generator.next().value;
}

export function BOOST_IF_OTHER_ANCIENT_ATTACKED_LAST_TURN(
  state: State,
  effect: AttackEffect,
  source: PokemonCard,
  bonusDamage: number,
): void {
  const lastAttack = state.playerLastAttack?.[effect.player.id];
  if (effect.player.ancientPokemonAttackedLastTurn
    && lastAttack?.sourceCard !== source
    && lastAttack?.sourceCard.tags.includes(CardTag.ANCIENT)) {
    effect.damage += bonusDamage;
  }
}
