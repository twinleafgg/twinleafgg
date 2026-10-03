import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, ShowCardsPrompt, ShuffleDeckPrompt, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Excadrill extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Drilbur';
  public cardType: CardType[] = [F];
  public hp: number = 120;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Rototiller',
      cost: [F],
      damage: 0,
      text: 'Shuffle 4 cards from your discard pile into your deck.'
    },
    {
      name: 'Slash',
      cost: [F, C, C],
      damage: 90,
      text: ''
    },
  ];

  public set: string = 'UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '119';
  public name: string = 'Excadrill';
  public fullName: string = 'Excadrill UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (player.discard.cards.length > 0) {
        const minCards = Math.min(4, player.discard.cards.length);
        state = store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          {},
          { min: minCards, max: 4, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          store.prompt(state, [new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            cards
          )], () => {
            MOVE_CARDS(store, state, player.discard, player.deck, { cards: cards, sourceCard: this });
          });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);
          });
        });
      }
    }
    return state;
  }
}