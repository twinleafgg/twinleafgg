import { PokemonCard, Stage, CardType, StoreLike, State, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt, ShowCardsPrompt, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard as PokemonCardType } from '../../../game/store/card/pokemon-card';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Fletchling extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 60;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Chirp',
    cost: [C],
    damage: 0,
    text: 'Search your deck for up to 2 Pokémon with [F] Resistance, reveal them, and put them into your hand. Then, shuffle your deck.'
  },
  {
    name: 'Peck',
    cost: [C, C],
    damage: 20,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '66';
  public name: string = 'Fletchling';
  public fullName: string = 'Fletchling M3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Chirp - search for Pokemon with Fire resistance
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Filter deck for Pokemon with Fire resistance
      const pokemonWithFightingResistance = player.deck.cards.filter(card =>
        card instanceof PokemonCardType &&
        card.resistance &&
        card.resistance.some(res => res.type === CardType.FIRE)
      );

      if (pokemonWithFightingResistance.length === 0) {
        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      }

      const maxToTake = Math.min(2, pokemonWithFightingResistance.length);

      // Block cards that don't have Fire resistance
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCardType) ||
          !card.resistance ||
          !card.resistance.some(res => res.type === CardType.FIGHTING)) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        {},
        { min: 0, max: maxToTake, allowCancel: false, blocked }
      ), selected => {
        const selectedCards = selected || [];
        MOVE_CARDS(store, state, player.deck, player.hand, { cards: selectedCards, sourceCard: this });

        // Show cards to opponent
        if (selectedCards.length > 0) {
          const opponent = StateUtils.getOpponent(state, player);
          store.prompt(state, new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            selectedCards
          ), () => state);
        }

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }

    return state;
  }
}
