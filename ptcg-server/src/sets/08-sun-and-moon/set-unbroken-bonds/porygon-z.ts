import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType, SpecialCondition } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, StateUtils, GameError, GameMessage, EnergyCard, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyPrompt } from '../../../game/store/prompts/attach-energy-prompt';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class PorygonZ extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Porygon2';
  public cardType: CardType[] = [C];
  public hp: number = 130;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers = [{
    name: 'Crazy Code',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'As often as you like during your turn (before your attack), you may attach a Special Energy card from your hand to 1 of your Pokémon.'
  }];

  public attacks = [
    {
      name: 'Tantrum',
      cost: [C, C, C],
      damage: 120,
      text: 'This Pokémon is now Confused.'
    }
  ];

  public set: string = 'UNB';
  public setNumber: string = '157';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Porygon-Z';
  public fullName: string = 'Porygon-Z UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const specialConditionEffect = new AddSpecialConditionsEffect(effect, [SpecialCondition.CONFUSED]);
      specialConditionEffect.target = effect.player.active;
      store.reduceEffect(state, specialConditionEffect);
      return state;
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInHand = player.hand.cards.some(c => {
        return c instanceof EnergyCard
          && c.energyType === EnergyType.SPECIAL;
      });
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.hand,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
        { allowCancel: true }
      ), transfers => {
        transfers = transfers || [];
        // First, move all cards to their targets
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
        }

        // Then, trigger AttachEnergyEffect for each attachment
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          const energyCard = transfer.card as EnergyCard;
          const attachEnergyEffect = new AttachEnergyEffect(player, energyCard, target);
          state = store.reduceEffect(state, attachEnergyEffect);
        }

      });
    }

    return state;
  }

}
