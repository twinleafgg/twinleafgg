import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { CardTarget, EnergyCard, GameError, GameMessage, PlayerType, PowerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, ATTACH_ENERGY_PROMPT, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Floatzel extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Buizel';
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [];

  public powers = [{
    name: 'Water Acceleration',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may attach a Water Energy card from your hand to Floatzel. This power can\'t be used if Floatzel is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Waterfall',
    cost: [W, W, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Floatzel';
  public fullName: string = 'Floatzel UL';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Water Acceleration
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const hasWater = player.hand.cards.some(c =>
        c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Water Energy'
      );
      if (!hasWater) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (!list.cards.includes(this)) {
          blockedTo.push(target);
        }
      });

      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.HAND,
        [SlotType.ACTIVE, SlotType.BENCH],
        { energyType: EnergyType.BASIC, name: 'Water Energy' },
        { min: 1, max: 1, allowCancel: false, blockedTo }
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
