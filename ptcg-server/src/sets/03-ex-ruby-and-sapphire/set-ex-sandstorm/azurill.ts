import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, StateUtils, PowerType, GameError, Card, ChooseCardsPrompt, PokemonCardList } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {AFTER_ATTACK, SEARCH_DECK_FOR_CARDS_TO_HAND, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { HealEffect } from '../../../game/store/effects/game-effects';

export class Azurill extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 40;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Baby Evolution',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may put Marill from your hand onto Azurill (this counts as evolving Azurill), and remove all damage counters from Azurill.'
  }];

  public attacks = [{
    name: 'Jump Catch',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a Trainer card, show it to your opponent, and put it into your hand. Shuffle your deck afterward.'
  }];

  public set = 'SS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '31';
  public name = 'Azurill';
  public fullName = 'Azurill SS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasElectabuzz = player.hand.cards.some(card => card instanceof PokemonCard && card.name === 'Electabuzz');

      // Check if Electabuzz is in the player's hand
      if (!hasElectabuzz) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Blocking pokemon cards, that cannot be valid evolutions
      const blocked: number[] = [];
      player.hand.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name !== 'Electabuzz') {
          blocked.push(index);
        }
      });

      let selectedCards: Card[] = [];
      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_EVOLVE,
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

        // Heal all damage from the evolved Pokemon
        const healEffect = new HealEffect(player, pokemonTarget, pokemonTarget.damage);
        store.reduceEffect(state, healEffect);

        return state;
      });
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      SEARCH_DECK_FOR_CARDS_TO_HAND(store, state, effect.player, this, { superType: SuperType.TRAINER }, { min: 1, max: 1 });
    }

    return state;
  }

}