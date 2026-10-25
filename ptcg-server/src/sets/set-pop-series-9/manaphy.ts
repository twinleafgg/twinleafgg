import { PokemonCard, CardType, Stage, CardList, ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../game';
import { AfterDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../game/store/prefabs/attack-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Manaphy extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: 20 }];
  public retreat = [C];

  public attacks = [{
    // Dive
    name: 'Dive',
    cost: [W],
    damage: 0,
    text: 'Look at the top 7 cards of your deck, choose 1 of them, and put it into your hand. Put the other cards back on top of your deck. Shuffle your deck afterward.'
  }, {
    // Water Glow
    name: 'Water Glow',
    cost: [W],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 20 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.) Remove from Manaphy the number of damage counters equal to the damage you did to that Pokémon.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Manaphy';
  public fullName: string = 'Manaphy OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dive
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.deck.cards.length === 0) {
        return state;
      }
      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, {
        count: Math.min(7, player.deck.cards.length),
        sourceCard: this
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
    // Water Glow
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(20, effect, store, state);
    }
    if (effect instanceof AfterDamageEffect && effect.attack === this.attacks[1]) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect.attackEffect, store, state, effect.damage);
    }
    return state;
  }
}
