import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  ChooseCardsPrompt,
  StateUtils,
  GameMessage,
  ConfirmPrompt,
} from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LugiaV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V];

  public regulationMark = 'F';

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 220;

  public weakness = [{ type: CardType.LIGHTNING }];

  public resistance = [{ type: CardType.FIGHTING, value: -30 }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Read the Wind',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'Discard a card from your hand. If you do, draw 3 cards.',
    },
    {
      name: 'Aero Dive',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 130,
      text: 'You may discard a Stadium in play.',
    },
  ];

  public set: string = 'SIT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '138';

  public name: string = 'Lugia V';

  public fullName: string = 'Lugia V SIT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { allowCancel: false, min: 1, max: 1 },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
        },
      );

      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard !== undefined) {
        state = store.prompt(
          state,
          new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
          (wantToUse) => {
            if (wantToUse) {
              // Discard Stadium
              const cardList = StateUtils.findCardList(state, stadiumCard);
              const player = StateUtils.findOwner(state, cardList);
              MOVE_CARDS(store, state, cardList, player.discard, { sourceCard: this });
              return state;
            }
            return state;
          },
        );
      }
      return state;
    }
    return state;
  }
}
