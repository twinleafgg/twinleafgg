import {
  CardTag,
  CardType,
  EnergyType,
  Stage,
  SuperType,
} from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CardList, PokemonCard } from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MegaAbomasnowEx extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Snover';
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public hp: number = 350;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M }];
  public retreat = [C, C, C, C];

  public attacks = [
    {
      name: 'Avalanche Hammer',
      cost: [W, W],
      damage: 100,
      damageCalculation: 'x',
      text: 'Discard the top 6 cards of your deck. This attack does 100 damage for each Basic [W] Energy card you discarded in this way.',
    },
    {
      name: 'Frost Barrier',
      cost: [W, W, W],
      damage: 200,
      text: "During your opponent's next turn, this Pokémon takes 30 less damage from attacks (after applying Weakness and Resistance).",
    },
  ];

  public set: string = 'MEG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '36';
  public name: string = 'Mega Abomasnow ex';
  public fullName: string = 'Mega Abomasnow ex M1S';
  public regulationMark: string = 'I';
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const deckTop = new CardList();

      // Move top 5 cards from deckTop
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 6, sourceCard: this });

      // Filter for Energy cards
      const energyCount = deckTop.cards.filter(
        (c) =>
          c.superType === SuperType.ENERGY &&
          c.energyType === EnergyType.BASIC &&
          c.name === 'Water Energy',
      );

      // Move all cards to discard
      MOVE_CARDS(store, state, deckTop, player.discard, { count: deckTop.cards.length, sourceCard: this });
      effect.damage = energyCount.length * 100;
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.player.active.damageReductionNextTurn = 30;
    }

    return state;
  }
}
