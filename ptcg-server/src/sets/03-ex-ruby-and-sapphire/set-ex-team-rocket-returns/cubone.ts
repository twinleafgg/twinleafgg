import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, Card } from '../../../game';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {MULTIPLE_COIN_FLIPS_PROMPT, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cubone extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 50;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Look for Friends',
    cost: [C],
    damage: 0,
    text: 'Reveal cards from your deck until you reveal a Basic Pokémon. Show that card to your opponent and put it into your hand. Shuffle the other revealed cards into your deck. (If you don\'t reveal a Basic Pokémon, shuffle all the revealed cards back into your deck.)'
  }, {
    name: 'Bonemerang',
    cost: [F],
    damage: 10,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 10 damage times the number of heads.'
  }];

  public set: string = 'TRR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '51';
  public name: string = 'Cubone';
  public fullName: string = 'Cubone TRR';

  public reduceEffect(store: StoreLike, state: State, effect: AttackEffect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        return state;
      }

      const cards: Card[] = [];
      let pokemon: Card | undefined;
      for (let i = 0; i < player.deck.cards.length; i++) {
        const card = player.deck.cards[i];
        cards.push(card);

        if (card instanceof PokemonCard && card.stage === Stage.BASIC) {
          pokemon = card;
          break;
        }
      }

      SHOW_CARDS_TO_PLAYER(store, state, player, cards);
      SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);

      if (pokemon !== undefined) {
        MOVE_CARDS(store, state, player.deck, player.hand, { cards: [pokemon], sourceCard: this });
      }
      SHUFFLE_DECK(store, state, player);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        const heads = results.filter(r => r).length;
        effect.damage = 10 * heads;
      });
    }

    return state;
  }
}
