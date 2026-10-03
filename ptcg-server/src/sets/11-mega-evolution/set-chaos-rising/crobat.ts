import { CardType, Stage, SpecialCondition } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { StoreLike, State, GameError, GameMessage, ChooseCardsPrompt } from '../../../game';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { CardList } from '../../../game/store/state/card-list';
import {WAS_ATTACK_USED,
  WAS_POWER_USED,
  IS_ABILITY_BLOCKED,
  ABILITY_USED,
  USE_ABILITY_ONCE_PER_TURN,
  REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Crobat extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Golbat';
  public hp: number = 130;
  public cardType: CardType[] = [D];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Nighttime Maneuvers',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      text: 'Once during your turn, if this Pokémon is in the Active Spot, you may use this Ability. Search your deck for a card. Shuffle your deck, then put that card on top of it.',
    },
  ];

  public attacks = [
    {
      name: 'Poison Sound Wave',
      cost: [D],
      damage: 80,
      text: "Your opponent's Active Pokémon is now Confused and Poisoned.",
    },
  ];

  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '51';
  public name: string = 'Crobat';
  public fullName: string = 'Crobat M4';

  public readonly NIGHTTIME_MANEUVERS_MARKER = 'NIGHTTIME_MANEUVERS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.active.getPokemonCard() !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      USE_ABILITY_ONCE_PER_TURN(player, this.NIGHTTIME_MANEUVERS_MARKER, this);
      ABILITY_USED(player, this);
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARDS_TO_PUT_ON_TOP_OF_THE_DECK,
          player.deck,
          {},
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length === 0) return state;
          const deckTop = new CardList();
          MOVE_CARDS(store, state, player.deck, deckTop, { cards: cards, sourceCard: this });
          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
            if (order === null) return state;
            deckTop.applyOrder(order);
            deckTop.moveToTopOfDestination(player.deck);
            return state;
          });
        },
      );
    }
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.NIGHTTIME_MANEUVERS_MARKER, this);
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const specialConditionEffect = new AddSpecialConditionsEffect(effect, [
        SpecialCondition.CONFUSED,
        SpecialCondition.POISONED,
      ]);
      store.reduceEffect(state, specialConditionEffect);
    }
    return state;
  }
}
