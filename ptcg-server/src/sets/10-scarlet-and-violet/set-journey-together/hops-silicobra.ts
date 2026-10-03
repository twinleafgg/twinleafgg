import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  TrainerType,
} from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/game-effects';
import {
  ChooseCardsPrompt,
  GameMessage,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HopsSilicobra extends PokemonCard {
  public stage: Stage = Stage.BASIC;

  protected _tags = [CardTag.HOPS];

  public cardType: CardType[] = [F];

  public hp: number = 60;

  public weakness = [{ type: G }];

  public retreat = [C, C];

  public attacks = [
    {
      name: 'Turf Maker',
      cost: [C],
      damage: 0,
      text: 'Search your deck for a Stadium card, reveal it, and put it into your hand. Then, shuffle your deck.',
    },
    {
      name: 'Gnaw',
      cost: [F, C],
      damage: 20,
      text: '',
    },
  ];

  public regulationMark = 'I';

  public set: string = 'JTG';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '86';

  public name: string = "Hop's Silicobra";

  public fullName: string = "Hop's Silicobra JTG";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.TRAINER, trainerType: TrainerType.STADIUM },
          { min: 0, max: 1, allowCancel: false },
        ),
        (cards) => {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          if (cards.length > 0) {
            return store.prompt(
              state,
              new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
              () => {},
            );
          }

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }
    return state;
  }
}
