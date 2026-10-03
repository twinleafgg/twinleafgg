import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  StoreLike,
  State,
  StateUtils,
  CardTag,
  CardType,
  Stage,
  EnergyCard,
  SpecialCondition,
  CardList,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {
  AddSpecialConditionsEffect,
  PutDamageEffect,
} from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Magcargoex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex, CardTag.POKEMON_TERA];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Slugma';
  public cardType: CardType[] = [R];
  public hp: number = 270;
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Hot Magma',
      cost: [R, C],
      damage: 70,
      text: "Your opponent's Active Pokémon is now Burned.",
    },
    {
      name: 'Ground Burn',
      cost: [R, R, C],
      damage: 140,
      damageCalculation: '+',
      text: "Discard the top card of each player's deck. This attack does 140 more damage for each Energy card discarded in this way.",
    },
  ];

  public set: string = 'TWM';
  public regulationMark = 'H';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '29';
  public name: string = 'Magcargo ex';
  public fullName: string = 'Magcargo ex TWM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hot Magma
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.BURNED]);
      return store.reduceEffect(state, specialCondition);
    }

    // Ground Burn
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const playerTopDeck = new CardList();
      const opponentTopDeck = new CardList();
      let damageScaling = 0;

      MOVE_CARDS(store, state, player.deck, playerTopDeck, { count: 1, sourceCard: this });
      MOVE_CARDS(store, state, opponent.deck, opponentTopDeck, { count: 1, sourceCard: this });

      if (playerTopDeck.cards[0] instanceof EnergyCard) {
        damageScaling++;
      }
      if (opponentTopDeck.cards[0] instanceof EnergyCard) {
        damageScaling++;
      }

      effect.damage += 140 * damageScaling;

      MOVE_CARDS(store, state, playerTopDeck, player.discard, { sourceCard: this });
      MOVE_CARDS(store, state, opponentTopDeck, opponent.discard, { sourceCard: this });
    }

    if (
      effect instanceof PutDamageEffect &&
      effect.target.cards.includes(this) &&
      effect.target.getPokemonCard() === this
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Target is not Active
      if (effect.target === player.active || effect.target === opponent.active) {
        return state;
      }

      effect.preventDefault = true;
    }
    return state;
  }
}
