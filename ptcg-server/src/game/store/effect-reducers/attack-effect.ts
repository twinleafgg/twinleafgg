import { getCardTarget } from "../../../simple-bot/simple-tactics/simple-tactics";
import { GameError } from "../../game-error";
import { GameMessage, GameLog } from "../../game-message";
import { PlayerType } from "../actions/play-card-action";
import { PutDamageEffect, AfterDamageEffect, ApplyWeaknessEffect, AfterWeaknessAndResistanceEffect, DealDamageEffect, KnockOutOpponentEffect, KOEffect, KnockOutPlayerEffect, PutCountersEffect, DiscardCardsEffect, DiscardCardsFromOpponentsActivePokemonEffect, DiscardDefendingPokemonEffect, LostZoneCardsEffect, CardsToHandEffect, MoveOpponentEnergyEffect, GustOpponentBenchEffect, SwitchOutOpponentsActiveEffect, AddMarkerEffect, HealTargetEffect, AddSpecialConditionsEffect, RemoveSpecialConditionsEffect } from "../effects/attack-effects";
import { CheckHpEffect } from "../effects/check-effects";
import { Effect } from "../effects/effect";
import { shouldPreventAttackEffects, shouldPreventAttackDamage, shouldApplyDamageReduction, getActiveSurviveOnTenHpOptions, shouldKnockOutIfDamaged, getActiveRetaliateOnDamage, retaliateDamageEffect, RetaliateDamageEffect, EffectOfAttackEffect } from "../effects/effect-of-attack-effects";
import { AttackEffect, KnockOutAttackEffect, HealEffect } from "../effects/game-effects";
import { GameStatsTracker } from "../game-stats-tracker";
import { TAKE_X_PRIZES, MOVE_CARDS, MOVE_POKEMON_OFF_BOARD } from "../prefabs/prefabs";
import { CoinFlipPrompt } from "../prompts/coin-flip-prompt";
import { StateUtils } from "../state-utils";
import { State, GamePhase } from "../state/state";
import { StoreLike } from "../store-like";

function applyPutDamage(store: StoreLike, state: State, effect: PutDamageEffect): State {
  const target = effect.target;
  const sourceOwner = StateUtils.findOwner(state, effect.source);
  const targetCard = target.getPokemonCard();

  if (targetCard === undefined) {
    throw new GameError(GameMessage.ILLEGAL_ACTION);
  }

  const damage = Math.max(0, effect.damage);
  target.damage += damage;

  if (damage > 0) {
    store.log(state, GameLog.LOG_PLAYER_DEALS_DAMAGE, {
      name: sourceOwner.name,
      damage: damage,
      target: targetCard.name,
      effect: effect.attack.name,
    });

    const targetOwner = StateUtils.findOwner(state, target);
    targetOwner.marker.addMarkerToState(targetOwner.DAMAGE_DEALT_MARKER);

    if (effect.attackEffect && effect.source) {
      GameStatsTracker.trackDamageDealt(effect.player, effect.source, damage);
    }

    if (targetCard.damageTakenLastTurn !== undefined) {
      targetCard.damageTakenLastTurn += damage;
    }

    if (effect.surviveOnTenHPReason !== undefined) {
      const checkHpEffect = new CheckHpEffect(effect.player, target);
      state = store.reduceEffect(state, checkHpEffect);
      if (target.damage > checkHpEffect.hp) {
        store.log(state, GameLog.LOG_SURVIVES_ON_TEN_HP, {
          pokemon: targetCard.name,
          reason: effect.surviveOnTenHPReason,
        });
        target.damage = checkHpEffect.hp - 10;
      }
    }

    const afterDamageEffect = new AfterDamageEffect(effect.attackEffect, damage);
    afterDamageEffect.target = effect.target;
    store.reduceEffect(state, afterDamageEffect);
  }

  if (effect.attackEffect && effect.attackEffect.player && (effect.attackEffect.player.active as any).pendingAttackTargets) {
    try {
      const cardTarget = getCardTarget(effect.attackEffect.player, state, target);
      const pending = (effect.attackEffect.player.active as any).pendingAttackTargets;
      if (Array.isArray(pending) && !pending.some((t: { player: number; slot: number; index: number }) =>
        t.player === cardTarget.player && t.slot === cardTarget.slot && t.index === cardTarget.index)) {
        pending.push(cardTarget);
      }
    } catch (e) { /* ignore if cannot resolve target */ }
  }

  return state;
}

export function attackReducer(store: StoreLike, state: State, effect: Effect): State {

  if (shouldPreventAttackEffects(state, effect)) {
    return state;
  }

  if (effect instanceof PutDamageEffect) {
    const target = effect.target;
    const targetCard = target.getPokemonCard();

    if (targetCard === undefined) {
      throw new GameError(GameMessage.ILLEGAL_ACTION);
    }

    // Defending Pokémon's attacks do N less (before W/R). Only for direct PutDamage
    // paths — DealDamageEffect already applied this before weakness.
    if (!effect.weaknessApplied && effect.source.attackDamageReductionNextTurn > 0) {
      effect.damage = Math.max(0, effect.damage - effect.source.attackDamageReductionNextTurn);
    }

    if (!effect.weaknessApplied && effect.target.damageReductionBeforeWeaknessNextTurn > 0) {
      effect.damage = Math.max(0, effect.damage - effect.target.damageReductionBeforeWeaknessNextTurn);
    }

    const opponent = StateUtils.getOpponent(state, effect.player);

    if (effect.attackEffect && target === opponent.active && !effect.weaknessApplied) {
      // Apply weakness
      const applyWeakness = new ApplyWeaknessEffect(effect.attackEffect, effect.damage);
      applyWeakness.target = effect.target;
      applyWeakness.ignoreWeakness = effect.attackEffect.ignoreWeakness;
      applyWeakness.ignoreResistance = effect.attackEffect.ignoreResistance;
      state = store.reduceEffect(state, applyWeakness);

      effect.damage = applyWeakness.damage;

      const targetOwner = StateUtils.findOwner(state, target);
      targetOwner.marker.addMarkerToState(targetOwner.DAMAGE_DEALT_MARKER);
    }

    if (state.phase === GamePhase.ATTACK && shouldPreventAttackDamage(target, effect.source, effect.damage)) {
      return state;
    }

    // Apply damage reduction (or increase via negative values) for "during opponent's next turn" effects
    if (shouldApplyDamageReduction(target, effect.source)) {
      effect.damage = Math.max(0, effect.damage - target.damageReductionNextTurn);
    }

    if (effect.source.attackDamageReductionAfterWeaknessNextTurn > 0) {
      effect.damage = Math.max(0, effect.damage - effect.source.attackDamageReductionAfterWeaknessNextTurn);
    }

    // Apply extra damage for "during your next turn, the Defending Pokemon takes more damage" effects
    if (target.defendingPokemonExtraDamageNextTurn > 0
      && !target.defendingPokemonExtraDamagePending
      && target.defendingPokemonExtraDamageAttackerId === effect.player.id) {
      effect.damage += target.defendingPokemonExtraDamageNextTurn;
    }

    // Survive at 10 HP during opponent's next turn
    const surviveOpts = getActiveSurviveOnTenHpOptions(target);
    if (surviveOpts !== null
      && effect.surviveOnTenHPReason === undefined
      && state.phase === GamePhase.ATTACK) {
      const checkHpPreview = new CheckHpEffect(effect.player, target);
      state = store.reduceEffect(state, checkHpPreview);
      const wouldKo = target.damage + Math.max(0, effect.damage) >= checkHpPreview.hp;
      const fullHpOk = !surviveOpts.requireFullHp || target.damage === 0;
      if (wouldKo && fullHpOk) {
        if (surviveOpts.coinFlipOnWouldKo) {
          return store.prompt(state, new CoinFlipPrompt(
            StateUtils.findOwner(state, target).id,
            GameMessage.COIN_FLIP,
          ), (result) => {
            if (result) {
              effect.surviveOnTenHPReason = effect.attack?.name || 'Endure';
            }
            return applyPutDamage(store, state, effect);
          });
        }
        effect.surviveOnTenHPReason = effect.attack?.name || 'Endure';
      }
    }

    // Afterimage: when damaged during the opponent's next turn, flip; heads prevents that damage.
    if (target.coinFlipPreventAttackDamageNextTurn
      && effect.damage > 0
      && state.phase === GamePhase.ATTACK
      && effect.source
      && StateUtils.findOwner(state, target) !== effect.player) {
      const targetOwner = StateUtils.findOwner(state, target);
      return store.prompt(state, new CoinFlipPrompt(
        targetOwner.id,
        GameMessage.COIN_FLIP,
      ), (result) => {
        if (result) {
          effect.damage = 0;
        }
        return applyPutDamage(store, state, effect);
      });
    }

    // Reflect Shield: when damaged, flip a coin; heads prevents damage and retaliates.
    const coinFlipRetaliate = getActiveRetaliateOnDamage(target);
    if (coinFlipRetaliate !== null
      && 'coinFlipPrevent' in coinFlipRetaliate
      && coinFlipRetaliate.coinFlipPrevent === true
      && 'damage' in coinFlipRetaliate
      && effect.damage > 0
      && state.phase === GamePhase.ATTACK
      && effect.source
      && StateUtils.findOwner(state, target) !== effect.player) {
      const targetOwner = StateUtils.findOwner(state, target);
      return store.prompt(state, new CoinFlipPrompt(
        targetOwner.id,
        GameMessage.COIN_FLIP,
      ), (result) => {
        if (!result) {
          return applyPutDamage(store, state, effect);
        }

        let sourceList = effect.target;
        const attackerPlayer = state.players.find(p => p.id === coinFlipRetaliate.attackerPlayerId);
        if (attackerPlayer) {
          attackerPlayer.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
            if (card === coinFlipRetaliate.sourceCard) {
              sourceList = cardList;
            }
          });
        }
        const revengeBase = new AttackEffect(targetOwner, effect.player, coinFlipRetaliate.attack);
        revengeBase.source = sourceList;
        const retaliateEffect = retaliateDamageEffect(revengeBase, coinFlipRetaliate.damage, effect.source);
        retaliateEffect.markerSource = coinFlipRetaliate.sourceCard;
        return store.reduceEffect(state, retaliateEffect);
      });
    }

    return applyPutDamage(store, state, effect);
  }

  if (effect instanceof AfterWeaknessAndResistanceEffect) {
    const target = effect.target;
    const damage = Math.max(0, effect.damage);
    target.damage += damage;

    // Track damage dealt by the attacking Pokemon
    if (damage > 0 && effect.attackEffect && effect.source) {
      GameStatsTracker.trackDamageDealt(effect.player, effect.source, damage);
    }
  }

  if (effect instanceof DealDamageEffect) {
    const base = effect.attackEffect;

    // Defending Pokémon's attacks do N less — before Weakness and Resistance
    if (effect.source.attackDamageReductionNextTurn > 0) {
      effect.damage = Math.max(0, effect.damage - effect.source.attackDamageReductionNextTurn);
    }

    const dealOpponent = StateUtils.getOpponent(state, effect.player);
    if (effect.source.outgoingAttackDamageBonusNextTurn > 0 && effect.target === dealOpponent.active) {
      effect.damage += effect.source.outgoingAttackDamageBonusNextTurn;
    }

    if (effect.target.damageReductionBeforeWeaknessNextTurn > 0) {
      effect.damage = Math.max(0, effect.damage - effect.target.damageReductionBeforeWeaknessNextTurn);
    }

    const applyWeakness = new ApplyWeaknessEffect(base, effect.damage);
    applyWeakness.target = effect.target;
    applyWeakness.ignoreWeakness = base.ignoreWeakness;
    applyWeakness.ignoreResistance = base.ignoreResistance;
    state = store.reduceEffect(state, applyWeakness);

    const dealDamage = new PutDamageEffect(base, applyWeakness.damage);
    dealDamage.target = effect.target;
    dealDamage.weaknessApplied = true;
    state = store.reduceEffect(state, dealDamage);

    // Hangman KO — Mist-blockable EffectOfAttack (auto-KO), not boosted damage
    if (dealDamage.damage > 0
      && !dealDamage.preventDefault
      && shouldKnockOutIfDamaged(effect.target, effect.source)
      && effect.target.knockOutIfDamagedNextTurnAttack
      && effect.target.knockOutIfDamagedNextTurnSourceCard
      && effect.target.knockOutIfDamagedNextTurnAttackerId !== undefined) {
      const hangmanOwner = state.players.find(
        p => p.id === effect.target.knockOutIfDamagedNextTurnAttackerId,
      );
      if (hangmanOwner) {
        let sourceList = hangmanOwner.active;
        const sourceCard = effect.target.knockOutIfDamagedNextTurnSourceCard;
        hangmanOwner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
          if (card === sourceCard) {
            sourceList = cardList;
          }
        });
        const targetOwner = StateUtils.findOwner(state, effect.target);
        const hangmanBase = new AttackEffect(
          hangmanOwner,
          targetOwner,
          effect.target.knockOutIfDamagedNextTurnAttack,
        );
        hangmanBase.source = sourceList;
        const ko = new KnockOutOpponentEffect(hangmanBase);
        ko.target = effect.target;
        state = store.reduceEffect(state, ko);
      }
    }
    return state;
  }

  if (effect instanceof KOEffect) {
    const target = effect.target;
    const pokemonCard = target.getPokemonCard();
    if (pokemonCard === undefined) {
      throw new GameError(GameMessage.ILLEGAL_ACTION);
    }

    // Check if the effect is part of an attack and the target is the opponent's active Pokemon
    const opponent = StateUtils.getOpponent(state, effect.player);
    if (effect.attackEffect && target === opponent.active) {
      // Apply weakness
      const applyWeakness = new ApplyWeaknessEffect(effect.attackEffect, effect.damage);
      applyWeakness.target = effect.target;
      applyWeakness.ignoreWeakness = effect.attackEffect.ignoreWeakness;
      applyWeakness.ignoreResistance = effect.attackEffect.ignoreResistance;
      state = store.reduceEffect(state, applyWeakness);

      effect.damage = applyWeakness.damage;

    }

    const damage = Math.max(0, effect.damage);
    target.damage += damage;

    const targetOwner = StateUtils.findOwner(state, target);
    targetOwner.marker.addMarkerToState(effect.player.DAMAGE_DEALT_MARKER);

    if (damage > 0) {
      // Track damage dealt by the attacking Pokemon
      if (effect.attackEffect && effect.source) {
        GameStatsTracker.trackDamageDealt(effect.player, effect.source, damage);
      }

      const afterDamageEffect = new AfterDamageEffect(effect.attackEffect, damage);
      afterDamageEffect.target = effect.target;
      store.reduceEffect(state, afterDamageEffect);
    }
  }

  if (effect instanceof KnockOutOpponentEffect) {
    const target = effect.target;
    const pokemonCard = target.getPokemonCard();
    if (pokemonCard === undefined) {
      throw new GameError(GameMessage.ILLEGAL_ACTION);
    }

    const targetOwner = StateUtils.findOwner(state, target);
    const knockOutEffect = new KnockOutAttackEffect(targetOwner, target, effect.attack);
    state = store.reduceEffect(state, knockOutEffect);

    if (!knockOutEffect.preventDefault) {
      effect.knockedOut = true;
      effect.prizeCount = knockOutEffect.prizeCount;
      return TAKE_X_PRIZES(store, state, effect.player, knockOutEffect.prizeCount);
    }

    return state;
  }

  if (effect instanceof KnockOutPlayerEffect) {
    if (effect.preventDefault) {
      return state;
    }

    const target = effect.target;
    const pokemonCard = target.getPokemonCard();
    if (pokemonCard === undefined) {
      throw new GameError(GameMessage.ILLEGAL_ACTION);
    }

    const targetOwner = StateUtils.findOwner(state, target);
    const knockOutEffect = new KnockOutAttackEffect(targetOwner, target, effect.attack);
    state = store.reduceEffect(state, knockOutEffect);

    if (!knockOutEffect.preventDefault) {
      effect.knockedOut = true;
      effect.prizeCount = knockOutEffect.prizeCount;
      return TAKE_X_PRIZES(store, state, effect.opponent, knockOutEffect.prizeCount);
    }

    return state;
  }

  if (effect instanceof PutCountersEffect) {
    const target = effect.target;
    const sourceOwner = StateUtils.findOwner(state, effect.source);
    const targetCard = target.getPokemonCard();
    if (targetCard === undefined) {
      throw new GameError(GameMessage.ILLEGAL_ACTION);
    }

    const damage = Math.max(0, effect.damage);
    target.damage += damage;

    if (damage > 0) {
      store.log(state, GameLog.LOG_PLAYER_PLACES_DAMAGE_COUNTERS, {
        name: sourceOwner.name,
        damage: damage,
        target: targetCard.name,
        effect: effect.attack.name,
      });

      // Track damage dealt by the attacking Pokemon
      if (effect.attackEffect && effect.source) {
        GameStatsTracker.trackDamageDealt(effect.player, effect.source, damage);
      }
    }
  }

  if (effect instanceof AfterDamageEffect) {
    const targetOwner = StateUtils.findOwner(state, effect.target);
    targetOwner.marker.addMarkerToState(effect.player.DAMAGE_DEALT_MARKER);

    // Revenge trap (Shell Trap / Counter Press) — even if Knocked Out.
    // Must be an EffectOfAttack attributed to the retaliator so Mist Energy blocks it.
    // coinFlipPrevent traps are resolved during PutDamageEffect instead.
    const retaliate = getActiveRetaliateOnDamage(effect.target);
    if (retaliate !== null
      && !('coinFlipPrevent' in retaliate && retaliate.coinFlipPrevent)
      && effect.damage > 0
      && targetOwner !== effect.player
      && state.phase === GamePhase.ATTACK
      && effect.source) {
      let revengeDamage = 0;
      if ('reflect' in retaliate && retaliate.reflect) {
        revengeDamage = effect.damage;
      } else if ('damage' in retaliate) {
        revengeDamage = retaliate.damage;
      }
      if (revengeDamage > 0) {
        let sourceList = effect.target;
        const attackerPlayer = state.players.find(p => p.id === retaliate.attackerPlayerId);
        if (attackerPlayer) {
          attackerPlayer.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
            if (card === retaliate.sourceCard) {
              sourceList = cardList;
            }
          });
        }
        const revengeBase = new AttackEffect(targetOwner, effect.player, retaliate.attack);
        revengeBase.source = sourceList;
        const retaliateEffect = retaliateDamageEffect(revengeBase, revengeDamage, effect.source);
        retaliateEffect.markerSource = retaliate.sourceCard;
        state = store.reduceEffect(state, retaliateEffect);
      }
    }
  }

  if (effect instanceof DiscardCardsEffect) {
    const target = effect.target;
    const cards = effect.cards;
    const owner = StateUtils.findOwner(state, target);
    target.moveCardsTo(cards, owner.discard);
    return state;
  }

  if (effect instanceof DiscardCardsFromOpponentsActivePokemonEffect) {
    if (!effect.preventDefault) {
      const target = effect.target;
      const cards = effect.cards;
      const owner = StateUtils.findOwner(state, target);
      return MOVE_CARDS(store, state, target, owner.discard, { cards, sourceEffect: effect });
    }
    return state;
  }

  if (effect instanceof DiscardDefendingPokemonEffect) {
    if (effect.preventDefault) {
      return state;
    }

    const target = effect.target;
    const pokemonCard = target.getPokemonCard();
    if (pokemonCard === undefined) {
      throw new GameError(GameMessage.ILLEGAL_ACTION);
    }

    const owner = StateUtils.findOwner(state, target);
    state = MOVE_POKEMON_OFF_BOARD(store, state, target, {
      pokemonDestination: owner.discard,
      sourceEffect: effect,
    });
    effect.discarded = true;
    return state;
  }

  if (effect instanceof LostZoneCardsEffect) {
    const target = effect.target;
    const cards = effect.cards;
    const owner = StateUtils.findOwner(state, target);
    target.moveCardsTo(cards, owner.lostzone);
    return state;
  }

  if (effect instanceof CardsToHandEffect) {
    const target = effect.target;
    const cards = effect.cards;
    const owner = StateUtils.findOwner(state, target);
    target.moveCardsTo(cards, owner.hand);
    return state;
  }

  if (effect instanceof MoveOpponentEnergyEffect) {
    if (!effect.preventDefault) {
      effect.target.moveCardTo(effect.card, effect.destination);
    }
    return state;
  }

  if (effect instanceof GustOpponentBenchEffect) {
    if (!effect.preventDefault) {
      effect.opponent.switchPokemon(effect.target, store, state);
    }
    return state;
  }

  if (effect instanceof SwitchOutOpponentsActiveEffect) {
    if (!effect.preventDefault && effect.benchTarget) {
      effect.opponent.switchPokemon(effect.benchTarget, store, state);
    }
    return state;
  }

  if (effect instanceof AddMarkerEffect) {
    const target = effect.target;
    target.marker.addMarker(effect.markerName, effect.markerSource);
    return state;
  }

  if (effect instanceof HealTargetEffect) {
    const target = effect.target;
    const owner = StateUtils.findOwner(state, target);
    const healEffect = new HealEffect(owner, target, effect.damage);
    state = store.reduceEffect(state, healEffect);
    return state;
  }

  if (effect instanceof AddSpecialConditionsEffect) {
    const target = effect.target;
    effect.specialConditions.forEach(sp => {
      target.addSpecialCondition(sp);
    });
    if (effect.poisonDamage !== undefined) {
      target.poisonDamage = effect.poisonDamage;
    }
    if (effect.burnDamage !== undefined) {
      target.burnDamage = effect.burnDamage;
    }
    if (effect.confusionDamage !== undefined) {
      target.confusionDamage = effect.confusionDamage;
    }
    return state;
  }

  if (effect instanceof RemoveSpecialConditionsEffect) {
    const target = effect.target;
    effect.specialConditions.forEach(sp => {
      target.removeSpecialCondition(sp);
    });
    return state;
  }

  if (effect instanceof RetaliateDamageEffect) {
    const target = effect.target;
    const targetCard = target.getPokemonCard();
    const sourceOwner = StateUtils.findOwner(state, effect.source);
    const damage = Math.max(0, effect.damage);
    effect.applyEffect();
    if (damage > 0 && targetCard !== undefined) {
      store.log(state, GameLog.LOG_PLAYER_PLACES_DAMAGE_COUNTERS, {
        name: sourceOwner.name,
        damage,
        target: targetCard.name,
        effect: effect.attack.name,
      });
      if (effect.source) {
        GameStatsTracker.trackDamageDealt(effect.player, effect.source, damage);
      }
    }
    return state;
  }

  if (effect instanceof EffectOfAttackEffect) {
    effect.applyEffect();
    return state;
  }

  return state;
}
