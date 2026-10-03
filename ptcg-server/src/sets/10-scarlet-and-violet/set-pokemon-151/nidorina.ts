import { CardType, PokemonCard,
  Stage,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  ShowCardsPrompt,
  State,
  StateUtils,
  StoreLike,
  SuperType,
  ShuffleDeckPrompt, } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Nidorina extends PokemonCard {
  public stage = Stage.STAGE_1;
  public evolvesFrom = 'Nidoran ♀';
  public cardType: CardType[] = [D];
  public hp = 90;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Fetch Family',
      cost: [D],
      damage: 0,
      text: 'Search your deck for up to 3 Pokémon, reveal them, and put them into your hand. Then, shuffle your deck.',
    },
    {
      name: 'Sharp Fang',
      cost: [D, C],
      damage: 50,
      text: '',
    },
  ];

  public set: string = 'MEW';
  public regulationMark = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '33';
  public name: string = 'Nidorina';
  public fullName: string = 'Nidorina MEW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 0, max: 3, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];

          if (cards.length > 0) {
            store.prompt(
              state,
              [new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards)],
              () => {
                MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });
              },
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
