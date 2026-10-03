import { Card, CardType, ChooseCardsPrompt, GameMessage, PokemonCard, PokemonCardList, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Sandshrew extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 60;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Ascension',
    cost: [F],
    damage: 0,
    text: 'Search your deck for a card that evolves from this Pokemon and put it onto this Pokemon to evolve it. Then, shuffle your deck.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M6';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '35';
  public name: string = 'Sandshrew';
  public fullName: string = 'Sandshrew M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ascension
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.evolvesFrom === this.name) {
          return;
        }
        blocked.push(index);
      });

      const hasEvolution = player.deck.cards.some(
        card => card instanceof PokemonCard && card.evolvesFrom === this.name,
      );

      if (!hasEvolution) {
        SHUFFLE_DECK(store, state, player);
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_EVOLVE,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 0, max: 1, allowCancel: true, blocked },
      ), (selected: Card[] | null) => {
        const cards = selected || [];
        if (cards.length > 0) {
          const evolutionCard = cards[0] as PokemonCard;
          const pokemonCardList = StateUtils.findCardList(state, this) as PokemonCardList;
          MOVE_CARDS(store, state, player.deck, pokemonCardList, { cards: [evolutionCard], sourceCard: this });
          pokemonCardList.clearEffects();
          pokemonCardList.pokemonPlayedTurn = state.turn;
        }
        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}
