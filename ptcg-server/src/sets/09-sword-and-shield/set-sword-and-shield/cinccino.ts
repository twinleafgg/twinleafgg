import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  GameError,
  GameMessage,
  ChooseCardsPrompt,
  SlotType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED,
  ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON,
  DRAW_CARDS,
  IS_ABILITY_BLOCKED,
  REMOVE_MARKER_AT_END_OF_TURN,
  USE_ABILITY_ONCE_PER_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cinccino extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Minccino';
  public regulationMark = 'D';
  public cardType: CardType[] = [C];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [
    {
      name: 'Make Do',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'You must discard a card from your hand in order to use this Ability. Once during your turn, you may draw 2 cards.',
    },
  ];

  public attacks = [
    {
      name: 'Energy Assist',
      cost: [CardType.COLORLESS],
      damage: 40,
      text: 'Attach a basic Energy card from your discard pile to 1 of your Benched Pokémon.',
    },
  ];

  public set: string = 'SSH';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '147';
  public name: string = 'Cinccino';
  public fullName: string = 'Cinccino SSH';

  // Copied from agent-generated card for better prefab use
  public readonly MAKE_DO_MARKER = 'CINCCINO_SHF_MAKE_DO_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Make Do
    // Ref: set-vivid-voltage/oranguru.ts (ChooseCardsPrompt from hand, then draw)
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      if (player.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.MAKE_DO_MARKER, this);
      ABILITY_USED(player, this);

      // Player must discard 1 card from hand
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
            DRAW_CARDS(store, state, player, 2);
          }
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.MAKE_DO_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON(store, state, player, 1, undefined, {
        destinationSlots: [SlotType.BENCH],
        energyFilter: { energyType: EnergyType.BASIC },
        min: 0,
      });
    }

    return state;
  }
}
