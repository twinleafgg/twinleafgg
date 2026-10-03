import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../game/store/card/card-types';
import { StoreLike, State, Card, ChooseCardsPrompt, GameMessage, PowerType, GameError, PokemonCardList, StateUtils, ShuffleDeckPrompt } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import {WAS_POWER_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { CheckTableStateEffect } from '../../game/store/effects/check-effects';

export class BuriedFossil extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 30;
  public retreat = [C];

  public powers = [
    {
      name: 'Evolution',
      powerType: PowerType.TRAINER_ABILITY,
      useWhenInPlay: true,
      text: 'You may play a Pokémon card that evolves from Mysterious Fossil on top of Buried Fossil. (This counts as evolving Buried Fossil.) Buried Fossil can\'t be affected by Special Conditions.'
    },
    {
      name: 'Reconstruction',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: 'Once during your turn (before your attack), if you have a basic Energy card in your hand, you may search your deck for an Omanyte or Kabuto card, show it to your opponent, and put it into your hand. Then put a basic Energy card from your hand into your deck. Shuffle your deck afterward.'
    }
  ];

  public set: string = 'SK';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '47';
  public name: string = 'Buried Fossil';
  public fullName: string = 'Buried Fossil SK';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Cannot be affected by Special Conditions
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach(player => {
        const activeCard = player.active.getPokemonCard();

        if (player.active.specialConditions.length === 0 || (activeCard && activeCard.name !== 'Buried Fossil')) {
          return state;
        }

        const conditions = player.active.specialConditions.slice();
        conditions.forEach(condition => {
          player.active.removeSpecialCondition(condition);
        });
      });
      return state;
    }

    // Evolution ruling power thing
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEvolution = player.hand.cards.some(card => card instanceof PokemonCard && card.evolvesFrom === 'Mysterious Fossil');
      
      // Check if evo is in the player's hand
      if (!hasEvolution) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (state.turn === (this.cards as PokemonCardList).pokemonPlayedTurn) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Blocking pokemon cards, that cannot be valid evolutions
      const blocked: number[] = [];
      player.hand.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.evolvesFrom !== 'Mysterious Fossil') {
          blocked.push(index);
        }
      });

      let selectedCards: Card[] = [];
      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_POKEMON,
        player.hand,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: true, blocked }
      ), selected => {
        selectedCards = selected || [];

        const evolution = selectedCards[0] as PokemonCard;

        const target = StateUtils.findCardList(state, this);

        // Evolve Pokemon
        MOVE_CARDS(store, state, player.hand, target, { cards: [evolution], sourceCard: this });
        const pokemonTarget = target as PokemonCardList;
        pokemonTarget.clearEffects();
        pokemonTarget.pokemonPlayedTurn = state.turn;

        return state;
      });
    }

    // Reconstruction
    if (WAS_POWER_USED(effect, 1, this)) {
      const player = effect.player;

      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_SHUFFLE,
        player.hand,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { allowCancel: false, min: 1, max: 1 }
      ), selected => {
        if (selected) {
          selected.forEach(card => {
            MOVE_CARDS(store, state, player.hand, player.deck, { cards: [card], sourceCard: this });
          });
        }

        const blocked: number[] = [];
        player.deck.cards.forEach((card, index) => {
          if (card instanceof PokemonCard && (card.name !== 'Omanyte' && card.name !== 'Kabuto')) {
            blocked.push(index);
          }
        });

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_POKEMON,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 0, max: 1, allowCancel: false, blocked }
        ), selectedCards => {
          if (selectedCards && selectedCards.length > 0) {
            const selectedCard = selectedCards[0];
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: [selectedCard], sourceCard: this });
          }

          store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);
          });
        });
      });
      return state;
    }
    return state;
  }
}
