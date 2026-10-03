import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, CardList, ShowCardsPrompt, GameMessage, EnergyCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {DISCARD_ALL_ENERGY_FROM_POKEMON, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Infernape extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public cardType: CardType[] = [R];
  public evolvesFrom = 'Monferno';
  public hp: number = 150;
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    name: 'Infernal Vortex',
    cost: [R],
    damage: 80,
    damageCalculation: 'x',
    text: 'Reveal the top 5 cards of your deck. This attack does 80 damage for each Energy card you find there. Then, discard those Energy cards and shuffle the other cards back into your deck.'
  },
  {
    name: 'Burning Kick',
    cost: [R, C],
    damage: 160,
    text: 'Discard all Energy from this Pokémon.'
  }];

  public set = 'BRS';
  public regulationMark = 'F';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '26';
  public name = 'Infernape';
  public fullName = 'Infernape BRS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 5, sourceCard: this });

      // Filter for item cards
      const energyCards = deckTop.cards.filter(c =>
        c instanceof EnergyCard
      );

      if (energyCards.length > 0) {
        state = store.prompt(state, new ShowCardsPrompt(
          opponent.id,
          GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
          energyCards), () => state);
      }

      if (energyCards.length > 0) {
        state = store.prompt(state, new ShowCardsPrompt(
          player.id,
          GameMessage.CARDS_SHOWED_BY_EFFECT,
          energyCards), () => state);
      }

      // Move energy cards to discard
      MOVE_CARDS(store, state, deckTop, player.discard, { cards: energyCards, sourceCard: this });

      // Move all cards to discard
      MOVE_CARDS(store, state, deckTop, player.deck, { count: deckTop.cards.length, sourceCard: this });

      effect.damage = 80 * energyCards.length;

      SHUFFLE_DECK(store, state, player);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, this);
    }

    return state;
  }

}