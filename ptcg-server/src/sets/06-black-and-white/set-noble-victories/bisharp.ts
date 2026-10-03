import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, EnergyCard, AttachEnergyPrompt, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Bisharp extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Pawniard';
  public cardType: CardType[] = [M];
  public hp: number = 100;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Energy Stream',
    cost: [C],
    damage: 20,
    text: 'Attach a [M] Energy card from your discard pile to this Pokémon.'
  },
  {
    name: 'Metal Scissors',
    cost: [C, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Does 20 more damage for each [M] Energy attached to this Pokémon.'
  }];

  public set: string = 'NVI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '82';
  public name: string = 'Bisharp';
  public fullName: string = 'Bisharp NVI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasMetalEnergyInDiscard = player.discard.cards.some(c => {
        return c.superType === SuperType.ENERGY
          && c.energyType === EnergyType.BASIC
          && (c as EnergyCard).provides && (c as EnergyCard).provides.includes(CardType.METAL);
      });

      if (!hasMetalEnergyInDiscard) {
        return state;
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_ACTIVE,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Metal Energy' },
        { allowCancel: false, min: 0, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        if (transfers.length > 0) {
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let metalEnergyCount = 0;

      player.active.cards.forEach(card => {
        if (card.superType === SuperType.ENERGY && (card as EnergyCard).provides && (card as EnergyCard).provides.includes(CardType.METAL)) {
          metalEnergyCount++;
        }
      });

      (effect as AttackEffect).damage += 20 * metalEnergyCount;
    }

    return state;
  }
}
