import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  PokemonType,
  TrainerType,
  CardTag,
} from '../../../game/store/card/card-types';
import {
  GameError,
  GameLog,
  GameMessage,
  Power,
  PowerType,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
  Player,
} from '../../../game';
import {
  AddSpecialConditionsEffect,
  DealDamageEffect,
  PutDamageEffect,
} from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect, RetreatEffect } from '../../../game/store/effects/game-effects';
import { PlayItemEffect, PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { GamePhase } from '../../../game/store/state/state';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class AntiqueArmorFossil extends TrainerCard {
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
  public evolvesTo = ['Shieldon'];
  public evolvesToStage = [];
  public archetype = [];
  public hp: number = 60;
  public weakness = [];
  public retreat = [];
  public resistance = [];
  public attacks = [];
  public maxTools: number = 1;
  public evolvesFromBase: string[] = [];

  public powers: Power[] = [
    {
      name: 'Antique Armor Fossil',
      text: `Play this card as if it were a 60-HP Basic [C] Pokémon. This card can't be affected by any Special Conditions and can't retreat. At any time during your turn, you may discard this card from play.`,
      useWhenInPlay: true,
      exemptFromAbilityLock: true,
      isFossil: true,
      powerType: PowerType.TRAINER_ABILITY,
    },
    {
      name: 'Protective Armor',
      powerType: PowerType.ABILITY,
      text: "While this Pokémon is in the Active Spot, all of your Pokémon take 10 less damage from attacks from your opponent's Pokémon.",
    },
  ];

  public set: string = 'PBL';
  public setNumber: string = '72';
  public regulationMark: string = 'J';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Antique Armor Fossil';
  public fullName: string = 'Antique Shield Fossil M5';

  private armorProtectionActive(
    store: StoreLike,
    state: State,
    defenderOwner: ReturnType<typeof StateUtils.findOwner>,
  ): boolean {
    const activeCard = defenderOwner.active.getPokemonCard();
    if (activeCard !== this) {
      return false;
    }
    try {
      store.reduceEffect(
        state,
        new PowerEffect(defenderOwner, this.powers[0], this as unknown as PokemonCard),
      );
    } catch {
      return false;
    }
    return true;
  }

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const openSlots = player.bench.filter((b) => b.cards.length === 0);
    if (openSlots.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AddSpecialConditionsEffect && effect.target.getPokemonCard() === this) {
      effect.preventDefault = true;
    }

    if (effect instanceof DealDamageEffect && state.phase === GamePhase.ATTACK) {
      const defenderOwner = StateUtils.findOwner(state, effect.target);
      const attackerOwner = StateUtils.findOwner(state, effect.source);
      if (
        defenderOwner !== attackerOwner &&
        attackerOwner === StateUtils.getOpponent(state, defenderOwner) &&
        this.armorProtectionActive(store, state, defenderOwner)
      ) {
        effect.damage = Math.max(0, effect.damage - 10);
      }
    }
    if (effect instanceof PutDamageEffect && state.phase === GamePhase.ATTACK) {
      const defenderOwner = StateUtils.findOwner(state, effect.target);
      const attackerOwner = StateUtils.findOwner(state, effect.source);
      if (
        defenderOwner !== attackerOwner &&
        attackerOwner === StateUtils.getOpponent(state, defenderOwner) &&
        this.armorProtectionActive(store, state, defenderOwner)
      ) {
        effect.reduceDamage(10, this.powers[0].name);
      }
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, {
        name: player.name,
        card: this.name,
        effect: this.powers[1].name,
      });
      const cardList = StateUtils.findCardList(state, this);
      MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
    }

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

    if (effect instanceof RetreatEffect && effect.player.active.getPokemonCard() === this) {
      throw new GameError(GameMessage.CANNOT_RETREAT);
    }

    return state;
  }
}
