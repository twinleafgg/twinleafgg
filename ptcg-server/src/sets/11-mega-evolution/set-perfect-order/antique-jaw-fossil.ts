import {
  TrainerCard,
  TrainerType,
  Stage,
  CardType,
  PokemonType,
  CardTag,
  Power,
  PowerType,
  StoreLike,
  State,
  Player,
  GameLog,
  StateUtils,
  GameError,
  GameMessage,
  PokemonCard,
  GamePhase,
} from '../../../game';
import {
  AddSpecialConditionsEffect,
  PutDamageEffect,
} from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { RetreatEffect } from '../../../game/store/effects/game-effects';
import { PlayItemEffect, PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {
  WAS_POWER_USED,
  IS_ABILITY_BLOCKED,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';

export class AntiqueJawFossil extends TrainerCard {
  protected _trainerType = TrainerType.ITEM;
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.COLORLESS];
  public cardTypez: CardType = CardType.COLORLESS;
  public movedToActiveThisTurn = false;
  public pokemonType = PokemonType.NORMAL;
  public evolvesFrom = '';
  public cardTag = [];
  protected _tags = [CardTag.ANTIQUE];
  public tools = [];
  public evolvesTo = [];
  public evolvesToStage = [];
  public archetype = [];
  public hp: number = 60;
  public weakness = [];
  public retreat = [];
  public resistance = [];
  public attacks = [];
  public attacksThisTurn: number = 0;
  public maxAttacksThisTurn: number = 1;
  public allowSubsequentAttackChoice: boolean = false;
  public evolvesFromBase: string[] = [];
  public maxTools: number = 1;

  public powers: Power[] = [
    {
      name: 'Antique Jaw Fossil',
      text: "Play this card as a 60 HP Basic [C] Pokémon. This card can't be affected by Special Conditions and can't retreat. At any time during your turn, you may discard this card from play.",
      useWhenInPlay: true,
      exemptFromAbilityLock: true,
      isFossil: true,
      powerType: PowerType.TRAINER_ABILITY,
    },
    {
      name: 'Intimidating Jaw',
      powerType: PowerType.ABILITY,
      text: "As long as this Pokémon is in the Active Spot, attacks used by your opponent's Active Pokémon do 30 less damage (before applying Weakness and Resistance).",
    },
  ];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '68';
  public name: string = 'Antique Jaw Fossil';
  public fullName: string = 'Antique Jaw Fossil M3';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const openSlots = player.bench.filter((b) => b.cards.length === 0);
    if (openSlots.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Discard from play
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, {
        name: player.name,
        card: this.name,
        effect: 'Antique Jaw Fossil',
      });
      const cardList = StateUtils.findCardList(state, this);
      MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
    }

    // Play as Pokemon
    if (effect instanceof PlayItemEffect && effect.trainerCard === this) {
      const player = effect.player;
      const emptySlots = player.bench.filter((b) => b.cards.length === 0);
      if (emptySlots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      const playPokemonEffect = new PlayPokemonEffect(
        player,
        this as unknown as PokemonCard,
        emptySlots[0],
      );
      store.reduceEffect(state, playPokemonEffect);
    }

    // Prevent retreat
    if (effect instanceof RetreatEffect && effect.player.active.getPokemonCard() === this) {
      throw new GameError(GameMessage.CANNOT_RETREAT);
    }

    // Prevent special conditions
    if (effect instanceof AddSpecialConditionsEffect && effect.target.getPokemonCard() === this) {
      effect.preventDefault = true;
    }

    // Reduce damage by 30 when active
    if (effect instanceof PutDamageEffect && effect.target.cards.includes(this)) {
      const pokemonCard = effect.target.getPokemonCard();
      if (pokemonCard !== this) {
        return state;
      }

      // It's not an attack
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      const player = StateUtils.findOwner(state, effect.target);
      const opponent = StateUtils.getOpponent(state, player);

      // Only reduce damage if this is active and opponent's active is attacking
      if (effect.target !== player.active || effect.source !== opponent.active) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      effect.damage = Math.max(0, effect.damage - 30);
    }

    return state;
  }
}
