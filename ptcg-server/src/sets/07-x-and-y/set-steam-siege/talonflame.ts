import {
  PokemonCard,
  Stage,
  CardType,
  PowerType,
  StoreLike,
  State,
  CardTag,
  ChooseCardsPrompt,
  GameMessage,
  ShuffleDeckPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Talonflame extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Fletchinder';

  protected _tags = [CardTag.PLAY_DURING_SETUP];

  public cardType: CardType[] = [C];

  public hp: number = 130;

  public weakness = [{ type: L }];

  public resistance = [{ type: F, value: -20 }];

  public retreat = [];

  public powers = [
    {
      name: 'Gale Wings',
      powerType: PowerType.ABILITY,
      text: 'If this Pokémon is in your hand when you are setting up to play, you may put it face down as your Active Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Aero Blitz',
      cost: [C],
      damage: 40,
      text: 'Search your deck for up to 2 cards and put them into your hand. Shuffle your deck afterward.',
    },
  ];

  public set: string = 'STS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '96';

  public name: string = 'Talonflame';

  public fullName: string = 'Talonflame STS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 1, max: 2, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });
        },
      );
      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });
    }
    return state;
  }
}
