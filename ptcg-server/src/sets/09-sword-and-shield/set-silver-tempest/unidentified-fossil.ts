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
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { RetreatEffect } from '../../../game/store/effects/game-effects';
import { PlayItemEffect, PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class UnidentifiedFossil extends TrainerCard {
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
  public hp: number = 60;
  public weakness = [];
  public retreat = [];
  public resistance = [];
  public attacks = [];
  public set: string = 'SIT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '165';
  public name: string = 'Unidentified Fossil';
  public fullName: string = 'Unidentified Fossil SIT';
  public regulationMark = 'F';
  public maxTools: number = 1;
  public evolvesFromBase: string[] = [];

  public powers: Power[] = [
    {
      name: 'Unidentified Fossil',
      text: `Play this card as if it were a 60-HP [C] Basic Pokémon. At any time during your turn (before your attack), you may discard this card from play.

This card can't retreat.`,
      useWhenInPlay: true,
      exemptFromAbilityLock: true,
      isFossil: true,
      powerType: PowerType.TRAINER_ABILITY,
    },
  ];

  // public text =
  //   'Play this card as if it were a 60-HP [C] Basic Pokémon.' +
  //   '' +
  //   'This card can\'t retreat.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, {
        name: player.name,
        card: this.name,
        effect: 'Unidentified Fossil',
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
