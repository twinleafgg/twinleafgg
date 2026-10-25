import { CardList, ChooseCardsPrompt, GameError, GameMessage, PokemonCardList, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Pichu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Baby Evolution',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may put Pikachu from your hand onto Pichu (this counts as evolving Pichu) and remove all damage counters from Pichu.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Baby Steps',
    cost: [],
    damage: 0,
    text: 'Look at the top 5 cards of your deck, choose 1 of them, and put it into your hand. Shuffle the other cards back into your deck.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Pichu';
  public fullName: string = 'Pichu AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Baby Evolution
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEvolution = player.hand.cards.some(card => card instanceof PokemonCard && card.name === 'Pikachu');
      if (!hasEvolution) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      const blocked: number[] = [];
      player.hand.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name !== 'Pikachu') {
          blocked.push(index);
        }
      });
      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_EVOLVE,
        player.hand,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: true, blocked }
      ), selected => {
        const selectedCards = selected || [];
        if (selectedCards.length === 0) {
          return;
        }
        const evolution = selectedCards[0] as PokemonCard;
        const target = StateUtils.findCardList(state, this);
        MOVE_CARDS(store, state, player.hand, target, { cards: [evolution], sourceCard: this });
        const pokemonTarget = target as PokemonCardList;
        pokemonTarget.clearEffects();
        pokemonTarget.pokemonPlayedTurn = state.turn;
        store.reduceEffect(state, new HealEffect(player, pokemonTarget, pokemonTarget.damage));
      });
    }

    // Baby Steps
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.deck.cards.length === 0) {
        return state;
      }
      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, {
        count: Math.min(5, player.deck.cards.length),
        sourceCard: this,
      });
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        deckTop,
        {},
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        MOVE_CARDS(store, state, deckTop, player.hand, { cards: selected || [], sourceCard: this });
        MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: this });
        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}
