import {
  PokemonCard,
  CardTag,
  Stage,
  CardType,
  PowerType,
  StoreLike,
  State,
  ConfirmPrompt,
  GameMessage,
  SpecialCondition,
  PlayerType,
} from '../../../game';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RadiantVenusaur extends PokemonCard {
  protected _tags = [CardTag.RADIANT];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 150;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Sunny Bloom',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once at the end of your turn (after your attack), you may use this Ability. Draw cards until you have 4 cards in your hand.',
    },
  ];

  public attacks = [
    {
      name: 'Pollen Hazard',
      cost: [CardType.GRASS, CardType.GRASS, CardType.COLORLESS],
      damage: 90,
      text: "Your opponent's Active Pokémon is now Burned, Confused, and Poisoned.",
    },
  ];

  public regulationMark = 'F';

  public set: string = 'PGO';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '4';

  public name: string = 'Radiant Venusaur';

  public fullName: string = 'Radiant Venusaur PGO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const specialCondition = new AddSpecialConditionsEffect(effect, [
        SpecialCondition.BURNED,
        SpecialCondition.CONFUSED,
        SpecialCondition.POISONED,
      ]);
      store.reduceEffect(state, specialCondition);
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;

      let hasVenusaurInPlay = false;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          hasVenusaurInPlay = true;
        }
      });

      if (!hasVenusaurInPlay) {
        return state;
      }

      if (hasVenusaurInPlay) {
        if (player.hand.cards.length < 4) {
          state = store.prompt(
            state,
            new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
            (wantToUse) => {
              if (wantToUse) {
                const player = effect.player;

                while (player.hand.cards.length < 4) {
                  if (player.deck.cards.length === 0) {
                    break;
                  }
                  MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
                }
                return state;
              }
            },
          );
        }
        return state;
      }
    }
    return state;
  }
}
