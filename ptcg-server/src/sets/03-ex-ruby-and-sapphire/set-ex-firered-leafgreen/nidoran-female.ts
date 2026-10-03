import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, Card } from '../../../game';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class NidoranFemale extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 50;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Look for Friends',
      cost: [C],
      damage: 0,
      text: 'Reveal cards from your deck until you reveal a Basic Pokémon. Show that card to your opponent and put it into your hand. Shuffle the other revealed cards into your deck. (If you don\'t reveal a Basic Pokémon, shuffle all the revealed cards back into your deck.)'
    },
    {
      name: 'Bite',
      cost: [C, C],
      damage: 20,
      text: ''
    }
  ];

  public set: string = 'RG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '70';
  public name: string = 'Nidoran ♀';
  public fullName: string = 'Nidoran F RG';

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

    return state;
  }
}
