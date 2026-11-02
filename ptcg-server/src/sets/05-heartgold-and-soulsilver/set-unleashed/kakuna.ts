import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Kakuna extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Weedle';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Speed Evolution',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a card that evolves from Kakuna and put it onto Kakuna. (This counts as evolving Kakuna.) Shuffle your deck afterward.'
  },
  {
    name: 'Poison Sting',
    cost: [G],
    damage: 0,
    text: 'The Defending Pokémon is now Poisoned.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '32';
  public name: string = 'Kakuna';
  public fullName: string = 'Kakuna UL';

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

    // Poison Sting
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    return state;
  }
}
