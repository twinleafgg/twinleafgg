import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PokemonCardList, PowerType, State, StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { getDualLegendHalvesInHand } from '../../../game/store/dual-legend-utils';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { IS_POKEBODY_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class HoOhLEGEND extends PokemonCard {
  public stage: Stage = Stage.LEGEND;
  protected _tags = [CardTag.LEGEND, CardTag.DUAL_LEGEND];
  public hp: number = 140;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Legend Assembly',
    text: 'Put this card from your hand onto your Bench only with the other half of Ho-Oh LEGEND.',
    exemptFromAbilityLock: true,
    useFromHand: true,
    powerType: PowerType.LEGEND_ASSEMBLY,
  },
  {
    name: 'Sacred Rainbow',
    powerType: PowerType.POKEBODY,
    text: 'All Energy attached to Ho-Oh LEGEND are Fire Energy instead of their usual type.'
  }];

  public attacks = [{
    name: 'Bright Wing',
    cost: [R, R, R, R],
    damage: 100,
    text: 'Discard an Energy attached to Ho-Oh LEGEND.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '111';
  public name: string = 'Ho-Oh LEGEND';
  public fullName: string = 'Ho-Oh LEGEND HS';

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

    // Sacred Rainbow
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.getPokemonCard() === this) {
      const player = effect.player;
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      effect.energyMap.forEach(em => {
        if (em.provides.length > 0) {
          em.provides = em.provides.map(() => CardType.FIRE);
        }
      });
    }

    // Bright Wing
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
    }

    return state;
  }
}
