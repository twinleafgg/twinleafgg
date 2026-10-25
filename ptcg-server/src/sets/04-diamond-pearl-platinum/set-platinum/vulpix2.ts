import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, PlayerType, State, StoreLike, pokemonHasCardType } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SEARCH_DECK_FOR_CARDS_TO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Vulpix2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Find Wildfire',
    cost: [],
    damage: 0,
    text: 'Search your deck for up to 2 Fire Energy cards, show them to your opponent, and put them in your hand. Shuffle your deck afterward.'
  }, {
    name: 'Brushfire',
    cost: [R],
    damage: 10,
    text: 'Does 10 damage to each of your opponent\'s Benched Grass Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Inflame',
    cost: [R, C],
    damage: 30,
    text: 'Discard a Fire Energy card from your hand. (If you can\'t discard a card from your hand, this attack does nothing.)'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH6';
  public name: string = 'Vulpix';
  public fullName: string = 'Vulpix PL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Find Wildfire
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        effect.player,
        this,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { min: 0, max: 2, allowCancel: true }
      );
    }

    // Brushfire
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card) => {
        if (cardList !== effect.opponent.active && pokemonHasCardType(card, G)) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    // Inflame
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      const hasFireEnergy = player.hand.cards.some(c => c.name === 'Fire Energy');
      if (!hasFireEnergy) {
        effect.damage = 0;
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { allowCancel: false, min: 1, max: 1 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          effect.damage = 0;
          return state;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
        return state;
      });
    }

    return state;
  }
}
