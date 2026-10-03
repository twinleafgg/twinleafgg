import {
  GameError,
  GameLog,
  GameMessage,
  PokemonCard,
  Power,
  PowerType,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
} from '../../..';
import {
  CardType,
  PokemonType,
  Stage,
  SuperType,
  TrainerType,
} from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect, RetreatEffect } from '../../../game/store/effects/game-effects';
import { PlayItemEffect, PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class LilliesPokeDoll extends TrainerCard {
  protected _trainerType = TrainerType.ITEM;
  public superType = SuperType.TRAINER;

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
  public hp: number = 30;
  public weakness = [];
  public retreat = [];
  public resistance = [];
  public attacks = [];
  public attacksThisTurn: number = 0;
  public maxAttacksThisTurn: number = 1;
  public allowSubsequentAttackChoice: boolean = false;
  public evolvesFromBase: string[] = [];
  public maxTools: number = 1;
  public set: string = 'CEC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '197';
  public name: string = "Lillie's Poké Doll";
  public fullName: string = "Lillie's Poké Doll CEC";

  public powers: Power[] = [
    {
      name: "Lillie's Poké Doll",
      text: `Play this card as if it were a 30-HP [C] Basic Pokémon. At any time during your turn (before your attack), if this Pokémon is your Active Pokémon, you may discard all cards from it and put it on the bottom of your deck.

This card can't retreat. If this card is Knocked Out, your opponent can't take any Prize cards for it.`,
      useWhenInPlay: true,
      exemptFromAbilityLock: true,
      powerType: PowerType.TRAINER_ABILITY,
    },
  ];

  // public text =
  //   'Play this card as if it were a 30-HP [C] Basic Pokémon. At any time during your turn (before your attack), if this Pokémon is your Active Pokémon, you may discard all cards from it and put it on the bottom of your deck.' +
  //   '' +
  //   'This card can\'t retreat. If this card is Knocked Out, your opponent can\'t take any Prize cards for it.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const pokeDollCardList = StateUtils.findCardList(state, this);

      if (player.active.cards[0] !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      store.log(state, GameLog.LOG_PLAYER_PUTS_CARD_ON_BOTTOM_OF_DECK, {
        name: player.name,
        card: this.name,
      });

      // Move Lillie's Poke Doll to bottom of deck
      state = MOVE_CARDS(store, state, pokeDollCardList, player.deck, {
        cards: [this],
        toBottom: true,
      });

      // Move any attached cards to discard
      state = MOVE_CARDS(store, state, pokeDollCardList, player.discard, {
        cards: pokeDollCardList.cards.filter((c) => c !== this),
      });
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

    if (effect instanceof RetreatEffect && effect.player.active.cards.includes(this)) {
      throw new GameError(GameMessage.CANNOT_RETREAT);
    }

    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this)) {
      effect.prizeCount = 0;
      return state;
    }

    if (effect instanceof RetreatEffect && effect.player.active.cards.includes(this)) {
      throw new GameError(GameMessage.CANNOT_RETREAT);
    }

    return state;
  }
}
