import { CardType, Stage, Weakness, Resistance, CardTag, PokemonCard, Power, PowerType, Attack, PokemonCardList, SpecialCondition, State, StateUtils, StoreLike, GameLog, GameError, GameMessage, ChooseCardsPrompt, SuperType } from "../../game";
import { AddSpecialConditionsEffect } from "../../game/store/effects/attack-effects";
import { AddSpecialConditionsPowerEffect } from "../../game/store/effects/check-effects";
import { Effect } from "../../game/store/effects/effect";
import { PowerEffect } from "../../game/store/effects/game-effects";
import { PlayPokemonEffect } from "../../game/store/effects/play-card-effects";
import {IS_POKEMON_POWER_BLOCKED, HAS_MARKER, ADD_MARKER, ABILITY_USED, CONFIRMATION_PROMPT, REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS } from "../../game/store/prefabs/prefabs";

interface NinetalesPrintedSnapshot {
  name: string;
  hp: number;
  cardType: CardType[];
  stage: Stage;
  evolvesFrom: string;
  weakness: Weakness[];
  resistance: Resistance[];
  retreat: CardType[];
  tags: CardTag[];
}

function cloneCardType(cardType: CardType[]): CardType[] {
  return [...cardType];
}

export class BrocksNinetales extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Brock\'s Vulpix';
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness: Weakness[] = [{ type: W }];
  public resistance: Resistance[] = [];
  public retreat: CardType[] = [C];
  protected _tags = [CardTag.BROCKS];

  public powers: Power[] = [{
    name: 'Shapeshift',
    powerType: PowerType.POKEMON_POWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may attach an Evolution card from your hand to Brock\'s Ninetales. (This doesn\'t count as evolving Brock\'s Ninetales.) Treat Brock\'s Ninetales as if it were that Pokémon instead. It can\'t evolve, devolve, or use the Pokémon Power of that Pokémon. During your turn, you may discard the Evolution card attached to Brock\'s Ninetales. This power can\'t be used if Brock\'s Ninetales is Asleep, Confused, or Paralyzed. If Brock\'s Ninetales becomes Asleep, Confused, or Paralyzed, discard all Evolution cards attached to it.',
  }];

  public attacks: Attack[] = [{
    name: 'Will-o\'-the-wisp',
    cost: [R, R],
    damage: 30,
    text: '',
  }];

  public set: string = 'G2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Brock\'s Ninetales';
  public fullName: string = 'Brock\'s Ninetales G2';

  public readonly SHAPESHIFT_MARKER = 'SHAPESHIFT_MARKER';

  private shapeshiftAttached: PokemonCard[] = [];
  private shapeshiftSource: PokemonCard | undefined;
  private checkingPowerBlock = false;

  private readonly printed: NinetalesPrintedSnapshot = {
    name: 'Brock\'s Ninetales',
    hp: 70,
    cardType: [CardType.FIRE],
    stage: Stage.STAGE_1,
    evolvesFrom: 'Brock\'s Vulpix',
    weakness: [{ type: CardType.WATER }],
    resistance: [],
    retreat: [CardType.COLORLESS],
    tags: [CardTag.BROCKS],
  };

  private isPowerLockProbe(effect: Effect): boolean {
    return effect instanceof PowerEffect && effect.power.name === 'test';
  }

  /**
   * Cards are deepClone'd from CardManager, so always reuse this instance's
   * Shapeshift object so PowerEffect identity / WAS_POWER_USED stay valid.
   */
  private getStableShapeshiftPower(): Power {
    const existing = this.powers.find(p => p.name === 'Shapeshift');
    if (existing) {
      return existing;
    }
    return {
      name: 'Shapeshift',
      powerType: PowerType.POKEMON_POWER,
      useWhenInPlay: true,
      text: 'Once during your turn (before your attack), you may attach an Evolution card from your hand to Brock\'s Ninetales. (This doesn\'t count as evolving Brock\'s Ninetales.) Treat Brock\'s Ninetales as if it were that Pokémon instead. It can\'t evolve, devolve, or use the Pokémon Power of that Pokémon. During your turn, you may discard the Evolution card attached to Brock\'s Ninetales. This power can\'t be used if Brock\'s Ninetales is Asleep, Confused, or Paralyzed. If Brock\'s Ninetales becomes Asleep, Confused, or Paralyzed, discard all Evolution cards attached to it.',
    };
  }

  private createPrintedAttacks(): Attack[] {
    return [{
      name: 'Will-o\'-the-wisp',
      cost: [CardType.FIRE, CardType.FIRE],
      damage: 30,
      text: '',
    }];
  }

  private isShapeshiftPowerEffect(effect: Effect): effect is PowerEffect {
    return effect instanceof PowerEffect
      && effect.card === this
      && effect.power.name === 'Shapeshift';
  }

  private isAsleepConfusedOrParalyzed(cardList: PokemonCardList): boolean {
    return cardList.specialConditions.includes(SpecialCondition.ASLEEP)
      || cardList.specialConditions.includes(SpecialCondition.CONFUSED)
      || cardList.specialConditions.includes(SpecialCondition.PARALYZED);
  }

  private findOwnerAndList(state: State): { owner: ReturnType<typeof StateUtils.findOwner>; cardList: PokemonCardList } | undefined {
    try {
      const cardList = StateUtils.findCardList(state, this);
      if (!(cardList instanceof PokemonCardList) || cardList.getPokemonCard() !== this) {
        return undefined;
      }
      return { owner: StateUtils.findOwner(state, cardList), cardList };
    } catch {
      return undefined;
    }
  }

  private getEvolutionCardsInHand(
    player: ReturnType<typeof StateUtils.findOwner>,
  ): { blocked: number[]; hasEvolution: boolean } {
    const blocked: number[] = [];
    let hasEvolution = false;
    player.hand.cards.forEach((card, index) => {
      if (card instanceof PokemonCard && card.stage !== Stage.BASIC) {
        hasEvolution = true;
      } else {
        blocked.push(index);
      }
    });
    return { blocked, hasEvolution };
  }

  private cloneAttacks(attacks: Attack[]): Attack[] {
    return attacks.map(a => ({ ...a, cost: [...(a.cost || [])] }));
  }

  private clonePowers(powers: Power[]): Power[] {
    return powers
      .filter(p => p.powerType !== PowerType.POKEMON_POWER && p.name !== 'Shapeshift')
      .map(p => ({ ...p }));
  }

  private applyCopy(copy: PokemonCard): void {
    if (this.shapeshiftSource === copy) {
      this.hp = copy.hp;
      this.cardType = cloneCardType(copy.cardType);
      this.stage = copy.stage;
      this.evolvesFrom = copy.evolvesFrom;
      this.weakness = copy.weakness.map(w => ({ ...w })) as Weakness[];
      this.resistance = copy.resistance.map(r => ({ ...r })) as Resistance[];
      this.retreat = [...copy.retreat];
      // Keep appearing as Brock's Ninetales.
      this.name = this.printed.name;
      this.tags = Array.from(new Set([CardTag.BROCKS, ...(copy.tags || [])]));
      const shapeshift = this.getStableShapeshiftPower();
      if (!this.powers.some(p => p === shapeshift || p.name === 'Shapeshift')) {
        this.powers = [...this.powers, shapeshift];
      }
      return;
    }

    this.shapeshiftSource = copy;
    this.hp = copy.hp;
    this.cardType = cloneCardType(copy.cardType);
    this.stage = copy.stage;
    this.evolvesFrom = copy.evolvesFrom;
    this.weakness = copy.weakness.map(w => ({ ...w })) as Weakness[];
    this.resistance = copy.resistance.map(r => ({ ...r })) as Resistance[];
    this.retreat = [...copy.retreat];
    this.name = this.printed.name;
    this.tags = Array.from(new Set([CardTag.BROCKS, ...(copy.tags || [])]));
    // Clone so the real card's WAS_ATTACK/POWER_USED does not also match.
    this.attacks = this.cloneAttacks(copy.attacks || []);
    // Copied powers first so their WAS_POWER_USED indices stay correct; Shapeshift last.
    this.powers = [...this.clonePowers(copy.powers || []), this.getStableShapeshiftPower()];
  }

  private clearCopy(): void {
    if (this.shapeshiftSource === undefined
      && this.hp === this.printed.hp
      && this.attacks.length === 1
      && this.attacks[0]?.name === 'Will-o\'-the-wisp') {
      return;
    }
    this.shapeshiftSource = undefined;
    this.name = this.printed.name;
    this.hp = this.printed.hp;
    this.cardType = cloneCardType(this.printed.cardType);
    this.stage = this.printed.stage;
    this.evolvesFrom = this.printed.evolvesFrom;
    this.weakness = this.printed.weakness.map(w => ({ ...w }));
    this.resistance = this.printed.resistance.map(r => ({ ...r }));
    this.retreat = [...this.printed.retreat];
    this.attacks = this.createPrintedAttacks();
    this.powers = [this.getStableShapeshiftPower()];
    this.tags = [...this.printed.tags];
  }

  private discardShapeshiftAttachments(
    store: StoreLike,
    state: State,
    cardList: PokemonCardList,
    owner: ReturnType<typeof StateUtils.findOwner>,
  ): void {
    const toDiscard = this.shapeshiftAttached.filter(c => cardList.cards.includes(c));
    this.shapeshiftAttached = [];
    for (const card of toDiscard) {
      MOVE_CARDS(store, state, cardList, owner.discard, { cards: [card], sourceCard: this });
      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, {
        name: owner.name,
        card: card.name,
        effectName: 'Shapeshift',
      });
    }
    this.clearCopy();
  }

  private getShapeshiftCopy(store: StoreLike, state: State): PokemonCard | undefined {
    const located = this.findOwnerAndList(state);
    if (!located) {
      this.shapeshiftAttached = [];
      this.clearCopy();
      return undefined;
    }
    const { owner, cardList } = located;

    this.shapeshiftAttached = this.shapeshiftAttached.filter(c => cardList.cards.includes(c));

    if (this.isAsleepConfusedOrParalyzed(cardList)) {
      if (this.shapeshiftAttached.length > 0) {
        this.discardShapeshiftAttachments(store, state, cardList, owner);
      } else {
        this.clearCopy();
      }
      return undefined;
    }

    if (this.shapeshiftAttached.length === 0) {
      this.clearCopy();
      return undefined;
    }

    if (!this.checkingPowerBlock) {
      this.checkingPowerBlock = true;
      try {
        if (IS_POKEMON_POWER_BLOCKED(store, state, owner, this)) {
          this.clearCopy();
          return undefined;
        }
      } finally {
        this.checkingPowerBlock = false;
      }
    }

    return this.shapeshiftAttached[this.shapeshiftAttached.length - 1];
  }

  private syncShapeshift(store: StoreLike, state: State): PokemonCard | undefined {
    const copy = this.getShapeshiftCopy(store, state);
    if (!copy) {
      return undefined;
    }
    this.applyCopy(copy);
    return copy;
  }

  private attachEvolutionFromHand(
    store: StoreLike,
    state: State,
    player: ReturnType<typeof StateUtils.findOwner>,
    cardList: PokemonCardList,
  ): State {
    if (HAS_MARKER(this.SHAPESHIFT_MARKER, player, this)) {
      throw new GameError(GameMessage.POWER_ALREADY_USED);
    }

    const { blocked, hasEvolution } = this.getEvolutionCardsInHand(player);
    if (!hasEvolution) {
      throw new GameError(GameMessage.CANNOT_USE_POWER);
    }

    return store.prompt(state, new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_ATTACH,
      player.hand,
      { superType: SuperType.POKEMON },
      { min: 1, max: 1, allowCancel: true, blocked },
    ), selection => {
      if (!selection || selection.length === 0) {
        return;
      }

      const evolution = selection[0];
      if (!(evolution instanceof PokemonCard) || evolution.stage === Stage.BASIC) {
        return;
      }

      MOVE_CARDS(store, state, player.hand, cardList, { cards: [evolution], sourceCard: this });
      MOVE_CARDS(store, state, cardList, cardList, { cards: [this], sourceCard: this });
      this.shapeshiftAttached.push(evolution);

      ADD_MARKER(this.SHAPESHIFT_MARKER, player, this);
      ABILITY_USED(player, this);
      store.log(state, GameLog.LOG_PLAYER_ATTACHES_CARD, {
        name: player.name,
        card: evolution.name,
        pokemon: this.printed.name,
      });

      this.applyCopy(evolution);
    });
  }

  private discardEvolutionAttachment(
    store: StoreLike,
    state: State,
    player: ReturnType<typeof StateUtils.findOwner>,
    cardList: PokemonCardList,
  ): State {
    if (this.shapeshiftAttached.length === 0) {
      throw new GameError(GameMessage.CANNOT_USE_POWER);
    }

    this.discardShapeshiftAttachments(store, state, cardList, player);
    ABILITY_USED(player, this);
    return state;
  }

  private handleShapeshiftPower(
    store: StoreLike,
    state: State,
    effect: PowerEffect,
  ): State {
    const player = effect.player;
    const located = this.findOwnerAndList(state);
    if (!located || located.owner !== player) {
      throw new GameError(GameMessage.CANNOT_USE_POWER);
    }
    const { cardList } = located;

    if (this.isAsleepConfusedOrParalyzed(cardList)) {
      throw new GameError(GameMessage.CANNOT_USE_POWER);
    }

    if (IS_POKEMON_POWER_BLOCKED(store, state, player, this)) {
      throw new GameError(GameMessage.CANNOT_USE_POWER);
    }

    const hasAttached = this.shapeshiftAttached.some(c => cardList.cards.includes(c));
    const canAttach = !HAS_MARKER(this.SHAPESHIFT_MARKER, player, this)
      && this.getEvolutionCardsInHand(player).hasEvolution;

    if (!hasAttached && !canAttach) {
      throw new GameError(GameMessage.CANNOT_USE_POWER);
    }

    if (hasAttached) {
      return CONFIRMATION_PROMPT(store, state, player, wantToDiscard => {
        if (wantToDiscard) {
          this.discardEvolutionAttachment(store, state, player, cardList);
        }
      }, GameMessage.WANT_TO_DISCARD_CARDS);
    }

    return this.attachEvolutionFromHand(store, state, player, cardList);
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (this.isPowerLockProbe(effect)) {
      return state;
    }

    if (this.isShapeshiftPowerEffect(effect)) {
      return this.handleShapeshiftPower(store, state, effect);
    }

    if (
      effect instanceof PlayPokemonEffect
      && effect.target.getPokemonCard() === this
      && effect.pokemonCard !== this
      && this.shapeshiftAttached.length > 0
    ) {
      throw new GameError(GameMessage.CANNOT_EVOLVE);
    }

    if (
      (effect instanceof AddSpecialConditionsEffect || effect instanceof AddSpecialConditionsPowerEffect)
      && effect.target.cards.includes(this)
      && effect.specialConditions.some(c =>
        c === SpecialCondition.ASLEEP
        || c === SpecialCondition.CONFUSED
        || c === SpecialCondition.PARALYZED
      )
    ) {
      const located = this.findOwnerAndList(state);
      if (located && this.shapeshiftAttached.length > 0) {
        this.discardShapeshiftAttachments(store, state, located.cardList, located.owner);
      }
    }

    const copy = this.syncShapeshift(store, state);

    if (copy) {
      state = copy.reduceEffect.call(this, store, state, effect);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.SHAPESHIFT_MARKER, this);

    return state;
  }
}
