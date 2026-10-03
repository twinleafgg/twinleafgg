import { AttachEnergyPrompt, EnergyCard, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Heatmor extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 110;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Flame Cloak',
    cost: [R],
    damage: 20,
    text: 'Attach a [R] Energy card from your discard pile to this Pokémon.'
  },
  {
    name: 'Exciting Flame',
    cost: [R, R, C],
    damage: 90,
    text: 'If this Pokémon has at least 3 extra Energy attached (in addition to this attack\'s cost), this attack also does 180 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'FST';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';
  public regulationMark = 'E';
  public name: string = 'Heatmor';
  public fullName: string = 'Heatmor FST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flame Cloak
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some(c => {
        return c instanceof EnergyCard
          && c.energyType === EnergyType.BASIC
          && c.provides.includes(CardType.FIRE);
      });

      if (!hasEnergyInDiscard) {
        return state;
      }

      state = store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_ACTIVE,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { allowCancel: false, min: 0, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        // cancelled by user
        if (transfers.length === 0) {
          return;
        }

        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });

      return state;
    }

    // Exciting Flame
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const checkEnergy = new CheckProvidedEnergyEffect(effect.player);
      store.reduceEffect(state, checkEnergy);

      const extraEffectCost = [
        ...this.attacks[1].cost,
        ...Array(3).fill(CardType.COLORLESS),
      ];

      if (StateUtils.checkEnoughEnergy(checkEnergy.energyMap, extraEffectCost)) {
        return THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(180, effect, store, state);
      }
    }
    return state;
  }
}
