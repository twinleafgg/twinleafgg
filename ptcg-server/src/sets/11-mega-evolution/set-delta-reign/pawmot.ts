import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, GameError, GameMessage, SuperType, EnergyCard, EnergyType, SlotType } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON, REMOVE_MARKER_AT_END_OF_TURN } from "../../../game/store/prefabs/prefabs";

export class Pawmot extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Pawmo';
  public cardType: CardType[] = [L];
  public hp: number = 150;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Generator\'s Touch',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may use this Ability. Attach a Basic [L] Energy card from your discard pile to 1 of your Pokémon.'
  }];

  public attacks = [{
    name: 'Electric Punch',
    cost: [L, C],
    damage: 100,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '5';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Pawmot';
  public fullName: string = 'Pawmot MEE';

  public readonly POWER_PLANT_TOUCH_MARKER = 'PAWMOT_MEE_POWER_PLANT_TOUCH_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Power Plant Touch
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      const hasEnergyInDiscard = player.discard.cards.some(c =>
        c.superType === SuperType.ENERGY
        && (c as EnergyCard).energyType === EnergyType.BASIC
        && (c as EnergyCard).provides.includes(CardType.LIGHTNING)
      );
      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.POWER_PLANT_TOUCH_MARKER, this);
      ABILITY_USED(player, this);

      return ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON(
        store,
        state,
        player,
        1,
        CardType.LIGHTNING,
        {
          destinationSlots: [SlotType.ACTIVE, SlotType.BENCH],
          energyFilter: { energyType: EnergyType.BASIC },
          min: 1,
          allowCancel: true,
        }
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.POWER_PLANT_TOUCH_MARKER, this);

    return state;
  }
}
