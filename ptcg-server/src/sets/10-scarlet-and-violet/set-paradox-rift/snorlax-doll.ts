import {
  CardTag,
  CardType,
  GameError,
  GameLog,
  GameMessage,
  Player,
  PokemonType,
  Power,
  PowerType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect, RetreatEffect } from '../../../game/store/effects/game-effects';
import { PlayItemEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class SnorlaxDoll extends TrainerCard {
  protected _trainerType = TrainerType.ITEM;

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.COLORLESS];
  public cardTypez: CardType = CardType.COLORLESS;

  public movedToActiveThisTurn = false;
  public evolvesFromBase: string[] = [];
  public pokemonType = PokemonType.NORMAL;
  public evolvesFrom = '';
  public cardTag = [CardTag.PLAY_DURING_SETUP];
  public tools = [];
  public evolvesTo = [];
  public evolvesToStage = [];
  public archetype = [];
  public hp: number = 120;
  public weakness = [];
  public retreat = [];
  public resistance = [];
  public attacks = [];
  public set: string = 'PAR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '175';
  public name: string = 'Snorlax Doll';
  public fullName: string = 'Snorlax Doll PAR';
  public regulationMark = 'G';
  public maxTools: number = 1;
  public powers: Power[] = [
    {
      name: 'Snorlax Doll',
      text: `If this card is in your hand when you are setting up to play, you may put it face down in the Active Spot or on your Bench as if it were a 120-HP Basic [C] Pokémon. (You can do this only when you are setting up to play.) At any time during your turn, you may discard this card from play.

This card can't be affected by any Special Conditions and can't retreat. If this card is Knocked Out, your opponent can't take any Prize cards for it.`,
      useWhenInPlay: true,
      exemptFromAbilityLock: true,
      powerType: PowerType.TRAINER_ABILITY,
    },
  ];

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return false;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, {
        name: player.name,
        card: this.name,
        effect: 'Snorlax Doll',
      });

      const cardList = StateUtils.findCardList(state, this);
      MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
    }

    if (effect instanceof AddSpecialConditionsEffect && effect.target.getPokemonCard() === this) {
      effect.preventDefault = true;
    }

    if (effect instanceof PlayItemEffect && effect.trainerCard === this) {
      throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
    }

    if (effect instanceof KnockOutEffect && effect.target.getPokemonCard() === this) {
      effect.prizeCount = 0;
      return state;
    }

    if (effect instanceof RetreatEffect && effect.player.active.cards.includes(this)) {
      throw new GameError(GameMessage.CANNOT_RETREAT);
    }

    return state;
  }
}
