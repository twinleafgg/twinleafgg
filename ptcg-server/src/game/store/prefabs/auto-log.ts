import { GameLog, GameMessage } from '../../game-message';
import { Card } from '../card/card';
import { SpecialCondition } from '../card/card-types';
import { Effect } from '../effects/effect';
import {
  AddSpecialConditionsEffect,
  CardsToHandEffect,
  DealDamageEffect,
  DiscardCardsEffect,
  DiscardCardsFromOpponentsActivePokemonEffect,
  DiscardDefendingPokemonEffect,
  LostZoneCardsEffect,
  MoveOpponentEnergyEffect,
  PutCountersEffect,
  PutDamageEffect,
  RemoveSpecialConditionsEffect,
} from '../effects/attack-effects';
import { TrainerTargetEffect } from '../effects/play-card-effects';
import {
  HealEffect,
  KnockOutEffect,
  PlaceDamageCountersEffect,
  PutDamageCountersEffect,
} from '../effects/game-effects';
import { AddSpecialConditionsPowerEffect } from '../effects/check-effects';
import { AlertPrompt } from '../prompts/alert-prompt';
import { AttachEnergyPrompt } from '../prompts/attach-energy-prompt';
import { ChooseAttackPrompt } from '../prompts/choose-attack-prompt';
import { ChooseCardsPrompt } from '../prompts/choose-cards-prompt';
import { ChooseEnergyPrompt } from '../prompts/choose-energy-prompt';
import { ChoosePokemonPrompt } from '../prompts/choose-pokemon-prompt';
import { ChoosePrizePrompt } from '../prompts/choose-prize-prompt';
import { CoinFlipPrompt } from '../prompts/coin-flip-prompt';
import { ConfirmCardsPrompt } from '../prompts/confirm-cards-prompt';
import { ConfirmPrompt } from '../prompts/confirm-prompt';
import { DiscardEnergyPrompt } from '../prompts/discard-energy-prompt';
import { InvitePlayerPrompt } from '../prompts/invite-player-prompt';
import { MoveDamagePrompt } from '../prompts/move-damage-prompt';
import { MoveEnergyPrompt } from '../prompts/move-energy-prompt';
import { Prompt } from '../prompts/prompt';
import { PutDamagePrompt } from '../prompts/put-damage-prompt';
import { RemoveDamagePrompt } from '../prompts/remove-damage-prompt';
import { SelectOptionPrompt } from '../prompts/select-option-prompt';
import { SelectPrompt } from '../prompts/select-prompt';
import { ShowCardsPrompt } from '../prompts/show-cards-prompt';
import { ShowMulliganPrompt } from '../prompts/show-mulligan-prompt';
import { ShuffleDeckPrompt } from '../prompts/shuffle-prompt';
import { ShuffleHandPrompt } from '../prompts/shuffle-hand-prompt';
import { ShufflePrizesPrompt } from '../prompts/shuffle-prizes-prompt';
import { WaitPrompt } from '../prompts/wait-prompt';
import { CardTarget } from '../actions/play-card-action';
import { StateUtils } from '../state-utils';
import { CardList } from '../state/card-list';
import { PokemonCardList } from '../state/pokemon-card-list';
import { State } from '../state/state';
import { StoreLike } from '../store-like';
import { WAS_TRAINER_TARGET_BLOCKED } from './trainer-target';

const SKIPPED_EFFECT_TYPES = new Set([
  'CHECK_POKEMON_POWERS_EFFECT',
  'CHECK_POKEMON_ATTACKS_EFFECT',
  'CHECK_HP_EFFECT',
  'CHECK_POKEMON_PLAYED_TURN_EFFECT',
  'CHECK_POKEMON_STATS_EFFECT',
  'CHECK_POKEMON_TYPE_EFFECT',
  'CHECK_RETREAT_COST_EFFECT',
  'CHECK_ATTACK_COST_EFFECT',
  'CHECK_PROVIDED_ENERGY_EFFECT',
  'CHECK_TABLE_STATE_EFFECT',
  'CHECK_PRIZES_DESTINATION_EFFECT',
  'CHECK_SPECIAL_CONDITION_REMOVAL_EFFECT',
  'SPECIAL_ENERGY_EFFECT',
  'TOOL_EFFECT',
  'STADIUM_EFFECT',
  'EFFECT_OF_ABILITY_EFFECT',
  'COIN_FLIP_EFFECT',
  'COIN_FLIP_SEQUENCE_EFFECT',
  'ADD_MARKER_EFFECT',
  'AFTER_DAMAGE_EFFECT',
  'AFTER_WEAKNESS_AND_RESISTANCE_EFFECT',
  'APPLY_WEAKNESS_EFFECT',
  'AFTER_ATTACK_EFFECT',
  'BEFORE_DOING_DAMAGE_EFFECT',
  'BETWEEN_TURNS_EFFECT',
  'DREW_TOPDECK_EFFECT',
  'WHO_BEGINS_EFFECT',
  'POWER_EFFECT',
  'TRAINER_POWER_EFFECT',
  'TRAINER_TARGET_EFFECT',
]);

const ALREADY_LOGGED_ON_APPLY = new Set([
  'ATTACH_ENERGY_EFFECT',
  'PLAY_POKEMON_EFFECT',
  'PLAY_POKEMON_FROM_DECK_EFFECT',
  'PLAY_POKEMON_FROM_DISCARD_EFFECT',
  'PLAY_SUPPORTER_EFFECT',
  'PLAY_STADIUM_EFFECT',
  'PLAY_POKEMON_TOOL_EFFECT',
  'PLAY_ITEM_EFFECT',
  'DEAL_DAMAGE_EFFECT',
  'PUT_DAMAGE_EFFECT',
  'PUT_COUNTERS_EFFECT',
  'PLACE_DAMAGE_COUNTERS_EFFECT',
  'EVOLVE_EFFECT',
  'KNOCK_OUT_EFFECT',
  'RETREAT_EFFECT',
  'USE_ATTACK_EFFECT',
  'USE_POWER_EFFECT',
  'USE_STADIUM_EFFECT',
  'BEGIN_TURN_EFFECT',
  'END_TURN_EFFECT',
  'DRAW_CARD_FOR_TURN_EFFECT',
]);

type BlockableEffect = Effect & { blockedBy?: Card };

export function effectWasBlocked(effect: Effect): boolean {
  if (effect instanceof TrainerTargetEffect) {
    return WAS_TRAINER_TARGET_BLOCKED(effect);
  }
  return effect.preventDefault === true;
}

export function stampEffectBlocker(effect: Effect, card: Card, wasBlocked: boolean): void {
  if (wasBlocked || blockedBy(effect) != null || !effectWasBlocked(effect)) {
    return;
  }
  (effect as BlockableEffect).blockedBy = card;
}

function blockedBy(effect: Effect): Card | undefined {
  return (effect as BlockableEffect).blockedBy;
}

/** Log a resolved decision prompt. Acknowledgements, shuffles, and coin flips are skipped. */
export function logResolvedPrompt(store: StoreLike, state: State, prompt: Prompt<any>): void {
  if (prompt.result == null || isSilentPrompt(prompt)) {
    return;
  }

  const player = state.players.find(p => p.id === prompt.playerId);
  if (player == null) {
    return;
  }

  if (logChooseCardsOutcome(store, state, prompt, player.name)) {
    return;
  }
  if (logChoosePokemonOutcome(store, state, prompt, player.name)) {
    return;
  }

  const choice = describePromptResult(state, prompt);
  if (choice == null || choice.length === 0) {
    return;
  }

  store.log(state, GameLog.LOG_PLAYER_CHOOSES, {
    name: player.name,
    string: choice,
  });
}

/**
 * Choose-cards prompts already name the destination (hand, discard, deck).
 * Log that outcome here so cards do not each write the same line.
 */
function logChooseCardsOutcome(
  store: StoreLike,
  state: State,
  prompt: Prompt<any>,
  playerName: string,
): boolean {
  if (!(prompt instanceof ChooseCardsPrompt) || prompt.options.isSecret) {
    return false;
  }

  const cards = asArray(prompt.result).filter((card): card is Card => card instanceof Card && !!card.name);
  if (cards.length === 0) {
    return false;
  }

  const message = String(prompt.message);
  if (isToHandMessage(message)) {
    for (const card of cards) {
      store.log(state, GameLog.LOG_PLAYER_PUTS_CARD_IN_HAND, { name: playerName, card: card.name });
    }
    return true;
  }

  if (isDiscardMessage(message) && cardsAreInHand(state, prompt, cards)) {
    for (const card of cards) {
      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD_FROM_HAND, { name: playerName, card: card.name });
    }
    return true;
  }

  if (message === GameMessage.CHOOSE_CARDS_TO_PUT_ON_BOTTOM_OF_THE_DECK) {
    for (const card of cards) {
      store.log(state, GameLog.LOG_PLAYER_PUTS_CARD_ON_BOTTOM_OF_DECK, { name: playerName, card: card.name });
    }
    return true;
  }

  if (message === GameMessage.CHOOSE_BASIC_POKEMON_TO_BENCH) {
    for (const card of cards) {
      store.log(state, GameLog.LOG_PLAYER_PLAYS_BASIC_POKEMON, { name: playerName, card: card.name });
    }
    return true;
  }

  if (message === GameMessage.CHOOSE_CARD_TO_DECK && cardsAreInDiscard(state, cards)) {
    for (const card of cards) {
      store.log(state, GameLog.LOG_PLAYER_RETURNS_TO_DECK_FROM_DISCARD, { name: playerName, card: card.name });
    }
    return true;
  }

  return false;
}

function logChoosePokemonOutcome(
  store: StoreLike,
  state: State,
  prompt: Prompt<any>,
  playerName: string,
): boolean {
  if (!(prompt instanceof ChoosePokemonPrompt) || prompt.skipSwitchLog) {
    return false;
  }
  if (String(prompt.message) !== GameMessage.CHOOSE_POKEMON_TO_SWITCH) {
    return false;
  }

  const names = asArray(prompt.result)
    .filter((slot): slot is PokemonCardList => slot instanceof PokemonCardList)
    .map(slot => slot.getPokemonCard()?.name)
    .filter((name): name is string => !!name);
  if (names.length === 0) {
    return false;
  }

  for (const card of names) {
    store.log(state, GameLog.LOG_PLAYER_SWITCHES_POKEMON_TO_ACTIVE, { name: playerName, card });
  }
  return true;
}

function isToHandMessage(message: string): boolean {
  return message === GameMessage.CHOOSE_CARD_TO_HAND
    || message === GameMessage.CHOOSE_ENERGIES_TO_HAND
    || message.endsWith('_TO_HAND');
}

function isDiscardMessage(message: string): boolean {
  return message === GameMessage.CHOOSE_CARD_TO_DISCARD
    || message === GameMessage.CHOOSE_ENERGIES_TO_DISCARD
    || message === GameMessage.CHOOSE_ENERGY_TO_DISCARD;
}

function cardsAreInHand(state: State, prompt: Prompt<any>, cards: Card[]): boolean {
  const ownerId = prompt.getPerspectivePlayerId();
  const owner = state.players.find(p => p.id === ownerId);
  if (owner == null) {
    return false;
  }
  return cards.every(card => owner.hand.cards.includes(card));
}

function cardsAreInDiscard(state: State, cards: Card[]): boolean {
  return cards.every(card => state.players.some(player => player.discard.cards.includes(card)));
}

/**
 * Log a prevention discovered while cards reduced the effect.
 * Trainer-target blocks keep their own wording. Probes and self-handled plays stay quiet.
 */
export function logPreventedEffect(store: StoreLike, state: State, effect: Effect): void {
  if (shouldSkipEffect(effect) || !effectWasBlocked(effect)) {
    return;
  }

  const blocker = blockedBy(effect);
  if (blocker == null || isSelfHandled(effect, blocker)) {
    return;
  }

  const target = effectTarget(effect);
  if (target != null) {
    const owner = safeOwner(state, target);
    const message = owner != null && target === owner.active
      ? GameLog.LOG_CARD_PREVENTS_ACTIVE
      : GameLog.LOG_CARD_PREVENTS_BENCH;
    store.log(state, message, {
      blocker: blocker.name,
      effect: effectLabel(effect),
      name: owner?.name ?? '',
      pokemon: target.getPokemonCard()?.name ?? 'Pokémon',
    });
    return;
  }

  store.log(state, GameLog.LOG_CARD_PREVENTS, {
    blocker: blocker.name,
    effect: effectLabel(effect),
  });
}

/** Log player-visible effects that reducers apply without writing a log of their own. */
export function logAppliedEffect(store: StoreLike, state: State, effect: Effect): void {
  if (shouldSkipEffect(effect) || effect.preventDefault || ALREADY_LOGGED_ON_APPLY.has(effect.type)) {
    return;
  }

  if (effect instanceof HealEffect) {
    if (effect.damage <= 0) {
      return;
    }
    store.log(state, GameLog.LOG_PLAYER_HEALS_POKEMON, {
      name: effect.player.name,
      pokemon: effect.target.getPokemonCard()?.name ?? 'Pokémon',
      healingAmount: effect.damage,
    });
    return;
  }

  if (effect instanceof DiscardCardsEffect || effect instanceof DiscardCardsFromOpponentsActivePokemonEffect) {
    logNamedCards(store, state, effect.player.name, effect.cards, effect.attack?.name ?? '', GameLog.LOG_PLAYER_DISCARDS_CARD);
    return;
  }

  if (effect instanceof DiscardDefendingPokemonEffect && effect.discarded) {
    const pokemon = effect.target.getPokemonCard()?.name;
    if (pokemon) {
      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, {
        name: effect.player.name,
        card: pokemon,
        effectName: effect.attack?.name ?? '',
      });
    }
    return;
  }

  if (effect instanceof LostZoneCardsEffect) {
    for (const card of effect.cards) {
      store.log(state, GameLog.LOG_PLAYER_PUTS_CARD_IN_LOST_ZONE_FROM_PLAY, {
        name: effect.player.name,
        card: card.name,
      });
    }
    return;
  }

  if (effect instanceof CardsToHandEffect) {
    for (const card of effect.cards) {
      store.log(state, GameLog.LOG_PLAYER_PUTS_CARD_IN_HAND, {
        name: effect.player.name,
        card: card.name,
      });
    }
    return;
  }

  if (effect instanceof MoveOpponentEnergyEffect) {
    store.log(state, GameLog.LOG_PLAYER_MOVES_CARD, {
      name: effect.player.name,
      card: effect.card.name,
      from: pokemonSpot(state, effect.target),
      to: pokemonSpot(state, effect.destination),
    });
    return;
  }

  if (effect instanceof AddSpecialConditionsEffect) {
    const pokemon = effect.target.getPokemonCard()?.name ?? 'Pokémon';
    for (const condition of effect.specialConditions) {
      store.log(state, GameLog.LOG_PLAYER_POKEMON_SPECIAL_CONDITION, {
        name: effect.player.name,
        pokemon,
        condition: specialConditionName(condition),
      });
    }
    return;
  }

  if (effect instanceof RemoveSpecialConditionsEffect) {
    const pokemon = effect.target.getPokemonCard()?.name ?? 'Pokémon';
    for (const condition of effect.specialConditions) {
      store.log(state, GameLog.LOG_PLAYER_POKEMON_RECOVERS_SPECIAL_CONDITION, {
        name: effect.player.name,
        pokemon,
        condition: specialConditionName(condition),
      });
    }
  }
}

function shouldSkipEffect(effect: Effect): boolean {
  return effect instanceof AddSpecialConditionsPowerEffect
    || effect.type.startsWith('CHECK_')
    || SKIPPED_EFFECT_TYPES.has(effect.type);
}

function isSilentPrompt(prompt: Prompt<any>): boolean {
  return prompt instanceof ShuffleDeckPrompt
    || prompt instanceof ShuffleHandPrompt
    || prompt instanceof ShufflePrizesPrompt
    || prompt instanceof ShowCardsPrompt
    || prompt instanceof ShowMulliganPrompt
    || prompt instanceof AlertPrompt
    || prompt instanceof WaitPrompt
    || prompt instanceof InvitePlayerPrompt
    || prompt instanceof ConfirmCardsPrompt
    || prompt instanceof CoinFlipPrompt;
}

function describePromptResult(state: State, prompt: Prompt<any>): string | undefined {
  const result = prompt.result;
  if (prompt instanceof ChoosePokemonPrompt) {
    return join(asArray(result).map(slot => slot instanceof PokemonCardList ? pokemonSpot(state, slot) : ''));
  }
  if (prompt instanceof ChooseCardsPrompt) {
    if (prompt.options.isSecret) {
      return hiddenCount(asArray(result).length, 'a card', 'cards');
    }
    return join(asArray(result).map(card => cardName(card)));
  }
  if (prompt instanceof ChooseEnergyPrompt) {
    return join(asArray(result).map(entry => cardName(entry?.card)));
  }
  if (prompt instanceof AttachEnergyPrompt) {
    return join(asArray(result).map(entry => {
      const pokemon = targetLabel(state, prompt, entry?.to);
      const card = cardName(entry?.card);
      return card && pokemon ? `${card} to ${pokemon}` : card;
    }));
  }
  if (prompt instanceof DiscardEnergyPrompt) {
    return join(asArray(result).map(entry => {
      const pokemon = targetLabel(state, prompt, entry?.from);
      const card = cardName(entry?.card);
      return card && pokemon ? `${card} from ${pokemon}` : card;
    }));
  }
  if (prompt instanceof MoveEnergyPrompt) {
    return join(asArray(result).map(entry => {
      const card = cardName(entry?.card);
      const from = targetLabel(state, prompt, entry?.from);
      const to = targetLabel(state, prompt, entry?.to);
      if (!card) {
        return '';
      }
      if (from && to) {
        return `${card} from ${from} to ${to}`;
      }
      return card;
    }));
  }
  if (prompt instanceof PutDamagePrompt) {
    return join(asArray(result).map(entry => {
      const pokemon = targetLabel(state, prompt, entry?.target);
      return pokemon ? `${entry.damage} damage on ${pokemon}` : '';
    }));
  }
  if (prompt instanceof MoveDamagePrompt || prompt instanceof RemoveDamagePrompt) {
    return join(asArray(result).map(entry => {
      const from = targetLabel(state, prompt, entry?.from);
      const to = targetLabel(state, prompt, entry?.to);
      if (from && to) {
        return `damage from ${from} to ${to}`;
      }
      return from ? `damage from ${from}` : '';
    }));
  }
  if (prompt instanceof ChoosePrizePrompt) {
    const prizes = asArray(result);
    if (prompt.options.isSecret || prizes.some(list => list?.isSecret)) {
      return hiddenCount(prizes.length, 'a Prize card', 'Prize cards');
    }
    return join(prizes.map(list => cardName(list?.cards?.[0])));
  }
  if (prompt instanceof ChooseAttackPrompt) {
    return result?.name;
  }
  if (prompt instanceof SelectOptionPrompt || prompt instanceof SelectPrompt) {
    return prompt.values?.[result];
  }
  if (prompt instanceof ConfirmPrompt) {
    return result ? 'Yes' : 'No';
  }
  return undefined;
}

function effectLabel(effect: Effect): string {
  if (effect instanceof KnockOutEffect) {
    return 'a Knock Out';
  }
  const named = (effect as { attack?: { name?: string }, trainerCard?: Card, card?: Card, pokemonCard?: Card, stadium?: Card, power?: { name?: string } });
  return named.attack?.name
    || named.trainerCard?.name
    || named.card?.name
    || named.pokemonCard?.name
    || named.stadium?.name
    || named.power?.name
    || 'that effect';
}

function effectTarget(effect: Effect): PokemonCardList | undefined {
  if (
    effect instanceof PutDamageEffect
    || effect instanceof DealDamageEffect
    || effect instanceof PutCountersEffect
    || effect instanceof PlaceDamageCountersEffect
    || effect instanceof PutDamageCountersEffect
    || effect instanceof KnockOutEffect
    || effect instanceof HealEffect
  ) {
    return effect.target;
  }
  const target = (effect as { target?: unknown }).target;
  return target instanceof PokemonCardList ? target : undefined;
}

function isSelfHandled(effect: Effect, blocker: Card): boolean {
  const named = effect as {
    trainerCard?: Card;
    card?: Card;
    pokemonCard?: Card;
    energyCard?: Card;
    stadium?: Card;
    sourceCard?: Card;
    markerSource?: Card;
    source?: unknown;
  };
  const sources = [
    named.trainerCard,
    named.card,
    named.pokemonCard,
    named.energyCard,
    named.stadium,
    named.sourceCard,
    named.markerSource,
  ];
  if (sources.includes(blocker)) {
    return true;
  }
  if (named.source instanceof PokemonCardList) {
    return named.source.getPokemonCard() === blocker
      || named.source.cards.includes(blocker)
      || named.source.tools.includes(blocker);
  }
  if (named.source instanceof Card && named.source === blocker) {
    return true;
  }
  return false;
}

function logNamedCards(
  store: StoreLike,
  state: State,
  playerName: string,
  cards: Card[],
  effectName: string,
  message: GameLog,
): void {
  for (const card of cards) {
    store.log(state, message, {
      name: playerName,
      card: card.name,
      effectName,
    });
  }
}

function pokemonSpot(state: State, slot: PokemonCardList): string {
  const name = slot.getPokemonCard()?.name ?? 'Pokémon';
  const owner = safeOwner(state, slot);
  if (owner == null) {
    return name;
  }
  return slot === owner.active ? `${name} (Active)` : `${name} (Bench)`;
}

function targetLabel(state: State, prompt: Prompt<any>, target: CardTarget | undefined): string {
  if (target == null) {
    return '';
  }
  const perspective = state.players.find(p => p.id === prompt.getPerspectivePlayerId());
  if (perspective == null) {
    return '';
  }
  try {
    return pokemonSpot(state, StateUtils.getTarget(state, perspective, target));
  } catch {
    return '';
  }
}

function safeOwner(state: State, list: CardList): { name: string, active: PokemonCardList } | undefined {
  try {
    return StateUtils.findOwner(state, list);
  } catch {
    return undefined;
  }
}

function cardName(card: { name?: string } | undefined): string {
  return card?.name ?? '';
}

function join(parts: string[]): string {
  return parts.map(part => part.trim()).filter(part => part.length > 0).join(', ');
}

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function hiddenCount(count: number, singular: string, plural: string): string {
  if (count <= 1) {
    return singular;
  }
  return `${count} ${plural}`;
}

function specialConditionName(condition: SpecialCondition): string {
  switch (condition) {
    case SpecialCondition.PARALYZED: return 'Paralyzed';
    case SpecialCondition.CONFUSED: return 'Confused';
    case SpecialCondition.ASLEEP: return 'Asleep';
    case SpecialCondition.POISONED: return 'Poisoned';
    case SpecialCondition.BURNED: return 'Burned';
    default: return 'affected';
  }
}
