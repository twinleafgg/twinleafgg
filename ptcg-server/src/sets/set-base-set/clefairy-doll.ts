import {
  GameError,
  GameLog,
  GameMessage,
  PokemonCard,
  PowerType,
  StateUtils,
  TrainerCard,
} from '../../game';
import { CardType, PokemonType, Stage, TrainerType } from '../../game/store/card/card-types';
import { AddSpecialConditionsEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { KnockOutEffect, RetreatEffect } from '../../game/store/effects/game-effects';
import { PlayItemEffect, PlayPokemonEffect } from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { WAS_POWER_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class ClefairyDoll extends TrainerCard {
  public name = 'Clefairy Doll';
  public cardImage: string = 'assets/cardback.png';
  public setNumber = '70';
  public set = 'BS';
  public fullName = 'Clefairy Doll BS';

  public evolvesFrom = '';
  public cardTag = [];
  public tools = [];
  public archetype = [];
  public evolvesTo = [];
  public evolvesToStage = [];
  protected _trainerType = TrainerType.ITEM;
  public hp = 10;
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public movedToActiveThisTurn = false;
  public pokemonType = PokemonType.NORMAL;
  public attacksThisTurn: number = 0;
  public maxAttacksThisTurn: number = 1;
  public allowSubsequentAttackChoice: boolean = false;
  public evolvesFromBase: string[] = [];
  public maxTools: number = 1;
  public weakness = [];
  public resistance = [];
  public retreat = [];

  public attacks = [];

  public powers = [
    {
      name: 'Clefairy Doll',
      powerType: PowerType.TRAINER_ABILITY,
      useWhenInPlay: true,
      exemptFromAbilityLock: true,
      text: "Play Clefairy Doll as if it were a Basic Pokémon. While in play, Clefairy Doll counts a a Pokémon (instead of a Trainer card). Clefairy Doll has no attacks, can't retreat, and can't be Asleep, Confused, Paralyzed, or Poisoned. If Clefairy Doll is Knocked Out, it doesn't count as a Knocked Out Pokémon. At any time during your turn before your attack, you may discard Clefairy Doll.",
    },
  ];

  // public text = 'Play Clefairy Doll as if it were a Basic Pokémon. While in play, Clefairy Doll counts a a Pokémon (instead of a Trainer card). Clefairy Doll has no attacks, can\'t retreat, and can\'t be Asleep, Confused, Paralyzed, or Poisoned. If Clefairy Doll is Knocked Out, it doesn\'t count as a Knocked Out Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Clefairy Doll can't be affected by special conditions
    if (effect instanceof AddSpecialConditionsEffect && effect.target.getPokemonCard() === this) {
      effect.preventDefault = true;
    }

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

    if (effect instanceof PlayItemEffect && effect.trainerCard === this) {
      const player = effect.player;

      const emptySlots = player.bench.filter((b) => b.cards.length === 0);
      if (emptySlots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const playPokemonEffect = new PlayPokemonEffect(player, this as PokemonCard, emptySlots[0]);
      store.reduceEffect(state, playPokemonEffect);
    }

    if (effect instanceof KnockOutEffect && effect.target.getPokemonCard() === this) {
      effect.prizeCount = 0;
      return state;
    }

    if (effect instanceof RetreatEffect && effect.player.active.getPokemonCard() === this) {
      throw new GameError(GameMessage.CANNOT_RETREAT);
    }

    return state;
  }
}
