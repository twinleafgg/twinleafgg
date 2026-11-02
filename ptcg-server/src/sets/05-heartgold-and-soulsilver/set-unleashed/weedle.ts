import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Weedle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Speed Evolution',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a card that evolves from Weedle and put it onto Weedle. (This counts as evolving Weedle.) Shuffle your deck afterward.'
  },
  {
    name: 'Sting',
    cost: [G],
    damage: 10,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '69';
  public name: string = 'Weedle';
  public fullName: string = 'Weedle UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Speed Evolution
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.deck.cards.length === 0) {
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_EVOLVE,
        player.deck,
        { superType: SuperType.POKEMON, evolvesFrom: this.name },
        { min: 0, max: 1, allowCancel: false }
      ), selected => {
        const cards: Card[] = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.active, { cards, sourceCard: this });
          player.active.clearEffects();
          player.active.pokemonPlayedTurn = state.turn;
        }
        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}
