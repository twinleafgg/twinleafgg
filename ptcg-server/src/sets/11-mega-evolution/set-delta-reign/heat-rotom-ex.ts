import {
  CardTag,
  CardType,
  EnergyCard,
  EnergyType,
  PokemonCard,
  Stage,
  State,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class HeatRotomex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [R];
  public hp: number = 190;
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    name: 'Rewarm',
    cost: [C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'This attack does 30 damage for each Basic [R] Energy card in your discard pile. Then, shuffle those cards into your deck.',
  },
  {
    name: 'Strong Flare',
    cost: [R, R, C],
    damage: 170,
    text: 'Discard 2 Energy from this Pokémon.',
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '23';
  public name: string = 'Heat Rotom ex';
  public fullName: string = 'Heat Rotom ex M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reheat
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const fireBasicEnergy = player.discard.cards.filter(
        (c) =>
          c instanceof EnergyCard &&
          c.energyType === EnergyType.BASIC &&
          c.provides.includes(CardType.FIRE),
      );

      effect.damage = 30 * fireBasicEnergy.length;

      if (fireBasicEnergy.length > 0) {
        MOVE_CARDS(store, state, player.discard, player.deck, {
          cards: fireBasicEnergy,
          sourceCard: this,
          sourceEffect: effect,
        });
        SHUFFLE_DECK(store, state, player);
      }
    }

    // Strong Flare
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 2);
    }

    return state;
  }
}
