import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, CardTag } from '../../../game/store/card/card-types';
import {
  CardList,
  EnergyCard,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCardList,
  PowerType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { KyogreAndGroudonLegendBottom } from './kyogre-and-groudon-legend-bottom';
import { MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class KyogreAndGroudonLegendTop extends PokemonCard {
  public stage: Stage = Stage.LEGEND;
  protected _tags = [CardTag.LEGEND, CardTag.DUAL_LEGEND];
  public cardType: CardType[] = [W, F];
  public hp: number = 150;
  public weakness = [{ type: G }, { type: L }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Legend Assembly',
      text: 'Put this card from your hand onto your Bench only with the other half of Kyogre & Groudon LEGEND.',
      exemptFromAbilityLock: true,
      useFromHand: true,
      powerType: PowerType.LEGEND_ASSEMBLY,
    },
  ];

  public attacks = [
    {
      name: 'Mega Tidal Wave',
      cost: [W, W, C, C],
      damage: 0,
      text: "Discard the top 5 cards from your opponent's deck. This attack does 30 damage times the number of Energy cards you discarded to each of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Massive Eruption',
      cost: [F, F, C, C],
      damage: 100,
      damageCalculation: 'x',
      text: 'Discard the top 5 cards from your deck. This attack does 100 damage times the number of Energy cards you discarded.',
    },
  ];

  public set: string = 'UD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '87';
  public name: string = 'Kyogre & Groudon LEGEND';
  public fullName: string = 'Kyogre & Groudon LEGEND (Top) UD';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // assemblin the avengers
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let topPiece = false;
      let bottomPiece = false;
      let topCard: KyogreAndGroudonLegendTop | null = null;
      let bottomCard: KyogreAndGroudonLegendBottom | null = null;

      player.hand.cards.forEach((card) => {
        if (card instanceof KyogreAndGroudonLegendTop && !topPiece) {
          topPiece = true;
          topCard = card;
        }
        if (card instanceof KyogreAndGroudonLegendBottom && !bottomPiece) {
          bottomPiece = true;
          bottomCard = card;
        }
      });

      if (topPiece && bottomPiece && topCard && bottomCard) {
        if (slots.length > 0) {
          MOVE_CARDS(store, state, player.hand, slots[0], { cards: [bottomCard], sourceCard: this });
          MOVE_CARDS(store, state, player.hand, slots[0], { cards: [topCard], sourceCard: this });
          slots[0].pokemonPlayedTurn = state.turn;
        }
      } else {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
    }

    // Mega Tidal Wave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const deckTop = new CardList();

      // Move top 5 cards from deckTop
      MOVE_CARDS(store, state, opponent.deck, deckTop, { count: 5, sourceCard: this });

      // Filter for Energy cards
      const energyCount = deckTop.cards.filter((c) => c instanceof EnergyCard);
      const attackDamage = energyCount.length * 30;

      // Move all cards to discard
      MOVE_CARDS(store, state, deckTop, opponent.discard, {
        count: deckTop.cards.length,
        sourceCard: this,
        sourceEffect: this.attacks[0],
      });

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        if (cardList !== opponent.active) {
          const damageEffect = new PutDamageEffect(effect, attackDamage);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    // Massive Eruption
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const deckTop = new CardList();

      // Move top 5 cards from deckTop
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 5, sourceCard: this });

      // Filter for Energy cards
      const energyCount = deckTop.cards.filter((c) => c instanceof EnergyCard);

      // Move all cards to discard
      MOVE_CARDS(store, state, deckTop, player.discard, { count: deckTop.cards.length, sourceCard: this });

      effect.damage = energyCount.length * 100;
    }

    return state;
  }
}
