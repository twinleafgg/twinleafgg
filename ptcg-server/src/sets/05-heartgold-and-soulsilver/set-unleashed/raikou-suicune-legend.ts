import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PokemonCardList, PowerType, State, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { getDualLegendHalvesInHand } from '../../../game/store/dual-legend-utils';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class RaikouSuicuneLEGEND extends PokemonCard {
  public stage: Stage = Stage.LEGEND;
  protected _tags = [CardTag.LEGEND, CardTag.DUAL_LEGEND];
  public hp: number = 160;
  public cardType: CardType[] = [L, W];
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Legend Assembly',
    text: 'Put this card from your hand onto your Bench only with the other half of Raikou & Suicune LEGEND.',
    exemptFromAbilityLock: true,
    useFromHand: true,
    powerType: PowerType.LEGEND_ASSEMBLY,
  }];

  public attacks = [{
    name: 'Thunderbolt Spear',
    cost: [L, L, C],
    damage: 150,
    text: 'Raikou & Suicune LEGEND does 50 damage to itself and don\'t apply Weakness to this damage.'
  },
  {
    name: 'Aurora Gain',
    cost: [W, C, C],
    damage: 50,
    text: 'Remove 5 damage counters from Raikou & Suicune LEGEND.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '92';
  public name: string = 'Raikou & Suicune LEGEND';
  public fullName: string = 'Raikou & Suicune LEGEND UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Legend Assembly
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter(b => b.cards.length === 0);
      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const halves = getDualLegendHalvesInHand(player, this);
      if (halves.length < 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      MOVE_CARDS(store, state, player.hand, slots[0], { cards: halves, sourceCard: this });
      slots[0].pokemonPlayedTurn = state.turn;
    }

    // Thunderbolt Spear
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const selfDamage = new PutDamageEffect(effect, 50);
      selfDamage.target = effect.player.active;
      store.reduceEffect(state, selfDamage);
    }

    // Aurora Gain
    if (WAS_ATTACK_USED(effect, 1, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 50);
    }

    return state;
  }
}
