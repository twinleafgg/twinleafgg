import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, PlayerType, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Shelmet extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 60;
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Mysterious Evolution',
      cost: [C],
      damage: 0,
      text: 'If Karrablast is in play, search your deck for a card that evolves from this Pokémon and put it onto this Pokémon. (This counts as evolving this Pokémon.) Shuffle your deck afterward.'
    },
    {
      name: 'Ram',
      cost: [G],
      damage: 10,
      text: ''
    }
  ];

  public set: string = 'NVI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Shelmet';
  public fullName: string = 'Shelmet NVI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Check if Karrablast is in play (anywhere for either player)
      let karrablastInPlay = false;
      state.players.forEach(p => {
        p.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard()?.name === 'Karrablast') {
            karrablastInPlay = true;
          }
        });
        p.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
          if (cardList.getPokemonCard()?.name === 'Karrablast') {
            karrablastInPlay = true;
          }
        });
      });

      if (!karrablastInPlay || player.deck.cards.length === 0) {
        return state;
      }

      // Build blocked list - block cards that don't evolve from Shelmet
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard) || card.evolvesFrom !== 'Shelmet') {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_EVOLVE,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 0, max: 1, allowCancel: true, blocked }
      ), cards => {
        if (cards && cards.length > 0) {
          const evolutionCard = cards[0] as PokemonCard;
          MOVE_CARDS(store, state, player.deck, player.active, { cards: [evolutionCard], sourceCard: this });
          player.active.clearEffects();
          player.active.pokemonPlayedTurn = state.turn;
        }
        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}
