import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, CardList, PlayerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { OrderCardsPrompt } from '../../../game/store/prompts/order-cards-prompt';

export class Reuniclus extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Duosion';
  public cardType: CardType[] = [P];
  public hp: number = 90;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Future Sight',
      cost: [P],
      damage: 0,
      text: 'Look at the top 5 cards of your deck and put them back on top of your deck in any order.'
    },
    {
      name: 'Net Force',
      cost: [P],
      damage: 40,
      damageCalculation: 'x',
      text: 'Does 40 damage times the number of Reuniclus you have in play.'
    }
  ];

  public set: string = 'NVI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '52';
  public name: string = 'Reuniclus';
  public fullName: string = 'Reuniclus NVI 52';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      const deckTop = new CardList();
      const cardsToLook = Math.min(5, player.deck.cards.length);
      MOVE_CARDS(store, state, player.deck, deckTop, { count: cardsToLook, sourceCard: this });

      return store.prompt(state, new OrderCardsPrompt(
        player.id,
        GameMessage.CHOOSE_CARDS_ORDER,
        deckTop,
        { allowCancel: false }
      ), order => {
        if (order === null) {
          return state;
        }

        deckTop.applyOrder(order);
        deckTop.moveToTopOfDestination(player.deck);
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let reuniclusCount = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const pokemonCard = cardList.getPokemonCard();
        if (pokemonCard && pokemonCard.name === 'Reuniclus') {
          reuniclusCount++;
        }
      });

      (effect as AttackEffect).damage = 40 * reuniclusCount;
    }

    return state;
  }
}
