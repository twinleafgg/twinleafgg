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
  Player,
  Power,
  PowerType,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
} from '../../../game';
import { PowerEffect, RetreatEffect } from '../../../game/store/effects/game-effects';
import { PlayItemEffect, PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {IS_ABILITY_BLOCKED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import {
  AddSpecialConditionsEffect,
  PutDamageEffect,
} from '../../../game/store/effects/attack-effects';

export class AntiquePlumeFossil extends TrainerCard {
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
  public archetype = [];
  public hp: number = 60;
  public weakness = [];
  public retreat = [];
  public resistance = [];
  public attacks = [];
  public maxTools: number = 1;
  public evolvesTo = [];
  public evolvesToStage = [];
  public evolvesFromBase: string[] = [];

  public powers: Power[] = [
    {
      name: 'Antique Plume Fossil',
      text: "Play this card as if it were a 60-HP [C] Basic Pokémon. This card can't be affected by any Special Conditions and can't retreat. At any time during your turn, you may discard this card from play.",
      useWhenInPlay: true,
      exemptFromAbilityLock: true,
      isFossil: true,
      powerType: PowerType.TRAINER_ABILITY,
    },
    {
      name: 'Plume Protection',
      text: "As long as this Pokémon is on your Bench, prevent all damage done to this Pokémon by attacks from your opponent's Pokémon.",
      powerType: PowerType.ABILITY,
    },
  ];

  public regulationMark = 'I';
  public set: string = 'WHT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '79';
  public name: string = 'Antique Plume Fossil';
  public fullName: string = 'Antique Plume Fossil SV11W';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const openSlots = player.bench.filter((b) => b.cards.length === 0);
    if (openSlots.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: any): State {
    // Discard from play
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, {
        name: player.name,
        card: this.name,
        effect: 'Antique Plume Fossil',
      });

      const cardList = StateUtils.findCardList(state, this);
      MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
    }

    // Play fossil from hand ability
    if (effect instanceof PlayItemEffect && effect.trainerCard === this) {
      const player = effect.player;

      const emptySlots = player.bench.filter((b) => b.cards.length === 0);
      if (emptySlots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const playPokemonEffect = new PlayPokemonEffect(player, this as PokemonCard, emptySlots[0]);
      store.reduceEffect(state, playPokemonEffect);
    }

    // Static Fossil effects
    if (effect instanceof RetreatEffect && effect.player.active.getPokemonCard() === this) {
      throw new GameError(GameMessage.CANNOT_RETREAT);
    }

    if (effect instanceof AddSpecialConditionsEffect && effect.target.getPokemonCard() === this) {
      effect.preventDefault = true;
    }

    // Plume Protection
    // Ref: set-ultra-prism/magnemite.ts (Solid Unit)
    if (effect instanceof PutDamageEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Target is not Active
      if (effect.target === player.active || effect.target === opponent.active) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      // Target is this Pokémon
      if (effect.target.cards.includes(this) && effect.target.getPokemonCard() === this) {
        // Try to reduce PowerEffect, to check if something is blocking our ability
        try {
          const stub = new PowerEffect(
            player,
            {
              name: 'test',
              powerType: PowerType.ABILITY,
              text: '',
            },
            this,
          );
          store.reduceEffect(state, stub);
        } catch {
          return state;
        }

        effect.preventDefault = true;
      }
    }

    return state;
  }
}
