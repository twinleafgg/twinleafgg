import {
  TrainerCard,
  TrainerType,
  Stage,
  CardType,
  PokemonType,
  Power,
  PowerType,
  StoreLike,
  State,
  GameLog,
  StateUtils,
  GameError,
  GameMessage,
  PokemonCard,
  GamePhase,
} from '../../../game';
import {
  AddSpecialConditionsEffect,
  AfterDamageEffect,
} from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { RetreatEffect, KnockOutEffect } from '../../../game/store/effects/game-effects';
import { PlayItemEffect, PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {
  IS_POKEBODY_BLOCKED,
  WAS_POWER_USED,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';

export class ClawFossil extends TrainerCard {
  protected _trainerType = TrainerType.ITEM;

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.COLORLESS];
  public cardTypez: CardType = CardType.COLORLESS;

  public movedToActiveThisTurn = false;

  public pokemonType = PokemonType.NORMAL;
  public evolvesFrom = '';
  public cardTag = [];
  public tools = [];
  public evolvesTo = [];
  public evolvesToStage = [];
  public archetype = [];
  public hp: number = 40;
  public weakness = [];
  public retreat = [];
  public resistance = [];
  public attacks = [];
  public attacksThisTurn: number = 0;
  public maxAttacksThisTurn: number = 1;
  public allowSubsequentAttackChoice: boolean = false;
  public evolvesFromBase: string[] = [];
  public maxTools: number = 1;
  public set: string = 'PK';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '84';
  public name: string = 'Claw Fossil';
  public fullName: string = 'Claw Fossil PK';

  public powers: Power[] = [
    {
      name: 'Claw Fossil',
      text: "Play Claw Fossil as if it were a Basic Pokémon. While in play, Claw Fossil counts as a [C] Pokémon (instead of a Trainer card). Claw Fossil has no attacks of its own, can't retreat, and can't be affected by any Special Conditions. If Claw Fossil is Knocked Out, it doesn't count as a Knocked Out Pokémon. (Discard it anyway.) At any time during your turn before your attack, you may discard Claw Fossil from play.",
      useWhenInPlay: true,
      exemptFromAbilityLock: true,
      isFossil: true,
      powerType: PowerType.TRAINER_ABILITY,
    },
    {
      name: 'Jagged Stone',
      text: "If Claw Fossil is your Active Pokémon and is damaged by an opponent's attack (even if Claw Fossil is Knocked Out), put 1 damage counter on the Attacking Pokémon.",
      powerType: PowerType.POKEBODY,
      isFossil: true,
    },
  ];

  // public text =
  //   'Play Claw Fossil as if it were a Basic Pokémon. While in play, Claw Fossil counts as a Pokémon (instead of a Trainer card). Claw Fossil has no attacks, can\'t retreat, and can\'t be Asleep, Confused, Paralyzed, or Poisoned. If Claw Fossil is Knocked Out, it doesn\'t count as a Knocked Out Pokémon. (Discard it anyway.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const cardList = effect.player.active;
      const player = effect.player;

      store.log(state, GameLog.LOG_PLAYER_PUTS_CARD_IN_HAND, {
        name: effect.player.name,
        card: this.name,
      });

      if (player.bench.every((b) => b.cards.length === 0)) {
        // technical implementation does not matter exactly because this ends the game
        MOVE_CARDS(store, state, effect.player.active, player.deck, {
          cards: effect.player.active.cards,
          sourceCard: this,
        });
      } else {
        player.switchPokemon(cardList);
        const mysteriousFossilCardList = StateUtils.findCardList(state, this);
        MOVE_CARDS(store, state, mysteriousFossilCardList, effect.player.discard, {
          cards: mysteriousFossilCardList.cards.filter((c) => c === this),
          sourceCard: this,
        });
        MOVE_CARDS(store, state, mysteriousFossilCardList, effect.player.discard, {
          cards: mysteriousFossilCardList.cards.filter((c) => c !== this),
          sourceCard: this,
        });
      }
    }

    if (effect instanceof KnockOutEffect && effect.target.getPokemonCard() === this) {
      effect.prizeCount = 0;
    }

    if (effect instanceof PlayItemEffect && effect.trainerCard === this) {
      const player = effect.player;

      const emptySlots = player.bench.filter((b) => b.cards.length === 0);
      if (emptySlots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const playPokemonEffect = new PlayPokemonEffect(player, this as PokemonCard, emptySlots[0]);
      store.reduceEffect(state, playPokemonEffect);
    }

    if (effect instanceof AddSpecialConditionsEffect && effect.target.getPokemonCard() === this) {
      effect.preventDefault = true;
    }

    if (effect instanceof KnockOutEffect && effect.player.active.getPokemonCard() === this) {
      effect.prizeCount = 0;
      return state;
    }

    if (effect instanceof RetreatEffect && effect.player.active.getPokemonCard() === this) {
      throw new GameError(GameMessage.CANNOT_RETREAT);
    }

    if (effect instanceof AfterDamageEffect && effect.target.getPokemonCard() === this) {
      const player = effect.player;
      const targetPlayer = StateUtils.findOwner(state, effect.target);

      if (effect.damage <= 0 || player === targetPlayer || targetPlayer.active !== effect.target) {
        return state;
      }

      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (state.phase === GamePhase.ATTACK) {
        effect.source.damage += 10;
      }
    }

    return state;
  }
}
